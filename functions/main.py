"""
Firebase Cloud Functions for Jaktopplevelsen.
Håndterer Garmin-synkronisering og andre backend-oppgaver.
"""

from firebase_functions import https_fn, scheduler_fn
from firebase_admin import initialize_app, firestore, storage
import json
import logging
from datetime import datetime, timedelta
from typing import Optional
import gpxpy
import gpxpy.gpx

# Initialiser Firebase Admin
initialize_app()

# Logging
logger = logging.getLogger(__name__)


def parse_gpx_to_geojson(gpx_string: str) -> dict:
    """
    Konverter GPX til GeoJSON-format.

    Args:
        gpx_string: GPX XML-streng

    Returns:
        dict: GeoJSON LineString
    """
    gpx = gpxpy.parse(gpx_string)
    coordinates = []

    for track in gpx.tracks:
        for segment in track.segments:
            for point in segment.points:
                coord = [point.longitude, point.latitude]
                if point.elevation:
                    coord.append(point.elevation)
                if point.time:
                    coord.append(point.time.timestamp())
                coordinates.append(coord)

    return {"type": "LineString", "coordinates": coordinates}


def calculate_track_statistics(gpx_string: str) -> dict:
    """
    Beregn statistikk fra GPX-data.

    Args:
        gpx_string: GPX XML-streng

    Returns:
        dict: Sporstatistikk
    """
    gpx = gpxpy.parse(gpx_string)

    moving_data = gpx.get_moving_data()
    uphill, downhill = gpx.get_uphill_downhill()
    elevation_extremes = gpx.get_elevation_extremes()
    bounds = gpx.get_bounds()

    duration_seconds = moving_data.moving_time if moving_data else 0
    distance_km = (moving_data.moving_distance / 1000) if moving_data else 0

    avg_speed = (distance_km / (duration_seconds / 3600)) if duration_seconds > 0 else 0
    max_speed = (moving_data.max_speed * 3.6) if moving_data and moving_data.max_speed else 0

    return {
        "distance_km": round(distance_km, 2),
        "duration_minutes": round(duration_seconds / 60, 1),
        "avg_speed_kmh": round(avg_speed, 2),
        "max_speed_kmh": round(max_speed, 2),
        "elevation_gain_m": round(uphill, 1) if uphill else 0,
        "elevation_loss_m": round(downhill, 1) if downhill else 0,
        "min_elevation_m": round(elevation_extremes.minimum, 1) if elevation_extremes.minimum else 0,
        "max_elevation_m": round(elevation_extremes.maximum, 1) if elevation_extremes.maximum else 0,
        "bounding_box": [
            [bounds.min_latitude, bounds.min_longitude],
            [bounds.max_latitude, bounds.max_longitude],
        ] if bounds else [[0, 0], [0, 0]],
    }


@https_fn.on_call(region="europe-west1")
def parse_gpx(req: https_fn.CallableRequest) -> dict:
    """
    Parse GPX-fil og returner GeoJSON og statistikk.

    Forventer:
    - gpx_content: GPX XML-streng
    """
    if not req.auth:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.UNAUTHENTICATED,
            message="Bruker ikke pålogget"
        )

    gpx_content = req.data.get("gpx_content")
    if not gpx_content:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="GPX-innhold mangler"
        )

    try:
        geojson = parse_gpx_to_geojson(gpx_content)
        statistics = calculate_track_statistics(gpx_content)

        # Hent tidsstempler
        gpx = gpxpy.parse(gpx_content)
        time_bounds = gpx.get_time_bounds()

        return {
            "geojson": geojson,
            "statistics": statistics,
            "start_time": time_bounds.start_time.isoformat() if time_bounds.start_time else None,
            "end_time": time_bounds.end_time.isoformat() if time_bounds.end_time else None,
        }
    except Exception as e:
        logger.error(f"Feil ved parsing av GPX: {e}")
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INTERNAL,
            message=f"Kunne ikke parse GPX: {str(e)}"
        )


@https_fn.on_call(region="europe-west1")
def sync_garmin(req: https_fn.CallableRequest) -> dict:
    """
    Synkroniser data fra Garmin Connect.

    Forventer:
    - garmin_email: Garmin Connect e-post
    - garmin_password: Garmin Connect passord
    - days_back: Antall dager tilbake å synkronisere (standard: 7)
    """
    if not req.auth:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.UNAUTHENTICATED,
            message="Bruker ikke pålogget"
        )

    garmin_email = req.data.get("garmin_email")
    garmin_password = req.data.get("garmin_password")
    days_back = req.data.get("days_back", 7)

    if not garmin_email or not garmin_password:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="Garmin-legitimasjon mangler"
        )

    try:
        from garminconnect import Garmin

        # Autentiser mot Garmin
        client = Garmin(garmin_email, garmin_password)
        client.login()

        # Hent aktiviteter
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)
        activities = client.get_activities_by_date(
            start_date.isoformat(), end_date.isoformat()
        )

        processed_tracks = []

        for activity in activities[:10]:  # Begrens til 10 aktiviteter
            activity_id = activity.get("activityId")
            try:
                gpx_data = client.download_activity(
                    activity_id, dl_fmt=client.ActivityDownloadFormat.GPX
                )
                if isinstance(gpx_data, bytes):
                    gpx_data = gpx_data.decode("utf-8")

                geojson = parse_gpx_to_geojson(gpx_data)
                statistics = calculate_track_statistics(gpx_data)

                track_data = {
                    "garmin_activity_id": activity_id,
                    "name": activity.get("activityName", f"Aktivitet {activity_id}"),
                    "gpx_data": gpx_data,
                    "geojson": geojson,
                    "statistics": statistics,
                    "start_time": activity.get("startTimeLocal"),
                    "source": "garmin",
                }

                processed_tracks.append(track_data)
            except Exception as e:
                logger.warning(f"Kunne ikke hente aktivitet {activity_id}: {e}")

        return {
            "success": True,
            "tracks_count": len(processed_tracks),
            "tracks": processed_tracks,
        }

    except Exception as e:
        logger.error(f"Feil ved Garmin-synkronisering: {e}")
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INTERNAL,
            message=f"Kunne ikke synkronisere med Garmin: {str(e)}"
        )


