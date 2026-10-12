/**
 * Check the prayer-time engine (src/lib/astro/prayer.ts) against independent
 * references, so the map can be trusted:
 *
 *   1. adhan (github.com/batoulapps/adhan-js), a widely used library built on
 *      Meeus' algorithms — every method it shares with us, both Asr schools,
 *      16 cities from the equator to the Arctic, 6 dates through the year.
 *   2. Asr by brute force: the instant the sun's altitude reaches the shadow
 *      condition, with the noon shadow taken at that day's actual transit.
 *      (adhan dates the noon shadow at 0h UT, which drifts by minutes at high
 *      latitudes around the equinoxes, so Asr is checked against this instead.)
 *   3. The night-fraction caps beyond 48°, against adhan's same rules.
 *   4. The map against the timetable: every point on a line drawn for an
 *      instant must have that prayer at that instant.
 *   5. The polar rule: under the midnight sun, times are those of 45°.
 *
 * Usage:  bun run verify-prayer-times
 */

import {
	CalculationMethod,
	CalculationParameters,
	Coordinates,
	HighLatitudeRule,
	Madhab,
	PrayerTimes,
	Rounding
} from 'adhan';
import { sunState, wrapLon } from '../src/lib/astro/solar';
import {
	PRAYER_KEYS,
	isRamadan,
	prayerLines,
	prayerTimes,
	solarDay,
	type HighLatRule,
	type MethodId,
	type PrayerConfig,
	type PrayerKey
} from '../src/lib/astro/prayer';

const MIN = 60_000;
const RAD = Math.PI / 180;

const PLACES: [string, number, number][] = [
	['Makkah', 21.4225, 39.8262],
	['Jakarta', -6.2088, 106.8456],
	['Seoul', 37.5665, 126.978],
	['Tokyo', 35.6762, 139.6503],
	['Cairo', 30.0444, 31.2357],
	['Istanbul', 41.0082, 28.9784],
	['London', 51.5074, -0.1278],
	['New York', 40.7128, -74.006],
	['Oslo', 59.9139, 10.7522],
	['Reykjavík', 64.1466, -21.9426],
	['Tromsø', 69.6492, 18.9553],
	['Cape Town', -33.9249, 18.4241],
	['Sydney', -33.8688, 151.2093],
	['Ushuaia', -54.8019, -68.303],
	['Honolulu', 21.3069, -157.8583],
	['Auckland', -36.8485, 174.7633]
];

/** [year, month (0-based), day] — equinoxes, solstices, a Ramadan day and an autumn day. */
const DATES: [number, number, number][] = [
	[2026, 2, 21],
	[2026, 5, 21],
	[2026, 8, 23],
	[2026, 9, 12],
	[2026, 11, 21],
	[2026, 1, 25]
];

/** adhan's version of each method we share with it. */
const ADHAN: Partial<Record<MethodId, () => CalculationParameters>> = {
	mwl: () => CalculationMethod.MuslimWorldLeague(),
	isna: () => CalculationMethod.NorthAmerica(),
	egypt: () => CalculationMethod.Egyptian(),
	makkah: () => CalculationMethod.UmmAlQura(),
	karachi: () => CalculationMethod.Karachi(),
	singapore: () => CalculationMethod.Singapore(),
	turkey: () => CalculationMethod.Turkey(),
	dubai: () => CalculationMethod.Dubai(),
	kuwait: () => CalculationMethod.Kuwait(),
	qatar: () => CalculationMethod.Qatar(),
	tehran: () => CalculationMethod.Tehran(),
	kemenag: () => {
		const p = new CalculationParameters('Other', 20, 18);
		p.methodAdjustments = { fajr: 2, sunrise: -2, dhuhr: 2, asr: 2, maghrib: 2, isha: 2 };
		return p;
	},
	france: () => new CalculationParameters('Other', 12, 12),
	russia: () => new CalculationParameters('Other', 16, 15),
	jafari: () => new CalculationParameters('Other', 16, 14, 0, 4)
};

const RULES: Record<string, (typeof HighLatitudeRule)[keyof typeof HighLatitudeRule]> = {
	middle: HighLatitudeRule.MiddleOfTheNight,
	seventh: HighLatitudeRule.SeventhOfTheNight,
	angle: HighLatitudeRule.TwilightAngle
};

