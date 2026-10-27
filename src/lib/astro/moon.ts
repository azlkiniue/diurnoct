/**
 * The Moon view: where on Earth the moon is rising, highest and setting.
 *
 * Moonrise and moonset are the moon's centre at geocentric altitude
 * h₀ = 0.7275·π − 0°34′ (Meeus, "Astronomical Algorithms", ch. 15), π being
 * its horizontal parallax at that instant. That one number accounts for the
 * parallax, the 34′ of refraction and the moon's semi-diameter (0.2725·π), so
 * no topocentric conversion is needed; it's about +0.125°. Transit is the moon
 * crossing the meridian, counted only where it's above that horizon as it does.
 *
 * The moon's altitude at a place depends only on the place's angular distance
 * from the point under the moon, so at an instant:
 *   - the rise and set lines are the circle of places 90° − h₀ from it: the
 *     half to its west is rising (the moon is still east of their meridian),
 *     the half to its east setting;
 *   - the transit line is its meridian, as far as the moon stands above h₀.
 *
 * Positions come from ./lunar (Meeus ch. 47). See docs/moon.md.
 */

import { moonPosition } from './lunar';
import { gmstDeg, wrapLon, type GeoPoint } from './solar';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

export type MoonEventKind = 'moonrise' | 'transit' | 'moonset';

/** In the order a place sees them. */
export const MOON_EVENT_KINDS: MoonEventKind[] = ['moonrise', 'transit', 'moonset'];

/** The moon's geocentric altitude at rise and set, degrees, for a horizontal parallax in degrees. */
function riseAltitude(parallax: number): number {
	return 0.7275 * parallax - 34 / 60;
}

/** The point under the moon, and the radius of the circle where it's rising or setting, degrees. */
interface MoonCircle {
	lat: number;
	lon: number;
	radius: number;
}

function moonCircle(date: Date): MoonCircle {
	const pos = moonPosition(date);
	return {
		lat: pos.declination,
		lon: wrapLon(pos.rightAscension - gmstDeg(date)),
		radius: 90 - riseAltitude(pos.parallax)
	};
}

// ---- the map: where each event is happening right now ---------------------------------

/**
 * South-to-north points. Longitudes are continuous rather than wrapped, so a
 * line may run past ±180° — draw it shifted by ±360° as well.
 */
export type MoonLine = GeoPoint[];

export type MoonLines = Record<MoonEventKind, MoonLine[]>;

/** Base step along the circle, and the finest refinement, in degrees of bearing. */
const STEP = 1;
const MIN_STEP = STEP / 256;
/** Refine until neighbouring points are this close in longitude. */
const MAX_LON_STEP = 1.5;

/**
 * Where the moon is rising, crossing the meridian and setting at instant
 * `date`. Each line is unbroken; the rise and set lines stop where the moon
 * stays up or stays down, meeting at both ends.
 */
export function moonLines(date: Date): MoonLines {
	const c = moonCircle(date);
	return {
		moonrise: [circleHalf(c, -1)],
		transit: transitLine(c),
		moonset: [circleHalf(c, 1)]
	};
}

/**
 * The circle's west (`side` −1) or east (+1) half, from its southernmost point
 * to its northernmost — both on the meridian under the moon, or the one
 * opposite where the circle passes beyond a pole.
 */
function circleHalf(c: MoonCircle, side: -1 | 1): MoonLine {
	const sinLat = Math.sin(c.lat * RAD);
	const cosLat = Math.cos(c.lat * RAD);
	const sinR = Math.sin(c.radius * RAD);
	const cosR = Math.cos(c.radius * RAD);
	// The point `u`° round from the south, at bearing 180° ∓ u from the moon's
	// point; signed zeros keep the ends on the right side of ±180°.
	const at = (u: number): GeoPoint => {
		const sinB = side * Math.sin(u * RAD);
		const cosB = -Math.cos(u * RAD);
		const sinP = Math.max(-1, Math.min(1, sinLat * cosR + cosLat * sinR * cosB));
		const dLon = Math.atan2(sinB * sinR * cosLat, cosR - sinLat * sinP);
		return { lat: Math.asin(sinP) * DEG, lon: c.lon + dLon * DEG };
	};

	const out: GeoPoint[] = [];
	// Pushes the points strictly between u0 and u1, wherever the line turns steep.
	const refine = (u0: number, p0: GeoPoint, u1: number, p1: GeoPoint) => {
		if (Math.abs(p1.lon - p0.lon) <= MAX_LON_STEP || u1 - u0 <= MIN_STEP) return;
		const um = (u0 + u1) / 2;
		const pm = at(um);
		refine(u0, p0, um, pm);
		out.push(pm);
		refine(um, pm, u1, p1);
	};
	let prev = at(0);
	out.push(prev);
	for (let u = STEP; u <= 180; u += STEP) {
		const next = at(u);
		refine(u - STEP, prev, u, next);
		out.push(next);
		prev = next;
	}
	return out;
}

/** The meridian under the moon, where it stands above the horizon as it crosses. */
function transitLine(c: MoonCircle): MoonLine[] {
	const south = Math.max(-90, c.lat - c.radius);
	const north = Math.min(90, c.lat + c.radius);
	if (south >= north) return [];
	const lats = [south];
	for (let lat = Math.floor(south) + 1; lat < north; lat++) lats.push(lat);
	lats.push(north);
	return [lats.map((lat) => ({ lat, lon: c.lon }))];
}
