/**
 * Location & Reverse-Geocoding Utility for BISHOP Application
 * Inspects structured OpenStreetMap Nominatim address fields instead of fragile string splitting.
 */

export interface ReverseGeocodeResult {
  cityRegion: string;
  streetAddress: string;
  state: string;
  country: string;
  fullDisplayName: string;
  rawAddress?: Record<string, any>;
}

/**
 * Reverse geocodes latitude and longitude into structured, human-friendly city and address fields.
 */
export async function reverseGeocodeCoordinates(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`,
      {
        headers: {
          "User-Agent": "BISHOP-App/1.0",
        },
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    if (!data || !data.address) {
      if (data && data.display_name) {
        const parts = data.display_name.split(",");
        return {
          cityRegion: parts[0]?.trim() || "Location",
          streetAddress: data.display_name,
          state: "",
          country: "",
          fullDisplayName: data.display_name,
        };
      }
      return null;
    }

    const addr = data.address;

    // Structured field inspection hierarchy
    const cityName =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.suburb ||
      addr.county ||
      addr.state_district ||
      "Location";

    const stateName = addr.state || "";
    const cityRegion = stateName && !cityName.includes(stateName)
      ? `${cityName}, ${stateName}`
      : cityName;

    const streetAddress =
      addr.road ||
      addr.neighbourhood ||
      addr.suburb ||
      addr.amenity ||
      data.display_name.split(",")[0]?.trim() ||
      data.display_name;

    return {
      cityRegion,
      streetAddress,
      state: stateName,
      country: addr.country || "",
      fullDisplayName: data.display_name || "",
      rawAddress: addr,
    };
  } catch (err) {
    console.warn("[BISHOP Location] Reverse geocoding fetch error:", err);
    return null;
  }
}

/**
 * Logs comprehensive diagnostic info to console for location troubleshooting.
 */
export function logGpsDiagnostics(
  method: string,
  position: GeolocationPosition,
  reverseResult?: ReverseGeocodeResult | null
) {
  const { latitude, longitude, accuracy } = position.coords;
  const timestamp = new Date(position.timestamp).toISOString();

  console.log(`[BISHOP GPS Diagnostic - ${method}]`, {
    latitude,
    longitude,
    accuracyMeters: accuracy,
    timestamp,
    sourceMethod: method,
    reverseGeocodedAddress: reverseResult?.cityRegion || "N/A",
    fullDisplayName: reverseResult?.fullDisplayName || "N/A",
    structuredAddress: reverseResult?.rawAddress || null,
  });

  if (accuracy > 5000) {
    console.warn(
      `[BISHOP GPS Warning] Coarse browser/IP geolocation detected (±${Math.round(accuracy / 1000)} km accuracy). ` +
      `On desktop browsers without hardware GPS or active Wi-Fi positioning, navigator.geolocation defaults to regional ISP IP gateways.`
    );
  }
}