// ---- bookkeeping ----------------------------------------------------------------

interface Check {
	name: string;
	tolerance: number; // minutes
	worst: number;
	worstCase: string;
	count: number;
}
const checks: Check[] = [];
function check(name: string, tolerance: number): (diffMin: number, label: string) => void {
	const c: Check = { name, tolerance, worst: 0, worstCase: '', count: 0 };
	checks.push(c);
	return (diff, label) => {
		c.count++;
		if (!(Math.abs(diff) <= c.worst)) {
			c.worst = Number.isNaN(diff) ? Infinity : Math.abs(diff);
			c.worstCase = label;
		}
	};
}

/** Our timetable for the date adhan calls (y, m, d) at that place. */
function ours(lat: number, lon: number, [y, m, d]: [number, number, number], cfg: PrayerConfig) {
	return prayerTimes({ lat, lon }, solarDay(lon, new Date(Date.UTC(y, m, d, 12) - (lon / 15) * 3600_000)), cfg);
}

function theirs(lat: number, lon: number, [y, m, d]: [number, number, number], method: MethodId, cfg: PrayerConfig, rule: string) {
	const params = ADHAN[method]!();
	params.madhab = cfg.asr === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
	params.highLatitudeRule = RULES[rule];
	params.rounding = Rounding.None;
	return new PrayerTimes(new Coordinates(lat, lon), new Date(y, m, d), params);
}

// ---- 1 & 3: against adhan --------------------------------------------------------------

const vsAdhan = check('Fajr, sunrise, Dhuhr, Maghrib, Isha vs adhan', 1);
const vsAdhanCaps = check('1/7 and α/60 caps beyond 48° vs adhan', 2);

for (const rule of ['middle', 'seventh', 'angle']) {
	for (const method of Object.keys(ADHAN) as MethodId[]) {
		for (const asr of ['standard', 'hanafi'] as const) {
			const cfg: PrayerConfig = { method, asr, highLat: rule as HighLatRule };
			for (const [name, lat, lon] of PLACES) {
				// Our caps only act beyond 48°; adhan's apply everywhere.
				if (rule !== 'middle' && Math.abs(lat) <= 48) continue;
				for (const date of DATES) {
					const mine = ours(lat, lon, date, cfg);
					const ref = theirs(lat, lon, date, method, cfg, rule);
					for (const key of PRAYER_KEYS) {
						if (key === 'asr') continue; // checked against the brute force below
						const t = mine[key];
						// The sun neither rises nor sets: adhan leaves these undefined, we use 45°.
						if (!t || t.basis === 'ref45') continue;
						// adhan doesn't estimate a missing Jaʿfari Maghrib angle; PrayTimes and we do.
						if (key === 'maghrib' && t.basis === 'rule') continue;
						let expected = ref[key].getTime();
						if (key === 'isha' && method === 'makkah' && isRamadan(t.time)) expected += 30 * MIN;
						const label = `${rule} ${method} ${asr} ${name} ${date.join('-')} ${key}`;
						(rule === 'middle' ? vsAdhan : vsAdhanCaps)((t.time.getTime() - expected) / MIN, label);
					}
				}
			}
		}
	}
}

// ---- 2: Asr by brute force ---------------------------------------------------------------

function altitude(lat: number, lon: number, t: number): number {
	const s = sunState(new Date(t));
	const H = (lon - s.subsolar.lon) * RAD;
	return (
		Math.asin(
			Math.sin(lat * RAD) * Math.sin(s.declination * RAD) +
				Math.cos(lat * RAD) * Math.cos(s.declination * RAD) * Math.cos(H)
		) / RAD
	);
}

