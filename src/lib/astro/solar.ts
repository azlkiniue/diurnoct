/**
 * Low-precision solar position.
 *
 * Good to a few arc-minutes for the sun — far more than enough to place the
 * day/night terminator. Based on the standard "Astronomical Almanac" low
 * precision formulae (see also NOAA solar calculator).
 */

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

export interface GeoPoint {
	/** degrees, +N */
	lat: number;
	/** degrees, +E, in [-180, 180] */
	lon: number;
}

/** Julian Day (days) for a JS Date (uses its UTC instant). */
export function julianDay(date: Date): number {
	return date.getTime() / 86_400_000 + 2_440_587.5;
}

/** Days since the J2000.0 epoch (2000-01-01T12:00:00Z). */
export function daysSinceJ2000(date: Date): number {
	return julianDay(date) - 2_451_545.0;
}

function normalizeDeg(deg: number): number {
	return ((deg % 360) + 360) % 360;
}

/** Wrap a longitude into [-180, 180]. */
export function wrapLon(lon: number): number {
	return ((((lon + 180) % 360) + 360) % 360) - 180;
}

/** Greenwich Mean Sidereal Time, in degrees. */
export function gmstDeg(date: Date): number {
	const n = daysSinceJ2000(date);
	return normalizeDeg(280.46061837 + 360.98564736629 * n);
}

export interface SunState {
	/** Geographic point on Earth where the sun is at the zenith. */
	subsolar: GeoPoint;
	/** Solar declination, degrees. */
	declination: number;
	/** Apparent ecliptic longitude of the sun, degrees. */
	eclipticLongitude: number;
}

/**
 * Compute the sun's declination, right ascension and the subsolar point
 * (the geographic coordinate directly beneath the sun).
 */
export function sunState(date: Date): SunState {
	const n = daysSinceJ2000(date);

	// Mean longitude and mean anomaly of the sun (degrees).
	const L = normalizeDeg(280.46 + 0.9856474 * n);
	const g = normalizeDeg(357.528 + 0.9856003 * n) * RAD;

	// Apparent ecliptic longitude (degrees), correcting for the equation of centre.
	const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;

	// Obliquity of the ecliptic (degrees -> radians).
	const epsilon = (23.439 - 0.0000004 * n) * RAD;

	const declination = Math.asin(Math.sin(epsilon) * Math.sin(lambda));
	const rightAscension = Math.atan2(
		Math.cos(epsilon) * Math.sin(lambda),
		Math.cos(lambda)
	);

	// Subsolar longitude: where local sidereal time equals the sun's RA.
	const lon = wrapLon(rightAscension * DEG - gmstDeg(date));
	const lat = declination * DEG;

	return {
		subsolar: { lat, lon },
		declination: lat,
		eclipticLongitude: normalizeDeg(lambda * DEG)
	};
}

/** Convenience: just the subsolar point. */
export function subsolarPoint(date: Date): GeoPoint {
	return sunState(date).subsolar;
}

/** Unit vector (x east-ish, y up=north pole, z) for a lat/lon, matching the
 *  convention used by the WebGL fragment shader. */
export function geoToVec3({ lat, lon }: GeoPoint): [number, number, number] {
	const la = lat * RAD;
	const lo = lon * RAD;
	const cosLa = Math.cos(la);
	return [cosLa * Math.cos(lo), Math.sin(la), cosLa * Math.sin(lo)];
}

/**
 * Latitude of the terminator (sun elevation = 0) for a given longitude and a
 * given solar declination — used to draw the crisp day/night boundary line.
 *
 * Derived from `sin(elev) = 0`:
 *   tan(lat) = -cos(H) / tan(decl),  with hour angle H = lon - subsolarLon.
 */
export function terminatorLatitude(
	lon: number,
	subsolarLon: number,
	declination: number
): number {
	const H = (lon - subsolarLon) * RAD;
	const tanDecl = Math.tan(declination * RAD);
	// As declination -> 0 the terminator runs pole-to-pole; atan handles the
	// resulting ±Infinity gracefully (-> ±90°).
	return Math.atan(-Math.cos(H) / tanDecl) * DEG;
}
