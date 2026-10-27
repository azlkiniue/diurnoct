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
 * Where that circle's cap overlaps the night side of the sun's terminator, the
 * moon is up and the sun down: the moonlit night.
 *
 * Positions come from ./lunar (Meeus ch. 47). See docs/moon.md.
 */

import { moonPhase, moonPosition } from './lunar';
import { geoToVec3, gmstDeg, sunState, wrapLon, type GeoPoint } from './solar';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

export type MoonEventKind = 'moonrise' | 'transit' | 'moonset';

/** In the order a place sees them. */
export const MOON_EVENT_KINDS: MoonEventKind[] = ['moonrise', 'transit', 'moonset'];

export const MOON_EVENT_NAMES: Record<MoonEventKind, string> = {
	moonrise: 'Moonrise',
	transit: 'Moon transit',
	moonset: 'Moonset'
};

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

export interface MoonLines extends Record<MoonEventKind, MoonLine[]> {
	/**
	 * Outline of the moonlit night — where the moon is up and the sun down — as
	 * closed rings with continuous longitudes, so draw each shifted by ±360° as
	 * well; one around a pole runs along the map's top or bottom edge. Empty
	 * near new moon, when the moon is only up by day.
	 */
	moonlit: GeoPoint[][];
	/** Lit fraction of the moon's disk, 0..1: how bright the moonlit night is. */
	illumination: number;
}

/** Base step along the circle, and the finest refinement, in degrees of bearing. */
const STEP = 1;
const MIN_STEP = STEP / 256;
/** Refine until neighbouring points are this close in longitude. */
const MAX_LON_STEP = 1.5;

/**
 * Where the moon is rising, crossing the meridian and setting at instant
 * `date`, and where it lights the night. Each line is unbroken; the rise and
 * set lines stop where the moon stays up or stays down, meeting at both ends.
 */
export function moonLines(date: Date): MoonLines {
	const c = moonCircle(date);
	return {
		moonrise: [circleHalf(c, -1)],
		transit: transitLine(c),
		moonset: [circleHalf(c, 1)],
		moonlit: moonlitNight(c, sunState(date).subsolar),
		illumination: moonPhase(date).illumination
	};
}

/**
 * Points of `at(u)` from u = `from` to `to` in steps of about STEP, refined
 * wherever neighbouring points are far apart in longitude, as near a pole.
 */
function trace(at: (u: number) => GeoPoint, from: number, to: number): GeoPoint[] {
	const out: GeoPoint[] = [];
	// Pushes the points strictly between u0 and u1.
	const refine = (u0: number, p0: GeoPoint, u1: number, p1: GeoPoint) => {
		if (Math.abs(wrapLon(p1.lon - p0.lon)) <= MAX_LON_STEP || Math.abs(u1 - u0) <= MIN_STEP) return;
		const um = (u0 + u1) / 2;
		const pm = at(um);
		refine(u0, p0, um, pm);
		out.push(pm);
		refine(um, pm, u1, p1);
	};
	const n = Math.max(1, Math.ceil(Math.abs(to - from) / STEP));
	let prev = at(from);
	out.push(prev);
	for (let i = 1; i <= n; i++) {
		const u = from + ((to - from) * i) / n;
		const next = at(u);
		refine(from + ((to - from) * (i - 1)) / n, prev, u, next);
		out.push(next);
		prev = next;
	}
	return out;
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
	return trace(at, 0, 180);
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

// ---- the moonlit night --------------------------------------------------------------------

type Vec = [number, number, number];

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec, b: Vec): Vec => [
	a[1] * b[2] - a[2] * b[1],
	a[2] * b[0] - a[0] * b[2],
	a[0] * b[1] - a[1] * b[0]
];
const plus = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const times = (a: Vec, k: number): Vec => [a[0] * k, a[1] * k, a[2] * k];
const unit = (a: Vec): Vec => times(a, 1 / Math.hypot(...a));
/** Inverse of geoToVec3. */
const toGeo = ([x, y, z]: Vec): GeoPoint => ({
	lat: Math.asin(Math.max(-1, Math.min(1, y))) * DEG,
	lon: Math.atan2(z, x) * DEG
});