const asrTruth = check('Asr vs brute-force shadow condition', 0.1);
for (const [name, lat, lon] of PLACES) {
	for (const date of DATES) {
		const [y, m, d] = date;
		const meanNoon = Date.UTC(y, m, d, 12) - (lon / 15) * 3600_000;
		// Transit: the altitude peak, by ternary search.
		let a = meanNoon - 2 * 3600_000;
		let b = meanNoon + 2 * 3600_000;
		for (let i = 0; i < 100; i++) {
			const m1 = a + (b - a) / 3;
			const m2 = b - (b - a) / 3;
			if (altitude(lat, lon, m1) < altitude(lat, lon, m2)) a = m1;
			else b = m2;
		}
		const transit = (a + b) / 2;
		if (altitude(lat, lon, transit) <= 0) continue; // polar night: no shadow
		const declNoon = sunState(new Date(transit)).declination;
		for (const asr of ['standard', 'hanafi'] as const) {
			const shadow = asr === 'hanafi' ? 2 : 1;
			const target = Math.atan(1 / (shadow + Math.tan(Math.abs(lat - declNoon) * RAD))) / RAD;
			let lo = transit;
			let hi = transit + 12 * 3600_000;
			if (altitude(lat, lon, hi) > target) continue; // midnight sun above the Asr altitude
			for (let i = 0; i < 100; i++) {
				const mid = (lo + hi) / 2;
				if (altitude(lat, lon, mid) > target) lo = mid;
				else hi = mid;
			}
			const t = ours(lat, lon, date, { method: 'karachi', asr, highLat: 'none' }).asr;
			if (!t) continue;
			// Karachi adds no minutes to Asr.
			asrTruth((t.time.getTime() - (lo + hi) / 2) / MIN, `${asr} ${name} ${date.join('-')}`);
		}
	}
}

// ---- 4: map lines against the timetable -------------------------------------------------

const linesVsTimes = check('Map lines vs timetable (|lat| ≤ 66°)', 0.1);
for (const iso of ['2026-06-21T03:10:00Z', '2026-12-21T15:40:00Z', '2026-10-12T05:00:00Z', '2026-03-20T22:00:00Z']) {
	const now = new Date(iso);
	for (const highLat of ['mwl45', 'middle', 'seventh', 'angle', 'none'] as HighLatRule[]) {
		for (const method of ['mwl', 'makkah', 'tehran', 'kemenag'] as MethodId[]) {
			const cfg: PrayerConfig = { method, asr: 'standard', highLat };
			const lines = prayerLines(now, cfg);
			for (const key of PRAYER_KEYS) {
				for (const seg of lines[key]) {
					seg.points.forEach((p, i) => {
						// Interior points only: segment ends sit on a discontinuity by construction.
						if (i % 7 || i === 0 || i === seg.points.length - 1 || Math.abs(p.lat) > 66) return;
						const place = { lat: p.lat, lon: wrapLon(p.lon) };
						const day = solarDay(place.lon, now);
						let best = Infinity;
						for (const dd of [day - 1, day, day + 1]) {
							const t = prayerTimes(place, dd, cfg)[key as PrayerKey];
							if (t) {
								const diff = (t.time.getTime() - now.getTime()) / MIN;
								if (Math.abs(diff) < Math.abs(best)) best = diff;
							}
						}
						linesVsTimes(best, `${iso} ${highLat} ${method} ${key} at ${p.lat.toFixed(2)}°`);
					});
				}
			}
		}
	}
}

// ---- 5: midnight sun follows 45° ----------------------------------------------------------

const polar = check('Midnight sun at Tromsø → times of 45° N', 0.5);
for (const method of ['mwl', 'makkah', 'kemenag'] as MethodId[]) {
	const cfg: PrayerConfig = { method, asr: 'standard', highLat: 'mwl45' };
	const north = ours(69.6492, 18.9553, [2026, 5, 21], cfg);
	const ref = ours(45, 18.9553, [2026, 5, 21], cfg);
	for (const key of PRAYER_KEYS) {
		const t = north[key];
		const r = ref[key];
		const label = `${method} ${key}`;
		if (!t || !r || (key !== 'dhuhr' && t.basis !== 'ref45')) polar(NaN, label);
		else polar((t.time.getTime() - r.time.getTime()) / MIN, label);
	}
}

// ---- report ---------------------------------------------------------------------------------

let failed = false;
for (const c of checks) {
	const ok = c.count > 0 && c.worst <= c.tolerance;
	failed ||= !ok;
	const worst = c.worst === Infinity ? 'missing time' : `${(c.worst * 60).toFixed(1)} s`;
	process.stdout.write(
		`${ok ? '✓' : '✗'} ${c.name}: ${c.count} compared, worst ${worst} (limit ${c.tolerance * 60} s)` +
			(ok ? '\n' : `\n    worst case: ${c.worstCase}\n`)
	);
}
process.exit(failed ? 1 : 0);
