/**
 * Low-precision lunar position & phase.
 *
 * Uses a truncated form of the ELP-2000 series (the handful of largest terms,
 * after Meeus, "Astronomical Algorithms"). Accurate to roughly a third of a
 * degree — plenty for placing a sublunar marker and showing the moon phase.
 */

import { daysSinceJ2000, gmstDeg, wrapLon, type GeoPoint } from './solar';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

function normalizeDeg(deg: number): number {
	return ((deg % 360) + 360) % 360;
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

function moonAngles(date: Date): MoonAngles {
	// Centuries since J2000.
	const T = daysSinceJ2000(date) / 36_525;
	return {
		Lp: normalizeDeg(218.3164477 + 481267.88123421 * T),
		D: normalizeDeg(297.8501921 + 445267.1114034 * T),
		M: normalizeDeg(357.5291092 + 35999.0502909 * T),
		Mp: normalizeDeg(134.9633964 + 477198.8675055 * T),
		F: normalizeDeg(93.272095 + 483202.0175233 * T)
	};
}

/** Geographic point directly beneath the moon. */
export function sublunarPoint(date: Date): GeoPoint {
	const { Lp, D, M, Mp, F } = moonAngles(date);

	// Ecliptic longitude (degrees) — main periodic terms.
	const lon =
		Lp +
		6.288774 * Math.sin(Mp * RAD) +
		1.274027 * Math.sin((2 * D - Mp) * RAD) +
		0.658314 * Math.sin(2 * D * RAD) +
		0.213618 * Math.sin(2 * Mp * RAD) -
		0.185116 * Math.sin(M * RAD) -
		0.114332 * Math.sin(2 * F * RAD);

	// Ecliptic latitude (degrees) — main periodic terms.
	const lat =
		5.128122 * Math.sin(F * RAD) +
		0.280602 * Math.sin((Mp + F) * RAD) +
		0.277693 * Math.sin((Mp - F) * RAD) +
		0.173237 * Math.sin((2 * D - F) * RAD) +
		0.055413 * Math.sin((2 * D + F - Mp) * RAD) +
		0.046271 * Math.sin((2 * D - F - Mp) * RAD);

	// Obliquity of the ecliptic.
	const eps = (23.439 - 0.0000004 * daysSinceJ2000(date)) * RAD;
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
		lat: dec * DEG,
		lon: wrapLon(ra * DEG - gmstDeg(date))
	};
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
	const { D, M, Mp } = moonAngles(date);

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