/** The places within a circle on the globe: those `p` with p · centre ≥ cos. */
interface Cap {
	centre: Vec;
	cos: number;
}

const inCap = (cap: Cap, p: Vec) => dot(cap.centre, p) >= cap.cos;

/** The two points where the edges of caps `a` and `b` cross, or null where they don't. */
function crossings(a: Cap, b: Cap): [Vec, Vec] | null {
	const g = dot(a.centre, b.centre);
	const det = 1 - g * g;
	if (det < 1e-12) return null;
	const base = plus(times(a.centre, (a.cos - b.cos * g) / det), times(b.centre, (b.cos - a.cos * g) / det));
	const t2 = (1 - dot(base, base)) / det;
	if (t2 <= 0) return null;
	const n = times(cross(a.centre, b.centre), Math.sqrt(t2));
	return [plus(base, n), plus(base, times(n, -1))];
}

/** The edge of `cap` from `from` round to `to` (a full turn when they're the same) through `other`. */
function edge(cap: Cap, from: Vec, to: Vec, other: Cap): GeoPoint[] {
	const sin = Math.sqrt(1 - cap.cos * cap.cos);
	const u = unit(plus(from, times(cap.centre, -cap.cos)));
	const v = cross(cap.centre, u);
	const at = (deg: number) =>
		plus(times(cap.centre, cap.cos), times(plus(times(u, Math.cos(deg * RAD)), times(v, Math.sin(deg * RAD))), sin));
	// Round one way or the other: the way whose middle lies in `other`.
	let sweep = Math.atan2(dot(to, v), dot(to, u)) * DEG;
	if (sweep <= 0) sweep += 360;
	if (!inCap(other, at(sweep / 2))) sweep -= 360;
	return trace((deg) => toGeo(at(deg)), 0, sweep);
}

/** Where the moon is up (`moon`, its circle of rise and set) and the sun down. */
function moonlitNight(moon: MoonCircle, sun: GeoPoint): GeoPoint[][] {
	const up: Cap = { centre: geoToVec3(moon), cos: Math.cos(moon.radius * RAD) };
	const night: Cap = { centre: times(geoToVec3(sun), -1), cos: 0 };

	let ring: GeoPoint[];
	const ends = crossings(up, night);
	if (ends) {
		// Round the moon's circle on the night side, then back along the terminator.
		const [a, b] = ends;
		ring = [...edge(up, a, b, night), ...edge(night, b, a, up).slice(1, -1)];
	} else {
		// The circle and the terminator don't cross, and the moon's cap is the
		// smaller (h₀ > 0): it's wholly on the night side near full moon, or
		// wholly on the day side near new moon.
		const somewhere = plus(times(up.centre, up.cos), times(unit(cross(up.centre, [0, 1, 0.5])), Math.sqrt(1 - up.cos ** 2)));
		if (!inCap(night, somewhere)) return [];
		ring = edge(up, somewhere, somewhere, night).slice(0, -1);
	}
	return [outline(ring, (p) => inCap(up, p) && inCap(night, p))];
}

/**
 * A ring of points on the globe as a closed outline on the map: longitudes
 * made continuous and, where the ring goes once round a pole that's inside
 * (`inside`), closed along the map's edge at that pole.
 */
function outline(ring: GeoPoint[], inside: (p: Vec) => boolean): GeoPoint[] {
	const out = [ring[0]];
	for (const p of ring.slice(1)) {
		out.push({ lat: p.lat, lon: out[out.length - 1].lon + wrapLon(p.lon - out[out.length - 1].lon) });
	}
	const last = out[out.length - 1];
	const closing = last.lon + wrapLon(ring[0].lon - last.lon);
	if (Math.abs(closing - out[0].lon) > 180) {
		const pole = inside([0, 1, 0]) ? 90 : -90;
		out.push({ lat: ring[0].lat, lon: closing }, { lat: pole, lon: closing }, { lat: pole, lon: out[0].lon });
	}
	return out;
}
