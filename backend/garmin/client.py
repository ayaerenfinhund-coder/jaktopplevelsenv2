"""
Garmin Connect API-klient for Alpha 200 integrasjon.
Henter spordata fra Garmin Connect.
"""

import os
import logging
from datetime import datetime, timedelta
from typing import Optional
import gpxpy
import gpxpy.gpx
from garminconnect import Garmin, GarminConnectConnectionError, GarminConnectAuthenticationError

logger = logging.getLogger(__name__)


class GarminAlpha200Client:
    """Klient for å hente data fra Garmin Alpha 200 via Garmin Connect."""

    def __init__(self, email: str = None, password: str = None):
        """
        Initialiser Garmin-klienten.

        Args:
            email: Garmin Connect e-post
            password: Garmin Connect passord
        """
        self.email = email or os.getenv("GARMIN_USERNAME")
        self.password = password or os.getenv("GARMIN_PASSWORD")
        self.client = None
        self._authenticated = False

    def authenticate(self) -> bool:
        """
        Autentiser mot Garmin Connect.

        Returns:
            bool: True hvis autentisering lyktes
        """
        try:
            logger.info(f"Forsøker å autentisere mot Garmin som {self.email}...")
            self.client = Garmin(self.email, self.password)
            self.client.login()
            self._authenticated = True
            logger.info(f"Suksessfullt autentisert som {self.email}")
            return True
        except GarminConnectAuthenticationError as e:
            logger.error(f"Autentiseringsfeil for {self.email}: {str(e)}")
            logger.error("Sjekk brukernavn og passord. Hvis du har 2FA aktivert, kan dette være årsaken.")
            self._authenticated = False
            return False
        except GarminConnectConnectionError as e:
            logger.error(f"Tilkoblingsfeil mot Garmin: {str(e)}")
            logger.error("Dette kan skyldes nettverksproblemer eller at Garmin blokkerer forespørselen (Cloudflare).")
            self._authenticated = False
            return False
        except Exception as e:
            logger.error(f"Uventet feil ved Garmin-autentisering: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            self._authenticated = False
            return False

    def get_devices(self) -> list:
        """
        Hent liste over registrerte enheter.

        Returns:
            list: Liste med enheter
        """
        if not self._authenticated:
            raise Exception("Ikke autentisert")

        try:
            devices = self.client.get_devices()
            logger.info(f"Fant {len(devices)} enheter")
            return devices
        except Exception as e:
            logger.error(f"Feil ved henting av enheter: {e}")
            return []

    def get_activities(
        self, start_date: datetime = None, end_date: datetime = None, limit: int = 20
    ) -> list:
        """
        Hent aktiviteter fra Garmin Connect.

        Args:
            start_date: Startdato for søk
            end_date: Sluttdato for søk
            limit: Maks antall aktiviteter

        Returns:
            list: Liste med aktiviteter
        """
        if not self._authenticated:
            raise Exception("Ikke autentisert")

        try:
            if start_date and end_date:
                activities = self.client.get_activities_by_date(
                    start_date.isoformat(), end_date.isoformat()
                )
            else:
                activities = self.client.get_activities(0, limit)

            logger.info(f"Hentet {len(activities)} aktiviteter")
            return activities
        except Exception as e:
            logger.error(f"Feil ved henting av aktiviteter: {e}")
            return []

    def get_activity_gpx(self, activity_id: int) -> Optional[str]:
        """
        Hent GPX-data for en aktivitet.

        Args:
            activity_id: ID til aktiviteten

        Returns:
            str: GPX XML-data eller None
        """
        if not self._authenticated:
            raise Exception("Ikke autentisert")

        try:
            gpx_data = self.client.download_activity(
                activity_id, dl_fmt=self.client.ActivityDownloadFormat.GPX
            )
            logger.info(f"Hentet GPX for aktivitet {activity_id}")
            return gpx_data.decode("utf-8") if isinstance(gpx_data, bytes) else gpx_data
        except Exception as e:
            logger.error(f"Feil ved henting av GPX for {activity_id}: {e}")
            return None

    def parse_gpx_to_geojson(self, gpx_string: str) -> dict:
        """
        Konverter GPX til GeoJSON-format.

        Args:
            gpx_string: GPX XML-streng

        Returns:
            dict: GeoJSON LineString
        """
        try:
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
        except Exception as e:
            logger.error(f"Feil ved parsing av GPX: {e}")
            raise

    def calculate_track_statistics(self, gpx_string: str) -> dict:
        """
        Beregn statistikk fra GPX-data.

        Args:
            gpx_string: GPX XML-streng

        Returns:
            dict: Sporstatistikk
        """
        try:
            gpx = gpxpy.parse(gpx_string)

            # Grunnleggende beregninger
            moving_data = gpx.get_moving_data()
            uphill, downhill = gpx.get_uphill_downhill()
            elevation_extremes = gpx.get_elevation_extremes()
            time_bounds = gpx.get_time_bounds()
            bounds = gpx.get_bounds()

            # Beregn gjennomsnittshastighet
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
        except Exception as e:
            logger.error(f"Feil ved beregning av statistikk: {e}")
            return {
                "distance_km": 0,
                "duration_minutes": 0,
                "avg_speed_kmh": 0,
                "max_speed_kmh": 0,
                "elevation_gain_m": 0,
                "elevation_loss_m": 0,
                "min_elevation_m": 0,
                "max_elevation_m": 0,
                "bounding_box": [[0, 0], [0, 0]],
            }

    def sync_activities(
        self, days_back: int = 7, dog_collar_mapping: dict = None
    ) -> list:
        """
        Synkroniser aktiviteter fra de siste dagene.

        Args:
            days_back: Antall dager tilbake å synkronisere
            dog_collar_mapping: Mapping fra collar ID til hund

        Returns:
            list: Liste med prosesserte spor
        """
        if not self._authenticated:
            if not self.authenticate():
                raise Exception("Kunne ikke autentisere")

        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)

        activities = self.get_activities(start_date, end_date)
        processed_tracks = []

        for activity in activities:
            activity_id = activity.get("activityId")
            gpx_data = self.get_activity_gpx(activity_id)

            if gpx_data:
                geojson = self.parse_gpx_to_geojson(gpx_data)
                statistics = self.calculate_track_statistics(gpx_data)

                track_data = {
                    "garmin_activity_id": activity_id,
                    "name": activity.get("activityName", f"Aktivitet {activity_id}"),
                    "gpx_data": gpx_data,
                    "geojson": geojson,
                    "statistics": statistics,
                    "start_time": activity.get("startTimeLocal"),
                    "end_time": None,  # Beregnes fra GPX
                    "source": "garmin",
                }

                # Sett sluttid fra statistikk
                if statistics["duration_minutes"] > 0:
                    start = datetime.fromisoformat(activity.get("startTimeLocal"))
                    track_data["end_time"] = (
                        start + timedelta(minutes=statistics["duration_minutes"])
                    ).isoformat()

                processed_tracks.append(track_data)

        logger.info(f"Synkroniserte {len(processed_tracks)} spor")
        return processed_tracks


def create_sample_gpx() -> str:
    """
    Opprett et eksempel-GPX-spor for testing.

    Returns:
        str: GPX XML-streng
    """
    gpx = gpxpy.gpx.GPX()

    # Opprett spor
    gpx_track = gpxpy.gpx.GPXTrack()
    gpx.tracks.append(gpx_track)

    # Opprett segment
    gpx_segment = gpxpy.gpx.GPXTrackSegment()
    gpx_track.segments.append(gpx_segment)

    # Legg til punkter (simulert jakttur i Nordmarka)
    base_lat = 60.0
    base_lon = 10.7
    base_time = datetime.now() - timedelta(hours=3)

    for i in range(100):
        point = gpxpy.gpx.GPXTrackPoint(
            latitude=base_lat + (i * 0.001) + (0.0002 * (i % 10)),
            longitude=base_lon + (i * 0.0008),
            elevation=200 + (i * 2) - (i * i * 0.01),
            time=base_time + timedelta(minutes=i * 2),
        )
        gpx_segment.points.append(point)

    return gpx.to_xml()
