/**
 * Check the moon engine (src/lib/astro/lunar.ts) against independent
 * references, so the moon marker — and the Moon view built on it — can be
 * trusted:
 *
 *   1. astronomy-engine (github.com/cosinekitty/astronomy), a widely used
 *      library with its own, independent lunar model — the point under the moon,
 *      the Earth–moon distance and the lit fraction, every 61 hours for a
 *      year. (It uses the same ΔT model, so ΔT itself isn't checked here.)
 *   2. Meeus' worked example 47.a, which reproduces the ch. 47 series to its
 *      last printed digit, so a mistyped coefficient can't hide.
 *   3. The Moon view's lines (src/lib/astro/moon.ts) against astronomy-engine's
 *      own moonrise, transit and moonset searches: every place on a line at an
 *      instant must have that event at that instant. The rise and set lines
 *      must stop where the moon stays up or down, and the transit line where
 *      it's below the horizon as it crosses. The moonlit night must cover
 *      just the places where astronomy-engine has the moon up and the sun down.
 *
 * Usage:  bun run verify-moon
 */

import {
	Body,
	Equator,
	EquatorFromVector,
	GeoMoon,
	Horizon,
	Illumination,
	KM_PER_AU,
	Observer,
	RotateVector,
	Rotation_EQJ_EQD,
	SearchHourAngle,
	SearchRiseSet,
	SiderealTime
} from 'astronomy-engine';
import { wrapLon, type GeoPoint } from '../src/lib/astro/solar';
import { deltaT, moonPhase, moonPosition, sublunarPoint } from '../src/lib/astro/lunar';
import { MOON_EVENT_KINDS, moonLines, type MoonEventKind } from '../src/lib/astro/moon';

const MIN = 60_000;
const HOUR = 3600_000;
const RAD = Math.PI / 180;

/** The moon's equatorial radius, km, as astronomy-engine takes it for rise and set. */
const MOON_RADIUS_KM = 1738.1;

/** Every 61 hours for a full year from 2026, so the samples drift through every hour of the day. */
const DATES: Date[] = [];
for (let t = Date.UTC(2026, 0, 1); t <= Date.UTC(2027, 0, 2); t += 61 * HOUR) DATES.push(new Date(t));

/** Instants for the map: every 79 hours through one lunar month, and a few more through the year. */
const INSTANTS: Date[] = [];
for (let t = Date.UTC(2026, 9, 1, 3); t < Date.UTC(2026, 9, 31); t += 79 * HOUR) INSTANTS.push(new Date(t));
for (const iso of ['2026-01-15T11:00:00Z', '2026-04-03T20:30:00Z', '2026-06-21T07:45:00Z', '2026-12-24T16:20:00Z']) {
	INSTANTS.push(new Date(iso));
}
// Only near the middle of an eclipse do the moon's circle and the terminator
// not cross: the moonlit night is then empty (solar, 22 July 2009) or the whole
// circle (lunar, 26 June 2029).
INSTANTS.push(new Date('2009-07-22T02:35:00Z'), new Date('2029-06-26T03:21:00Z'));

// ---- bookkeeping ----------------------------------------------------------------

interface Check {
	name: string;
	/** Infinity for a difference that's only reported. */
	tolerance: number;
	format: (n: number) => string;
	worst: number;
	worstCase: string;
	count: number;
	/** Every difference, for a reported check's spread. */
	values: number[];
}
const checks: Check[] = [];
function check(name: string, tolerance: number, format: (n: number) => string): (diff: number, label: string) => void {
	const c: Check = { name, tolerance, format, worst: 0, worstCase: '', count: 0, values: [] };
	checks.push(c);
	return (diff, label) => {
		c.count++;
		c.values.push(Math.abs(diff));
		if (!(Math.abs(diff) <= c.worst)) {
			c.worst = Number.isNaN(diff) ? Infinity : Math.abs(diff);
			c.worstCase = label;
		}
	};
}

const degrees = (digits: number) => (n: number) => `${n.toFixed(digits)}°`;
const minutes = (n: number) => `${(n * 60).toFixed(1)} s`;

/** Angle between two points on the globe, degrees. */
function separation(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
	const cos =
		Math.sin(a.lat * RAD) * Math.sin(b.lat * RAD) +
		Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.cos((a.lon - b.lon) * RAD);
	return Math.acos(Math.min(1, cos)) / RAD;
}

/** astronomy-engine's point under the moon: its RA and declination of date, against Greenwich sidereal time. */
function theirSublunar(date: Date) {
	const eq = EquatorFromVector(RotateVector(Rotation_EQJ_EQD(date), GeoMoon(date)));
	return { lat: eq.dec, lon: wrapLon(15 * (eq.ra - SiderealTime(date))) };
}

// ---- 1: against astronomy-engine -------------------------------------------------

const vsSublunar = check('Point under the moon vs astronomy-engine', 0.02, degrees(4));
for (const date of DATES) {
	vsSublunar(separation(sublunarPoint(date), theirSublunar(date)), date.toISOString());
}

