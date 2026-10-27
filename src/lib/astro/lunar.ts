/**
 * Lunar position & phase.
 *
 * The moon's ecliptic longitude, latitude and distance come from the ELP-2000/82
 * theory as abridged by Meeus, "Astronomical Algorithms" (2nd ed.), ch. 47 —
 * his two 60-row tables of periodic terms, good to about 10″ in longitude and
 * 4″ in latitude. The distance gives the moon's parallax, which shifts when it
 * rises and sets by a few minutes.
 */

import { daysSinceJ2000, gmstDeg, wrapLon, type GeoPoint } from './solar';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/** Earth's equatorial radius, km (the value Meeus uses with these series). */
const EARTH_RADIUS_KM = 6378.14;

function normalizeDeg(deg: number): number {
	return ((deg % 360) + 360) % 360;
}

/**
 * ΔT = TT − UT, in seconds: how far Terrestrial Time, which the lunar series
 * runs on, is ahead of the clock. Espenak & Meeus' polynomials for 1986–2150
 * (NASA, "Five Millennium Canon of Solar Eclipses"), and their long-term
 * parabola for other years.
 */
export function deltaT(date: Date): number {
	const y = 1970 + date.getTime() / (365.2425 * 86_400_000);
	if (y >= 1986 && y < 2005) {
		const t = y - 2000;
		return (
			63.86 +
			0.3345 * t -
			0.060374 * t ** 2 +
			0.0017275 * t ** 3 +
			0.000651814 * t ** 4 +
			0.00002373599 * t ** 5
		);
	}
	if (y >= 2005 && y < 2050) {
		const t = y - 2000;
		return 62.92 + 0.32217 * t + 0.005589 * t ** 2;
	}
	const u = (y - 1820) / 100;
	if (y >= 2050 && y < 2150) return -20 + 32 * u ** 2 - 0.5628 * (2150 - y);
	return -20 + 32 * u ** 2;
}

/** Julian centuries of Terrestrial Time since J2000. */
function centuriesTT(date: Date): number {
	return (daysSinceJ2000(date) + deltaT(date) / 86_400) / 36_525;
}

interface MoonAngles {
	/** Mean elongation Moon–Sun, degrees. */
	D: number;
	/** Sun mean anomaly, degrees. */
	M: number;
	/** Moon mean anomaly, degrees. */
	Mp: number;
	/** Moon argument of latitude, degrees. */
	F: number;
	/** Moon mean longitude, degrees. */
	Lp: number;
}

/** Meeus 47.1–47.5, for `T` Julian centuries of TT since J2000. */
function moonAngles(T: number): MoonAngles {
	const T2 = T * T;
	const T3 = T2 * T;
	const T4 = T3 * T;
	return {
		Lp: normalizeDeg(218.3164477 + 481267.88123421 * T - 0.0015786 * T2 + T3 / 538841 - T4 / 65194000),
		D: normalizeDeg(297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868 - T4 / 113065000),
		M: normalizeDeg(357.5291092 + 35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000),
		Mp: normalizeDeg(134.9633964 + 477198.8675055 * T + 0.0087414 * T2 + T3 / 69699 - T4 / 14712000),
		F: normalizeDeg(93.272095 + 483202.0175233 * T - 0.0036539 * T2 - T3 / 3526000 + T4 / 863310000)
	};
}

/**
 * Meeus table 47.A: multiples of D, M, M′, F, then the sine coefficient for
 * longitude (10⁻⁶ degree) and the cosine coefficient for distance (10⁻³ km).
 */
