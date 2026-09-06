/** Kongens Lyngby on DMI, the Danish meteorological institute. */
export const DMI_LYNGBY_URL =
  "https://www.dmi.dk/lokation/show/DK/2703794/Kongens%20Lyngby/";

/** WMO weather codes, condensed to states worth knowing before leaving home. */
export function describeWeather(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code <= 48) return "Fog";
  if (code <= 57) return "Drizzle";
  if (code <= 65) return "Rain";
  if (code <= 67) return "Freezing rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  if (code <= 86) return "Snow showers";
  return "Thunderstorm";
}