const vsDistance = check('Earth–moon distance vs astronomy-engine', 0.001, (n) => `${(n * 100).toFixed(3)}%`);
for (const date of DATES) {
	const theirs = GeoMoon(date).Length() * KM_PER_AU;
	vsDistance((moonPosition(date).distance - theirs) / theirs, date.toISOString());
}

// The lit fraction is itself a percentage, so its limit is 1 percentage point.
const vsLit = check('Lit fraction vs astronomy-engine', 0.01, (n) => `${(n * 100).toFixed(2)} points`);
for (const date of DATES) {
	vsLit(moonPhase(date).illumination - Illumination(Body.Moon, date).phase_fraction, date.toISOString());
}

// ---- 2: Meeus' worked example ------------------------------------------------------

// Example 47.a, 1992 April 12 at 0h TT: λ = 133.162655°, β = −3.229126°,
// Δ = 368409.7 km, π = 0.991990°. Every term of the series feeds these, so a
// mistyped coefficient shows up here.
{
	const tt = Date.UTC(1992, 3, 12);
	const pos = moonPosition(new Date(tt - deltaT(new Date(tt)) * 1000));
	const label = '1992-04-12 0h TT';
	check('Meeus example 47.a longitude', 0.00001, degrees(6))(pos.eclipticLongitude - 133.162655, label);
	check('Meeus example 47.a latitude', 0.00001, degrees(6))(pos.eclipticLatitude + 3.229126, label);
	check('Meeus example 47.a distance', 0.1, (n) => `${n.toFixed(2)} km`)(pos.distance - 368409.7, label);
	check('Meeus example 47.a parallax', 0.00001, degrees(6))(pos.parallax - 0.99199, label);
}

// ---- 3: the Moon view's lines -------------------------------------------------------------

/**
 * Minutes from `t` to astronomy-engine's `kind` at `p` — the one within three
 * hours of `t`, or NaN when there's none. Its rise and set are the moon's upper
 * limb, seen from the surface, crossing a horizon lowered 34′ by refraction.
 */
function theirEvent(kind: MoonEventKind, p: GeoPoint, t: Date): number {
	const observer = new Observer(p.lat, wrapLon(p.lon), 0);
	const from = new Date(t.getTime() - 3 * HOUR);
	const found =
		kind === 'transit'
			? SearchHourAngle(Body.Moon, observer, 0, from, +1).time.date
			: SearchRiseSet(Body.Moon, observer, kind === 'moonrise' ? +1 : -1, from, 0.25)?.date;
	const diff = found ? (found.getTime() - t.getTime()) / MIN : NaN;
	return Math.abs(diff) <= 180 ? diff : NaN;
}

/** astronomy-engine: how far the moon's upper limb is above the refracted horizon at `p`, degrees. */
function theirMoonHeight(p: GeoPoint, t: Date): number {
	const observer = new Observer(p.lat, wrapLon(p.lon), 0);
	const eq = Equator(Body.Moon, t, observer, true, true);
	const limb = Math.asin(MOON_RADIUS_KM / (eq.dist * KM_PER_AU)) / RAD;
	return Horizon(t, observer, eq.ra, eq.dec).altitude + limb + 34 / 60;
}

function theyHaveMoonUp(p: GeoPoint, t: Date): boolean {
	return theirMoonHeight(p, t) > 0;
}

/** astronomy-engine: the sun's centre's geometric altitude at `p`, degrees — negative on the night side of the terminator. */
function theirSunAltitude(p: GeoPoint, t: Date): number {
	const observer = new Observer(p.lat, wrapLon(p.lon), 0);
	const eq = Equator(Body.Sun, t, observer, true, true);
	return Horizon(t, observer, eq.ra, eq.dec).altitude;
}

/**
 * Whether `p` lies inside the closed outlines `rings` (longitudes continuous,
 * so each is tried a world to either side as well), by counting crossings.
 */
function insideOutline(rings: GeoPoint[][], p: GeoPoint): boolean {
	let inside = false;
	for (const ring of rings) {
		for (const shift of [-360, 0, 360]) {
			const lon = p.lon + shift;
			for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
				const a = ring[i];
				const b = ring[j];
				if (a.lat > p.lat !== b.lat > p.lat && lon < a.lon + ((p.lat - a.lat) / (b.lat - a.lat)) * (b.lon - a.lon)) {
					inside = !inside;
				}
			}
		}
	}
	return inside;
}

/**
 * Where the rise and set lines must end, from astronomy-engine's moon: the edges
 * of the caps where it stays up or down, 90° − h₀ from the point under it.
 */
function capEdges(t: Date): { south: number; north: number } {
	const parallax = Math.asin(6378.14 / (GeoMoon(t).Length() * KM_PER_AU)) / RAD;
	const radius = 90 - (0.7275 * parallax - 34 / 60);
	const { lat } = theirSublunar(t);
	return {
		south: lat - radius >= -90 ? lat - radius : -180 - (lat - radius),
		north: lat + radius <= 90 ? lat + radius : 180 - (lat + radius)
	};
}