const LONGITUDE_DISTANCE_TERMS: [d: number, m: number, mp: number, f: number, lon: number, dist: number][] = [
	[0, 0, 1, 0, 6288774, -20905355],
	[2, 0, -1, 0, 1274027, -3699111],
	[2, 0, 0, 0, 658314, -2955968],
	[0, 0, 2, 0, 213618, -569925],
	[0, 1, 0, 0, -185116, 48888],
	[0, 0, 0, 2, -114332, -3149],
	[2, 0, -2, 0, 58793, 246158],
	[2, -1, -1, 0, 57066, -152138],
	[2, 0, 1, 0, 53322, -170733],
	[2, -1, 0, 0, 45758, -204586],
	[0, 1, -1, 0, -40923, -129620],
	[1, 0, 0, 0, -34720, 108743],
	[0, 1, 1, 0, -30383, 104755],
	[2, 0, 0, -2, 15327, 10321],
	[0, 0, 1, 2, -12528, 0],
	[0, 0, 1, -2, 10980, 79661],
	[4, 0, -1, 0, 10675, -34782],
	[0, 0, 3, 0, 10034, -23210],
	[4, 0, -2, 0, 8548, -21636],
	[2, 1, -1, 0, -7888, 24208],
	[2, 1, 0, 0, -6766, 30824],
	[1, 0, -1, 0, -5163, -8379],
	[1, 1, 0, 0, 4987, -16675],
	[2, -1, 1, 0, 4036, -12831],
	[2, 0, 2, 0, 3994, -10445],
	[4, 0, 0, 0, 3861, -11650],
	[2, 0, -3, 0, 3665, 14403],
	[0, 1, -2, 0, -2689, -7003],
	[2, 0, -1, 2, -2602, 0],
	[2, -1, -2, 0, 2390, 10056],
	[1, 0, 1, 0, -2348, 6322],
	[2, -2, 0, 0, 2236, -9884],
	[0, 1, 2, 0, -2120, 5751],
	[0, 2, 0, 0, -2069, 0],
	[2, -2, -1, 0, 2048, -4950],
	[2, 0, 1, -2, -1773, 4130],
	[2, 0, 0, 2, -1595, 0],
	[4, -1, -1, 0, 1215, -3958],
	[0, 0, 2, 2, -1110, 0],
	[3, 0, -1, 0, -892, 3258],
	[2, 1, 1, 0, -810, 2616],
	[4, -1, -2, 0, 759, -1897],
	[0, 2, -1, 0, -713, -2117],
	[2, 2, -1, 0, -700, 2354],
	[2, 1, -2, 0, 691, 0],
	[2, -1, 0, -2, 596, 0],
	[4, 0, 1, 0, 549, -1423],
	[0, 0, 4, 0, 537, -1117],
	[4, -1, 0, 0, 520, -1571],
	[1, 0, -2, 0, -487, -1739],
	[2, 1, 0, -2, -399, 0],
	[0, 0, 2, -2, -381, -4421],
	[1, 1, 1, 0, 351, 0],
	[3, 0, -2, 0, -340, 0],
	[4, 0, -3, 0, 330, 0],
	[2, -1, 2, 0, 327, 0],
	[0, 2, 1, 0, -323, 1165],
	[1, 1, -1, 0, 299, 0],
	[2, 0, 3, 0, 294, 0],
	[2, 0, -1, -2, 0, 8752]
];

/** Meeus table 47.B: multiples of D, M, M′, F, then the sine coefficient for latitude (10⁻⁶ degree). */
const LATITUDE_TERMS: [d: number, m: number, mp: number, f: number, lat: number][] = [
	[0, 0, 0, 1, 5128122],
	[0, 0, 1, 1, 280602],
	[0, 0, 1, -1, 277693],
	[2, 0, 0, -1, 173237],
	[2, 0, -1, 1, 55413],
	[2, 0, -1, -1, 46271],
	[2, 0, 0, 1, 32573],
	[0, 0, 2, 1, 17198],
	[2, 0, 1, -1, 9266],
	[0, 0, 2, -1, 8822],
	[2, -1, 0, -1, 8216],
	[2, 0, -2, -1, 4324],
	[2, 0, 1, 1, 4200],
	[2, 1, 0, -1, -3359],
	[2, -1, -1, 1, 2463],
	[2, -1, 0, 1, 2211],
	[2, -1, -1, -1, 2065],
	[0, 1, -1, -1, -1870],
	[4, 0, -1, -1, 1828],
	[0, 1, 0, 1, -1794],
	[0, 0, 0, 3, -1749],
	[0, 1, -1, 1, -1565],
	[1, 0, 0, 1, -1491],
	[0, 1, 1, 1, -1475],
	[0, 1, 1, -1, -1410],
	[0, 1, 0, -1, -1344],
	[1, 0, 0, -1, -1335],
	[0, 0, 3, 1, 1107],
	[4, 0, 0, -1, 1021],
	[4, 0, -1, 1, 833],
	[0, 0, 1, -3, 777],
	[4, 0, -2, 1, 671],
	[2, 0, 0, -3, 607],
	[2, 0, 2, -1, 596],
	[2, -1, 1, -1, 491],
	[2, 0, -2, 1, -451],
	[0, 0, 3, -1, 439],
	[2, 0, 2, 1, 422],
	[2, 0, -3, -1, 421],
	[2, 1, -1, 1, -366],
	[2, 1, 0, 1, -351],
	[4, 0, 0, 1, 331],
	[2, -1, 1, 1, 315],
	[2, -2, 0, -1, 302],
	[0, 0, 1, 3, -283],
	[2, 1, 1, -1, -229],
	[1, 1, 0, -1, 223],
	[1, 1, 0, 1, 223],
	[0, 1, -2, -1, -220],
	[2, 1, -1, -1, -220],
	[1, 0, 1, 1, -185],
	[2, -1, -2, -1, 181],
	[0, 1, 2, 1, -177],
	[4, 0, -2, -1, 176],
	[4, -1, -1, -1, 166],
	[1, 0, 1, -1, -164],
	[4, 0, 1, -1, 132],
	[1, 0, -1, -1, -119],
	[4, -1, 0, -1, 115],
	[2, -2, 0, 1, 107]
];

export interface MoonPosition {
	/** Geocentric ecliptic longitude, mean equinox of date, degrees. */
	eclipticLongitude: number;
	/** Geocentric ecliptic latitude, degrees. */
	eclipticLatitude: number;
	/** Right ascension, mean equator and equinox of date, degrees. */
	rightAscension: number;
	/** Declination, degrees. */
	declination: number;
	/** Distance between the centres of Earth and moon, km. */
	distance: number;
	/** Equatorial horizontal parallax, degrees. */
	parallax: number;
}