@https_fn.on_call(region="europe-west1")
def export_hunts(req: https_fn.CallableRequest) -> dict:
    """
    Eksporter jaktturer i ulike formater.

    Forventer:
    - hunt_ids: Liste med jakttur-IDer
    - format: 'gpx', 'kml', eller 'json'
    """
    if not req.auth:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.UNAUTHENTICATED,
            message="Bruker ikke pålogget"
        )

    hunt_ids = req.data.get("hunt_ids", [])
    export_format = req.data.get("format", "json")
    user_id = req.auth.uid

    if not hunt_ids:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="Ingen jaktturer valgt"
        )

    db = firestore.client()
    export_data = []

    for hunt_id in hunt_ids:
        hunt_ref = db.collection("users").document(user_id).collection("hunts").document(hunt_id)
        hunt_doc = hunt_ref.get()

        if hunt_doc.exists:
            hunt_data = hunt_doc.to_dict()
            hunt_data["id"] = hunt_id

            # Hent spor
            tracks_ref = hunt_ref.collection("tracks")
            tracks = []
            for track_doc in tracks_ref.stream():
                track_data = track_doc.to_dict()
                track_data["id"] = track_doc.id
                tracks.append(track_data)

            hunt_data["tracks"] = tracks
            export_data.append(hunt_data)

    if export_format == "json":
        return {
            "format": "json",
            "data": export_data,
            "filename": f"jaktopplevelsen_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
        }

    elif export_format == "gpx":
        # Generer kombinert GPX
        gpx = gpxpy.gpx.GPX()
        gpx.creator = "Jaktopplevelsen"

        for hunt in export_data:
            for track in hunt.get("tracks", []):
                if "geojson" in track:
                    gpx_track = gpxpy.gpx.GPXTrack()
                    gpx_track.name = f"{hunt.get('title', 'Jakttur')} - {track.get('name', 'Spor')}"
                    gpx.tracks.append(gpx_track)

                    gpx_segment = gpxpy.gpx.GPXTrackSegment()
                    gpx_track.segments.append(gpx_segment)

                    for coord in track["geojson"].get("coordinates", []):
                        point = gpxpy.gpx.GPXTrackPoint(
                            latitude=coord[1],
                            longitude=coord[0],
                            elevation=coord[2] if len(coord) > 2 else None,
                        )
                        gpx_segment.points.append(point)

        return {
            "format": "gpx",
            "data": gpx.to_xml(),
            "filename": f"jaktopplevelsen_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.gpx",
        }

    else:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message=f"Ukjent eksportformat: {export_format}"
        )


@https_fn.on_call(region="europe-west1")
def get_statistics(req: https_fn.CallableRequest) -> dict:
    """
    Hent samlet statistikk for brukeren.
    """
    if not req.auth:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.UNAUTHENTICATED,
            message="Bruker ikke pålogget"
        )

    user_id = req.auth.uid
    db = firestore.client()

    # Hent alle jaktturer
    hunts_ref = db.collection("users").document(user_id).collection("hunts")
    hunts = list(hunts_ref.stream())

    total_hunts = len(hunts)
    total_distance = 0.0
    total_duration = 0
    total_photos = 0

    for hunt_doc in hunts:
        hunt_data = hunt_doc.to_dict()

        # Tell bilder
        photos_ref = hunts_ref.document(hunt_doc.id).collection("photos")
        total_photos += len(list(photos_ref.stream()))

        # Summer spor-statistikk
        tracks_ref = hunts_ref.document(hunt_doc.id).collection("tracks")
        for track_doc in tracks_ref.stream():
            track_data = track_doc.to_dict()
            stats = track_data.get("statistics", {})
            total_distance += stats.get("distance_km", 0)
            total_duration += stats.get("duration_minutes", 0)

    # Hent aktive hunder
    dogs_ref = db.collection("users").document(user_id).collection("dogs")
    active_dogs = len([d for d in dogs_ref.stream() if d.to_dict().get("is_active", True)])

    return {
        "total_hunts": total_hunts,
        "total_distance_km": round(total_distance, 2),
        "total_duration_hours": round(total_duration / 60, 1),
        "total_photos": total_photos,
        "active_dogs": active_dogs,
    }