const linesVsThem = check('Moonrise, transit and moonset lines vs astronomy-engine (|lat| ≤ 60°)', 2, minutes);
const linesVsThemSubpolar = check('… 60°–66°, reported', Infinity, minutes);
const linesVsThemPolar = check('… beyond 66°, reported', Infinity, minutes);
const noInventedEvents = check('No rise or set line where the moon stays up or down', 0, () => 'none missing');
const lineEnds = check('Rise and set lines end at the edges of the always-up and always-down caps', 0.02, degrees(4));
const transitExtent = check('Transit line drawn just where the moon is up as it crosses', 0.2, degrees(2));
// A place may land on the wrong side only within a hair of either edge: its
// distance from the nearer one, in degrees of altitude.
const moonlitArea = check('Moonlit night covers just where the moon is up and the sun down', 0.1, degrees(3));
const moonlitLit = check('Moonlit night shading follows the lit fraction', 0.01, (n) => `${(n * 100).toFixed(2)} points`);

for (const t of INSTANTS) {
	const lines = moonLines(t);
	const at = t.toISOString();
	const edges = capEdges(t);

	for (const kind of MOON_EVENT_KINDS) {
		for (const seg of lines[kind]) {
			const first = seg[0].lat;
			const last = seg[seg.length - 1].lat;
			seg.forEach((p, i) => {
				if (i % 4) return;
				const diff = theirEvent(kind, p, t);
				const label = `${at} ${kind} at ${p.lat.toFixed(2)}°, ${wrapLon(p.lon).toFixed(2)}°`;
				if (Math.abs(p.lat) <= 60) linesVsThem(diff, label);
				else if (!Number.isNaN(diff)) (Math.abs(p.lat) <= 66 ? linesVsThemSubpolar : linesVsThemPolar)(diff, label);
				// Right at a line's end the moon only grazes the horizon, so either answer is fair.
				if (kind !== 'transit' && Math.min(p.lat - first, last - p.lat) > 0.5) {
					noInventedEvents(Number.isNaN(diff) ? NaN : 0, label);
				}
			});
		}
		if (kind === 'transit') continue;
		// Each is one unbroken line from cap to cap.
		const seg = lines[kind].length === 1 ? lines[kind][0] : null;
		lineEnds(seg ? seg[0].lat - edges.south : NaN, `${at} ${kind} south end`);
		lineEnds(seg ? seg[seg.length - 1].lat - edges.north : NaN, `${at} ${kind} north end`);
	}

	// Down the meridian under the moon: the transit line is drawn exactly where
	// the moon is above the horizon, up to a sliver at each end.
	const drawn = lines.transit.map((seg) => [seg[0].lat, seg[seg.length - 1].lat]);
	const lon = theirSublunar(t).lon;
	for (let lat = -89.75; lat < 90; lat += 0.5) {
		const shown = drawn.some(([a, b]) => lat >= a && lat <= b);
		const up = theyHaveMoonUp({ lat, lon }, t);
		const fromEnd = Math.min(...drawn.flat().map((end) => Math.abs(lat - end)));
		transitExtent(shown === up ? 0 : fromEnd, `${at} transit at ${lat}°`);
	}

	// Every 5° over the globe: moonlit exactly where the moon is up and the sun down.
	for (let lat = -87.5; lat < 90; lat += 5) {
		for (let lon = -177.5; lon < 180; lon += 5) {
			const p = { lat, lon };
			const moon = theirMoonHeight(p, t);
			const sun = theirSunAltitude(p, t);
			const shaded = insideOutline(lines.moonlit, p);
			const lit = moon > 0 && sun < 0;
			moonlitArea(shaded === lit ? 0 : Math.min(Math.abs(moon), Math.abs(sun)), `${at} at ${lat}°, ${lon}°`);
		}
	}
	moonlitLit(lines.illumination - Illumination(Body.Moon, t).phase_fraction, at);
}

// ---- report ---------------------------------------------------------------------------------

let failed = false;
for (const c of checks) {
	const worst = c.worst === Infinity ? 'missing value' : c.format(c.worst);
	if (c.tolerance === Infinity) {
		const sorted = c.values.sort((a, b) => a - b);
		const at = (q: number) => c.format(sorted[Math.floor(q * (sorted.length - 1))]);
		process.stdout.write(
			`• ${c.name}: ${c.count} compared, median ${at(0.5)}, 95% within ${at(0.95)}, worst ${worst}\n` +
				`    worst case: ${c.worstCase}\n`
		);
		continue;
	}
	const ok = c.count > 0 && c.worst <= c.tolerance;
	failed ||= !ok;
	process.stdout.write(
		`${ok ? '✓' : '✗'} ${c.name}: ${c.count} compared, worst ${worst} (limit ${c.format(c.tolerance)})` +
			(ok ? '\n' : `\n    worst case: ${c.worstCase}\n`)
	);
}
process.exit(failed ? 1 : 0);