/** The moon's geocentric position and distance at `date` (Meeus ch. 47). */
export function moonPosition(date: Date): MoonPosition {
	const T = centuriesTT(date);
	const { Lp, D, M, Mp, F } = moonAngles(T);

	// Terms in the sun's anomaly shrink with the slowly falling eccentricity of Earth's orbit.
	const E = 1 - 0.002516 * T - 0.0000074 * T * T;
	const ecc = (m: number) => (m === 0 ? 1 : Math.abs(m) === 1 ? E : E * E);

	const arg = (d: number, m: number, mp: number, f: number) => (d * D + m * M + mp * Mp + f * F) * RAD;

	// Meeus' sums Σl, Σr and Σb: longitude and latitude in 10⁻⁶ degree, distance in 10⁻³ km.
	let sl = 0;
	let sr = 0;
	let sb = 0;
	for (const [d, m, mp, f, lon, dist] of LONGITUDE_DISTANCE_TERMS) {
		sl += lon * ecc(m) * Math.sin(arg(d, m, mp, f));
		sr += dist * ecc(m) * Math.cos(arg(d, m, mp, f));
	}
	for (const [d, m, mp, f, lat] of LATITUDE_TERMS) {
		sb += lat * ecc(m) * Math.sin(arg(d, m, mp, f));
	}

	// Meeus' additive terms: A1 for Venus, A2 for Jupiter, A3, and the L′ terms for Earth's flattening.
	const A1 = (119.75 + 131.849 * T) * RAD;
	const A2 = (53.09 + 479264.29 * T) * RAD;
	const A3 = (313.45 + 481266.484 * T) * RAD;
	sl += 3958 * Math.sin(A1) + 1962 * Math.sin((Lp - F) * RAD) + 318 * Math.sin(A2);
	sb +=
		-2235 * Math.sin(Lp * RAD) +
		382 * Math.sin(A3) +
		175 * Math.sin(A1 - F * RAD) +
		175 * Math.sin(A1 + F * RAD) +
		127 * Math.sin((Lp - Mp) * RAD) -
		115 * Math.sin((Lp + Mp) * RAD);

	const lon = normalizeDeg(Lp + sl / 1e6);
	const lat = sb / 1e6;
	const distance = 385_000.56 + sr / 1000;

	// Mean obliquity of the ecliptic (Meeus 22.2).
	const eps = (23.4392911 - 0.0130042 * T - 1.64e-7 * T * T + 5.036e-7 * T * T * T) * RAD;
	const lonR = lon * RAD;
	const latR = lat * RAD;

	// Ecliptic -> equatorial.
	const ra = Math.atan2(
		Math.sin(lonR) * Math.cos(eps) - Math.tan(latR) * Math.sin(eps),
		Math.cos(lonR)
	);
	const dec = Math.asin(
		Math.sin(latR) * Math.cos(eps) + Math.cos(latR) * Math.sin(eps) * Math.sin(lonR)
	);

	return {
		eclipticLongitude: lon,
		eclipticLatitude: lat,
		rightAscension: normalizeDeg(ra * DEG),
		declination: dec * DEG,
		distance,
		parallax: Math.asin(EARTH_RADIUS_KM / distance) * DEG
	};
}

/** Geographic point directly beneath the moon. */
export function sublunarPoint(date: Date): GeoPoint {
	const { rightAscension, declination } = moonPosition(date);
	return { lat: declination, lon: wrapLon(rightAscension - gmstDeg(date)) };
}

export interface MoonPhase {
	/** Illuminated fraction of the disk, 0..1. */
	illumination: number;
	/** Phase, 0 = new, 0.5 = full, wraps at 1. */
	phase: number;
	/** Human label, e.g. "Waxing Gibbous". */
	name: string;
	/** Single-glyph emoji approximation of the phase. */
	emoji: string;
}

const PHASE_NAMES = [
	'New Moon',
	'Waxing Crescent',
	'First Quarter',
	'Waxing Gibbous',
	'Full Moon',
	'Waning Gibbous',
	'Last Quarter',
	'Waning Crescent'
] as const;

const PHASE_EMOJI = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'] as const;

/** Moon phase & illuminated fraction. */
export function moonPhase(date: Date): MoonPhase {
	const { D, M, Mp } = moonAngles(centuriesTT(date));

	// Phase angle of the moon (Sun–Moon–Earth), degrees.
	const i =
		180 -
		D -
		6.289 * Math.sin(Mp * RAD) +
		2.1 * Math.sin(M * RAD) -
		1.274 * Math.sin((2 * D - Mp) * RAD) -
		0.658 * Math.sin(2 * D * RAD) -
		0.214 * Math.sin(2 * Mp * RAD) -
		0.11 * Math.sin(D * RAD);

	const illumination = (1 + Math.cos(i * RAD)) / 2;

	// Phase fraction from mean elongation (0 = new, 0.5 = full).
	const phase = normalizeDeg(D) / 360;
	const idx = Math.round(phase * 8) % 8;

	return {
		illumination,
		phase,
		name: PHASE_NAMES[idx],
		emoji: PHASE_EMOJI[idx]
	};
}
