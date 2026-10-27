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
 *
 * Usage:  bun run verify-moon
 */

import {
	Body,
	EquatorFromVector,
	GeoMoon,
	Illumination,
	KM_PER_AU,
	RotateVector,
	Rotation_EQJ_EQD,
	SiderealTime
} from 'astronomy-engine';
import { wrapLon } from '../src/lib/astro/solar';
import { deltaT, moonPhase, moonPosition, sublunarPoint } from '../src/lib/astro/lunar';

const HOUR = 3600_000;
const RAD = Math.PI / 180;

/** Every 61 hours for a full year from 2026, so the samples drift through every hour of the day. */
const DATES: Date[] = [];
for (let t = Date.UTC(2026, 0, 1); t <= Date.UTC(2027, 0, 2); t += 61 * HOUR) DATES.push(new Date(t));

// ---- bookkeeping ----------------------------------------------------------------

interface Check {
	name: string;
	tolerance: number;
	format: (n: number) => string;
	worst: number;
	worstCase: string;
	count: number;
}
const checks: Check[] = [];
function check(name: string, tolerance: number, format: (n: number) => string): (diff: number, label: string) => void {
	const c: Check = { name, tolerance, format, worst: 0, worstCase: '', count: 0 };
	checks.push(c);
	return (diff, label) => {
		c.count++;
		if (!(Math.abs(diff) <= c.worst)) {
			c.worst = Number.isNaN(diff) ? Infinity : Math.abs(diff);
			c.worstCase = label;
		}
	};
}

const degrees = (digits: number) => (n: number) => `${n.toFixed(digits)}°`;

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

// ---- report ---------------------------------------------------------------------------------

let failed = false;
for (const c of checks) {
	const ok = c.count > 0 && c.worst <= c.tolerance;
	failed ||= !ok;
	const worst = c.worst === Infinity ? 'missing value' : c.format(c.worst);
	process.stdout.write(
		`${ok ? '✓' : '✗'} ${c.name}: ${c.count} compared, worst ${worst} (limit ${c.format(c.tolerance)})` +
			(ok ? '\n' : `\n    worst case: ${c.worstCase}\n`)
	);
}
process.exit(failed ? 1 : 0);
