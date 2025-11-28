// yr.no API service for automatic weather fetching
// yr.no krever identifikasjon via User-Agent header

interface YrForecast {
  temperature: number;
  humidity: number;
  wind_speed: number;
  wind_direction: string;
  precipitation: 'none' | 'light' | 'moderate' | 'heavy';
  conditions: 'clear' | 'cloudy' | 'overcast' | 'rain' | 'snow' | 'fog';
}

interface YrTimeseries {
  time: string;
  data: {
    instant: {
      details: {
        air_temperature: number;
        relative_humidity: number;
        wind_speed: number;
        wind_from_direction: number;
      };
    };
    next_1_hours?: {
      summary: {
        symbol_code: string;
      };
      details: {
        precipitation_amount: number;
      };
    };
  };
}

interface YrResponse {
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number, number];
  };
  properties: {
    timeseries: YrTimeseries[];
  };
}

// Konverter vindretning fra grader til kompass
function degreesToCompass(degrees: number): string {
  const directions = ['N', 'NØ', 'Ø', 'SØ', 'S', 'SV', 'V', 'NV'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

// Konverter yr.no symbol til vårt format
function symbolToConditions(
  symbol: string
): 'clear' | 'cloudy' | 'overcast' | 'rain' | 'snow' | 'fog' {
  if (symbol.includes('clearsky')) return 'clear';
  if (symbol.includes('fair')) return 'cloudy';
  if (symbol.includes('cloudy')) return 'overcast';
  if (symbol.includes('rain') || symbol.includes('sleet')) return 'rain';
  if (symbol.includes('snow')) return 'snow';
  if (symbol.includes('fog')) return 'fog';
  return 'cloudy';
}

// Konverter nedbørsmengde til kategori
function precipitationToCategory(
  amount: number
): 'none' | 'light' | 'moderate' | 'heavy' {
  if (amount === 0) return 'none';
  if (amount < 1) return 'light';
  if (amount < 5) return 'moderate';
  return 'heavy';
}

// Hent værdata fra yr.no
export async function fetchWeatherFromYr(
  lat: number,
  lon: number
): Promise<YrForecast | null> {
  try {
    // yr.no API krever at koordinater har maks 4 desimaler
    const roundedLat = Math.round(lat * 10000) / 10000;
    const roundedLon = Math.round(lon * 10000) / 10000;

    const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${roundedLat}&lon=${roundedLon}`;

    const response = await fetch(url, {
      headers: {
        // yr.no krever identifikasjon - bruk appens navn og kontaktinfo
        'User-Agent': 'Jaktopplevelsen/1.0 (jaktopplevelsen@example.com)',
      },
    });

    if (!response.ok) {
      console.error('yr.no API error:', response.status, response.statusText);
      return null;
    }

    const data: YrResponse = await response.json();

    // Hent nærmeste tidspunkt (første i listen)
    const now = data.properties.timeseries[0];
    if (!now) return null;

    const instant = now.data.instant.details;
    const next1h = now.data.next_1_hours;

    return {
      temperature: Math.round(instant.air_temperature),
      humidity: Math.round(instant.relative_humidity),
      wind_speed: Math.round(instant.wind_speed * 10) / 10,
      wind_direction: degreesToCompass(instant.wind_from_direction),
      precipitation: next1h
        ? precipitationToCategory(next1h.details.precipitation_amount)
        : 'none',
      conditions: next1h
        ? symbolToConditions(next1h.summary.symbol_code)
        : 'cloudy',
    };
  } catch (error) {
    console.error('Feil ved henting av værdata fra yr.no:', error);
    return null;
  }
}

// Hent værdata for et spesifikt tidspunkt (historisk eller fremtidig)
export async function fetchWeatherForTime(
  lat: number,
  lon: number,
  timestamp: Date
): Promise<YrForecast | null> {
  try {
    const roundedLat = Math.round(lat * 10000) / 10000;
    const roundedLon = Math.round(lon * 10000) / 10000;

    const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${roundedLat}&lon=${roundedLon}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Jaktopplevelsen/1.0 (jaktopplevelsen@example.com)',
      },
    });

    if (!response.ok) return null;

    const data: YrResponse = await response.json();

    // Finn nærmeste tidspunkt til ønsket timestamp
    const targetTime = timestamp.getTime();
    let closest = data.properties.timeseries[0];
    let minDiff = Math.abs(new Date(closest.time).getTime() - targetTime);

    for (const ts of data.properties.timeseries) {
      const diff = Math.abs(new Date(ts.time).getTime() - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closest = ts;
      }
    }

    if (!closest) return null;

    const instant = closest.data.instant.details;
    const next1h = closest.data.next_1_hours;

    return {
      temperature: Math.round(instant.air_temperature),
      humidity: Math.round(instant.relative_humidity),
      wind_speed: Math.round(instant.wind_speed * 10) / 10,
      wind_direction: degreesToCompass(instant.wind_from_direction),
      precipitation: next1h
        ? precipitationToCategory(next1h.details.precipitation_amount)
        : 'none',
      conditions: next1h
        ? symbolToConditions(next1h.summary.symbol_code)
        : 'cloudy',
    };
  } catch (error) {
    console.error('Feil ved henting av værdata:', error);
    return null;
  }
}

// Hent stedsnavn fra koordinater via Kartverket
export async function getLocationNameFromCoords(
  lat: number,
  lon: number
): Promise<string | null> {
  try {
    // Bruk Kartverket sitt stedsnavn-API
    const url = `https://ws.geonorge.no/stedsnavn/v1/punkt?nord=${lat}&ost=${lon}&koordsys=4258&radius=5000&filtrer=navn`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();

    if (data.navn && data.navn.length > 0) {
      // Returner første treff (nærmeste)
      return data.navn[0].skrivemåte;
    }

    return null;
  } catch (error) {
    console.error('Feil ved henting av stedsnavn:', error);
    return null;
  }
}
