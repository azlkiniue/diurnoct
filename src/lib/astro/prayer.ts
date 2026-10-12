/**
 * Islamic prayer times: the astronomical definitions, the common calculation
 * methods, and the scholarly rules for high latitudes.
 *
 * Every prayer is expressed as the sun's *hour angle* when it begins — hours
 * from local apparent noon, negative before noon — for a latitude and a solar
 * declination. Because the sun's hour angle at longitude λ is simply
 * (λ − subsolar longitude), the same numbers answer both questions the prayer
 * map asks:
 *   - where on Earth is Fajr beginning right now?  →  λ = subsolarLon + 15°·h
 *   - when does Fajr begin at this place today?    →  the instant that holds
 *
 * Sun positions come from ./solar (the Astronomical Almanac's low-precision
 * formulae, the same ones PrayTimes.org uses), good to a few seconds of time.
 * See docs/prayer-times.md for the methodology and references.
 */

import { sunState, wrapLon, type GeoPoint } from './solar';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/** Sun's altitude at sunrise & sunset: 34′ of refraction plus the 16′ solar semi-diameter. */
const HORIZON = -0.833;

/**
 * Reference latitude for estimates, and the latitude beyond which the
 * night-fraction rules start capping late Isha / early Fajr — both from the
 * Islamic Fiqh Council's zones (45°–48° normal, 48°–66°, 66° to the pole).
 */
const REF_LAT = 45;
const HIGH_LAT = 48;

// ---- prayers ----------------------------------------------------------------

export type PrayerKey = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

/** In the order they occur through the day. */
export const PRAYER_KEYS: PrayerKey[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

export const PRAYER_NAMES: Record<PrayerKey, { name: string; arabic: string }> = {
	fajr: { name: 'Fajr', arabic: 'الفجر' },
	sunrise: { name: 'Sunrise', arabic: 'الشروق' },
	dhuhr: { name: 'Dhuhr', arabic: 'الظهر' },
	asr: { name: 'Asr', arabic: 'العصر' },
	maghrib: { name: 'Maghrib', arabic: 'المغرب' },
	isha: { name: 'Isha', arabic: 'العشاء' }
};

// ---- calculation methods ----------------------------------------------------

export type MethodId =
	| 'mwl'
	| 'isna'
	| 'egypt'
	| 'makkah'
	| 'karachi'
	| 'kemenag'
	| 'singapore'
	| 'turkey'
	| 'dubai'
	| 'kuwait'
	| 'qatar'
	| 'france'
	| 'russia'
	| 'tehran'
	| 'jafari';

export interface CalcMethod {
	id: MethodId;
	/** The authority that defines it. */
	name: string;
	/** Where it is mostly used. */
	region: string;
	/** Sun's depression below the horizon at Fajr, degrees. */
	fajr: number;
	/** Isha: the sun's depression (degrees), or a fixed delay after Maghrib (minutes). */
	isha: { angle: number } | { minutes: number; ramadanMinutes?: number };
	/** Maghrib as a depression angle (Jaʿfari methods); otherwise Maghrib is sunset. */
	maghrib?: number;
	/** Precautionary minutes (ihtiyāṭ / tamkīn) the method adds to each time. */
	offsets?: Partial<Record<PrayerKey, number>>;
}

/**
 * Angles from PrayTimes.org and the adhan library; minute offsets follow
 * adhan, plus Indonesia's customary 2-minute ihtiyāṭ for Kemenag.
 */
export const METHODS: CalcMethod[] = [
	{
		id: 'mwl',
		name: 'Muslim World League',
		region: 'Europe, Far East, worldwide',
		fajr: 18,
		isha: { angle: 17 },
		offsets: { dhuhr: 1 }
	},
	{
		id: 'isna',
		name: 'Islamic Society of North America',
		region: 'United States, Canada',
		fajr: 15,
		isha: { angle: 15 },
		offsets: { dhuhr: 1 }
	},
	{
		id: 'egypt',
		name: 'Egyptian General Authority of Survey',
		region: 'Africa, Syria, Lebanon',
		fajr: 19.5,
		isha: { angle: 17.5 },
		offsets: { dhuhr: 1 }
	},
	{
		id: 'makkah',
		name: 'Umm al-Qura University, Makkah',
		region: 'Saudi Arabia',
		fajr: 18.5,
		isha: { minutes: 90, ramadanMinutes: 120 }
	},
	{
		id: 'karachi',
		name: 'University of Islamic Sciences, Karachi',
		region: 'Pakistan, India, Bangladesh, Afghanistan',
		fajr: 18,
		isha: { angle: 18 },
		offsets: { dhuhr: 1 }
	},
	{
		id: 'kemenag',
		name: 'Kementerian Agama (Kemenag)',
		region: 'Indonesia',
		fajr: 20,
		isha: { angle: 18 },
		offsets: { fajr: 2, sunrise: -2, dhuhr: 2, asr: 2, maghrib: 2, isha: 2 }
	},
	{
		id: 'singapore',
		name: 'Majlis Ugama Islam Singapura (MUIS)',
		region: 'Singapore',
		fajr: 20,
		isha: { angle: 18 },
		offsets: { dhuhr: 1 }
	},
	{
		id: 'turkey',
		name: 'Diyanet İşleri Başkanlığı',
		region: 'Türkiye',
		fajr: 18,
		isha: { angle: 17 },
		offsets: { sunrise: -7, dhuhr: 5, asr: 4, maghrib: 7 }
	},
	{
		id: 'dubai',
		name: 'Islamic Affairs, Dubai',
		region: 'United Arab Emirates',
		fajr: 18.2,
		isha: { angle: 18.2 },
		offsets: { sunrise: -3, dhuhr: 3, asr: 3, maghrib: 3 }
	},
	{ id: 'kuwait', name: 'Kuwait', region: 'Kuwait', fajr: 18, isha: { angle: 17.5 } },
	{ id: 'qatar', name: 'Qatar', region: 'Qatar', fajr: 18, isha: { minutes: 90 } },
	{
		id: 'france',
		name: 'Union des Organisations Islamiques de France',
		region: 'France',
		fajr: 12,
		isha: { angle: 12 }
	},
	{
		id: 'russia',
		name: 'Spiritual Administration of Muslims of Russia',
		region: 'Russia',
		fajr: 16,
		isha: { angle: 15 }
	},
	{
		id: 'tehran',
		name: 'Institute of Geophysics, University of Tehran',
		region: 'Iran',
		fajr: 17.7,
		isha: { angle: 14 },
		maghrib: 4.5
	},
	{
		id: 'jafari',
		name: 'Shia Ithna-Ashari, Leva Institute, Qum',
		region: 'Shia communities',
		fajr: 16,
		isha: { angle: 14 },
		maghrib: 4
	}
];

export function methodById(id: MethodId): CalcMethod {
	return METHODS.find((m) => m.id === id) ?? METHODS[0];
}

// ---- configuration ------------------------------------------------------------

/** Asr begins when an object's shadow exceeds its noon shadow by 1× (standard) or 2× (Hanafi) its height. */
export type AsrSchool = 'standard' | 'hanafi';

export type HighLatRule = 'mwl45' | 'middle' | 'seventh' | 'angle' | 'none';

export interface PrayerConfig {
	method: MethodId;
	asr: AsrSchool;
	highLat: HighLatRule;
}

export const HIGH_LAT_RULES: { id: HighLatRule; label: string; summary: string; source: string }[] = [
	{
		id: 'mwl45',
		label: '45° proportion (MWL Fiqh Council)',
		summary:
			'Where twilight never disappears, Isha and Fajr take the same fraction of the night as at latitude 45°.',
		source:
			'Islamic Fiqh Council of the Muslim World League, 9th session (1406 AH / 1986), reaffirmed at the 19th (1428 AH / 2007)'
	},
	{
		id: 'middle',
		label: 'Middle of the night',
		summary:
			'Beyond 48°, Isha is no later and Fajr no earlier than the midpoint between sunset and sunrise.',
		source: '“The time of Isha lasts until the middle of the night” — Sahih Muslim 612'
	},
	{
		id: 'seventh',
		label: 'One-seventh of the night',
		summary:
			'Beyond 48°, Isha is no later than the first seventh of the night, Fajr no earlier than the last seventh.',
		source: 'Ashraf Ali Thanwi (Imdad al-Fatawa); Mufti Muhammad Shafi; Moonsighting Committee'
	},
	{
		id: 'angle',
		label: 'Twilight angle (α/60 of the night)',
		summary:
			'Beyond 48°, Isha and Fajr are no further from sunset and sunrise than α/60 of the night, α being the twilight angle.',
		source: 'A computational convention (PrayTimes.org, adhan)'
	},
	{
		id: 'none',
		label: 'None — astronomical signs only',
		summary: 'Times exist only where the sun actually reaches each sign; lines stop where it doesn’t.',
		source: ''
	}
];

// ---- one day at one latitude ----------------------------------------------------

/** How a prayer's time was obtained. */
export type Basis =
	/** The sign itself occurs: the sun reaches the defining position. */
	| 'sun'
	/** The sign doesn't occur (twilight lasts all night): estimated by the high-latitude rule. */
	| 'rule'
	/** The sun doesn't rise or set today: the time at latitude 45° (Fiqh Council zone 3). */
	| 'ref45';

export interface PrayerMoment {
	/** Sun's hour angle when the prayer begins: hours from local apparent noon, negative before. */
	h: number;
	basis: Basis;
}

export type DaySchedule = Record<PrayerKey, PrayerMoment | null>;

/** The sun as a schedule needs it, at the moment being evaluated. */
export interface SunContext {
	/** Declination, degrees. */
	decl: number;
	/** Its rate of change, degrees per hour — dates Asr's noon shadow exactly. */
	declRate: number;
	/** Ramadan on the Umm al-Qura calendar (lengthens a fixed Isha interval). */
	ramadan: boolean;
}

export function sunContext(date: Date): SunContext {
	const t = date.getTime();
	const before = sunState(new Date(t - HOUR_MS)).declination;
	const after = sunState(new Date(t + HOUR_MS)).declination;
	return {
		decl: sunState(date).declination,
		declRate: (after - before) / 2,
		ramadan: isRamadan(date)
	};
}

/**
 * Hour angle (hours, 0–12) at which the sun's altitude equals `alt`, or null
 * when it never does — it stays above or below `alt` all day.
 */
function hourAngle(alt: number, lat: number, decl: number): number | null {
	const cosH =
		(Math.sin(alt * RAD) - Math.sin(lat * RAD) * Math.sin(decl * RAD)) /
		(Math.cos(lat * RAD) * Math.cos(decl * RAD));
	return cosH >= -1 && cosH <= 1 ? (Math.acos(cosH) * DEG) / 15 : null;
}

/** Sun's altitude when a shadow is `shadow`× the object's height longer than at noon. */
function asrAltitude(shadow: number, lat: number, declAtNoon: number): number {
	return Math.atan(1 / (shadow + Math.tan(Math.abs(lat - declAtNoon) * RAD))) * DEG;
}

/** Asr's hour angle, the noon shadow taken with the declination `h` hours earlier, at noon. */
function asrHourAngle(lat: number, sun: SunContext, cfg: PrayerConfig): number | null {
	const shadow = cfg.asr === 'hanafi' ? 2 : 1;
	const h = hourAngle(asrAltitude(shadow, lat, sun.decl), lat, sun.decl);
	if (h === null || !sun.declRate) return h;
	return hourAngle(asrAltitude(shadow, lat, sun.decl - h * sun.declRate), lat, sun.decl);
}

/** Whether the sun is above the horizon at local noon. */
function sunUpAtNoon(lat: number, decl: number): boolean {
	return 90 - Math.abs(lat - decl) > HORIZON;
}

function refLat(lat: number): number {
	return lat < 0 ? -REF_LAT : REF_LAT;
}

/** Schedule for a day on which the sun rises and sets (`H0` = sunset hour angle). */
function normalDay(
	lat: number,
	sun: SunContext,
	H0: number,
	method: CalcMethod,
	cfg: PrayerConfig
): DaySchedule {
	const { decl } = sun;
	const night = 24 - 2 * H0;

	/**
	 * Hours from noon until the sun has sunk `angle`° below the horizon (the
	 * mirror image before sunrise), or the high-latitude rule's estimate. Only
	 * Fajr and Isha are capped by the night-fraction rules, as in adhan.
	 */
	const twilight = (angle: number, capped: boolean): PrayerMoment | null => {
		const h = hourAngle(-angle, lat, decl);
		switch (cfg.highLat) {
			case 'none':
				return h === null ? null : { h, basis: 'sun' };
			case 'mwl45': {
				if (h !== null) return { h, basis: 'sun' };
				// The same fraction of the night as at 45° on this date.
				const H0r = hourAngle(HORIZON, refLat(lat), decl)!;
				const hr = hourAngle(-angle, refLat(lat), decl);
				const fraction = hr === null ? 0.5 : (hr - H0r) / (24 - 2 * H0r);
				return { h: H0 + fraction * night, basis: 'rule' };
			}
			default: {
				const portion =
					cfg.highLat === 'middle' ? 1 / 2 : cfg.highLat === 'seventh' ? 1 / 7 : angle / 60;
				const cap = H0 + portion * night;
				if (h !== null && (!capped || Math.abs(lat) <= HIGH_LAT || h <= cap)) {
					return { h, basis: 'sun' };
				}
				return { h: cap, basis: 'rule' };
			}
		}
	};

	const fajr = twilight(method.fajr, true);

	let isha: PrayerMoment | null;
	if ('angle' in method.isha) {
		isha = twilight(method.isha.angle, true);
	} else {
		const minutes = (sun.ramadan && method.isha.ramadanMinutes) || method.isha.minutes;
		isha = { h: H0 + minutes / 60, basis: 'sun' };
	}

	let maghrib: PrayerMoment | null = { h: H0, basis: 'sun' };
	if (method.maghrib !== undefined) {
		const m = twilight(method.maghrib, false);
		// As adhan does: back to sunset when the angle-based time would follow Isha.
		maghrib = m && isha && m.h >= isha.h ? { h: H0, basis: 'rule' } : m;
	}

	const asr = asrHourAngle(lat, sun, cfg);

	return {
		fajr: fajr && { h: -fajr.h, basis: fajr.basis },
		sunrise: { h: -H0, basis: 'sun' },
		dhuhr: { h: 0, basis: 'sun' },
		asr: asr === null ? null : { h: asr, basis: 'sun' },
		maghrib,
		isha
	};
}

/** Midnight sun or polar night, no estimation: only the signs that really occur. */
function signsOnly(lat: number, sun: SunContext, method: CalcMethod, cfg: PrayerConfig): DaySchedule {
	const up = sunUpAtNoon(lat, sun.decl);
	const at = (h: number | null, sign = 1): PrayerMoment | null =>
		h === null ? null : { h: sign * h, basis: 'sun' };
	return {
		// In polar night the sky can still brighten to twilight around noon.
		fajr: at(hourAngle(-method.fajr, lat, sun.decl), -1),
		sunrise: null,
		dhuhr: up ? { h: 0, basis: 'sun' } : null,
		asr: up ? at(asrHourAngle(lat, sun, cfg)) : null,
		maghrib: null,
		isha: 'angle' in method.isha ? at(hourAngle(-method.isha.angle, lat, sun.decl)) : null
	};
}

function rawSchedule(lat: number, sun: SunContext, cfg: PrayerConfig): DaySchedule {
	const method = methodById(cfg.method);
	const H0 = hourAngle(HORIZON, lat, sun.decl);
	if (H0 !== null) return normalDay(lat, sun, H0, method, cfg);
	if (cfg.highLat === 'none') return signsOnly(lat, sun, method, cfg);

	// The sun neither rises nor sets: every time is estimated from 45°, at the
	// same longitude (Fiqh Council zone 3; Council of Senior Scholars res. 61).
	const ref = refLat(lat);
	const schedule = normalDay(ref, sun, hourAngle(HORIZON, ref, sun.decl)!, method, cfg);
	const up = sunUpAtNoon(lat, sun.decl);
	for (const key of PRAYER_KEYS) {
		const m = schedule[key];
		// Noon is still observable under the midnight sun.
		schedule[key] = m && { h: m.h, basis: key === 'dhuhr' && up ? 'sun' : 'ref45' };
	}
	return schedule;
}

/**
 * When each prayer begins, as the sun's hour angle, at latitude `lat` (degrees)
 * with the sun as described by `sun`.
 */
export function daySchedule(lat: number, sun: SunContext, cfg: PrayerConfig): DaySchedule {
	const schedule = rawSchedule(lat, sun, cfg);
	const offsets = methodById(cfg.method).offsets;
	if (!offsets) return schedule;
	for (const key of PRAYER_KEYS) {
		const m = schedule[key];
		if (m && offsets[key]) schedule[key] = { h: m.h + offsets[key] / 60, basis: m.basis };
	}
	return schedule;
}

// ---- Ramadan (Umm al-Qura's longer Isha interval) --------------------------------

let hijriMonth: Intl.DateTimeFormat | null | undefined;

/** Whether `date` falls in Ramadan on the Umm al-Qura calendar (Makkah date). */
export function isRamadan(date: Date): boolean {
	if (hijriMonth === undefined) {
		try {
			const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
				month: 'numeric',
				timeZone: 'Asia/Riyadh'
			});
			// Engines without the calendar silently fall back to Gregorian.
			hijriMonth = f.resolvedOptions().calendar === 'islamic-umalqura' ? f : null;
		} catch {
			hijriMonth = null;
		}
	}
	return hijriMonth?.format(date) === '9';
}

// ---- the map: where each prayer begins right now ---------------------------------

export interface PrayerLineSegment {
	basis: Basis;
	/**
	 * South-to-north points. Longitudes are continuous rather than wrapped, so
	 * a segment may run past ±180° — draw it shifted by ±360° as well.
	 */
	points: GeoPoint[];
}

export type PrayerLines = Record<PrayerKey, PrayerLineSegment[]>;

/** Base sampling step and the finest refinement, in degrees of latitude. */
const LAT_STEP = 1;
const MIN_LAT_STEP = LAT_STEP / 256;
/** Refine until neighbouring points are this close in longitude… */
const MAX_LON_STEP = 1.5;
/** …and treat anything still further apart at the finest step as a break. */
const BREAK_LON = 5;

/**
 * The isochrones of the reference map: for each prayer, the line of places
 * where it begins at instant `date`. Each latitude's own schedule places the
 * line at subsolar longitude + 15°·h.
 */
export function prayerLines(date: Date, cfg: PrayerConfig): PrayerLines {
	const subsolarLon = sunState(date).subsolar.lon;
	const sun = sunContext(date);
	const memo = new Map<number, DaySchedule>();
	const schedule = (lat: number) => {
		let s = memo.get(lat);
		if (!s) memo.set(lat, (s = daySchedule(lat, sun, cfg)));
		return s;
	};

	const lines = {} as PrayerLines;
	for (const key of PRAYER_KEYS) {
		lines[key] = traceLine((lat) => schedule(lat)[key], subsolarLon);
	}
	return lines;
}

function traceLine(at: (lat: number) => PrayerMoment | null, lon0: number): PrayerLineSegment[] {
	type Sample = { lat: number; m: PrayerMoment | null };
	const sample = (lat: number): Sample => ({ lat, m: at(lat) });
	const lon = (s: Sample) => lon0 + 15 * s.m!.h;
	const kind = (s: Sample) => s.m?.basis ?? null;

	const out: Sample[] = [];

	// Walk south to north, pinning down each latitude where the line appears,
	// vanishes or switches basis, and refining wherever it turns steep — as it
	// does approaching those latitudes. Pushes the samples strictly between a and b.
	const refine = (a: Sample, b: Sample) => {
		if (kind(a) !== kind(b)) {
			let lo = a;
			let hi = b;
			while (hi.lat - lo.lat > 1e-6) {
				const mid = sample((lo.lat + hi.lat) / 2);
				if (kind(mid) === kind(a)) lo = mid;
				else hi = mid;
			}
			if (lo !== a) {
				refine(a, lo);
				out.push(lo);
			}
			if (hi !== b) {
				out.push(hi);
				refine(hi, b);
			}
		} else if (a.m && Math.abs(lon(b) - lon(a)) > MAX_LON_STEP && b.lat - a.lat > MIN_LAT_STEP) {
			const mid = sample((a.lat + b.lat) / 2);
			refine(a, mid);
			out.push(mid);
			refine(mid, b);
		}
	};

	let prev = sample(-90);
	out.push(prev);
	for (let lat = -90 + LAT_STEP; lat <= 90; lat += LAT_STEP) {
		const next = sample(lat);
		refine(prev, next);
		out.push(next);
		prev = next;
	}

	const segments: PrayerLineSegment[] = [];
	let seg: PrayerLineSegment | null = null;
	let last: Sample | null = null;
	for (const s of out) {
		const brk =
			!s.m ||
			!seg ||
			!last ||
			seg.basis !== s.m.basis ||
			Math.abs(lon(s) - lon(last)) > BREAK_LON;
		if (brk) {
			if (seg && seg.points.length > 1) segments.push(seg);
			seg = s.m ? { basis: s.m.basis, points: [] } : null;
		}
		if (seg && s.m) seg.points.push({ lat: s.lat, lon: lon(s) });
		last = s;
	}
	if (seg && seg.points.length > 1) segments.push(seg);
	return segments;
}

// ---- a place: today's timetable ----------------------------------------------------

export interface PrayerTime {
	time: Date;
	basis: Basis;
}

export type DayTimes = Record<PrayerKey, PrayerTime | null>;

/**
 * The instant prayer `key` begins at `place` near `guess` (ms): iterate until
 * the sun's hour angle there matches the schedule for that moment's declination
 * — the same condition that puts the place on the map's line.
 */
function solveTime(
	key: PrayerKey,
	place: GeoPoint,
	guess: number,
	cfg: PrayerConfig
): PrayerTime | null {
	let t = guess;
	let m: PrayerMoment | null = null;
	for (let i = 0; i < 6; i++) {
		const date = new Date(t);
		m = daySchedule(place.lat, sunContext(date), cfg)[key];
		if (!m) return null;
		const lha = wrapLon(place.lon - sunState(date).subsolar.lon);
		const step = wrapLon(15 * m.h - lha) / 15; // hours; the sun's hour angle turns 15°/h
		t += step * HOUR_MS;
		if (Math.abs(step) < 0.1 / 3600) break;
	}
	return m && { time: new Date(t), basis: m.basis };
}

/**
 * Number of the local mean-solar day at longitude `lon` that contains `at`:
 * days since 1970 on a clock running at that meridian's mean solar time.
 */
export function solarDay(lon: number, at: Date): number {
	return Math.floor((at.getTime() + (lon / 15) * HOUR_MS) / DAY_MS);
}

/**
 * Prayer times at `place` on its solar day number `day` (see `solarDay`) —
 * local mean midnight to midnight, so no time zone is needed.
 */
export function prayerTimes(place: GeoPoint, day: number, cfg: PrayerConfig): DayTimes {
	const noon = day * DAY_MS + DAY_MS / 2 - (place.lon / 15) * HOUR_MS;
	const noonDate = new Date(noon);
	// On the day a sign appears or vanishes it may occur in the night but not
	// with noon's declination, so look a quarter-day either side as well.
	const [first, ...around] = [0, -6, 6].map((h) =>
		daySchedule(place.lat, sunContext(new Date(noon + h * HOUR_MS)), cfg)
	);
	// Apparent noon differs from mean noon by the equation of time.
	const eot = wrapLon(place.lon - sunState(noonDate).subsolar.lon) / 15;

	const out = {} as DayTimes;
	for (const key of PRAYER_KEYS) {
		const m = first[key] ?? around[0][key] ?? around[1][key];
		out[key] = m ? solveTime(key, place, noon + (m.h - eot) * HOUR_MS, cfg) : null;
	}
	return out;
}

export interface PrayerEvent extends PrayerTime {
	key: PrayerKey;
}

export interface PrayerTimeline {
	/** The timetable for the requested day. */
	today: DayTimes;
	/** Every time from the day before through the day after, in order. */
	events: PrayerEvent[];
}

export function prayerTimeline(place: GeoPoint, day: number, cfg: PrayerConfig): PrayerTimeline {
	const events = (times: DayTimes): PrayerEvent[] =>
		PRAYER_KEYS.flatMap((key) => {
			const t = times[key];
			return t ? [{ key, ...t }] : [];
		});
	const today = prayerTimes(place, day, cfg);
	return {
		today,
		events: [
			...events(prayerTimes(place, day - 1, cfg)),
			...events(today),
			...events(prayerTimes(place, day + 1, cfg))
		].sort((a, b) => a.time.getTime() - b.time.getTime())
	};
}

/** The latest time that has begun by `now` (possibly yesterday's Isha) and the next one. */
export function currentAndNext(
	events: PrayerEvent[],
	now: Date
): { current: PrayerEvent | null; next: PrayerEvent | null } {
	const t = now.getTime();
	const i = events.findIndex((e) => e.time.getTime() > t);
	if (i === -1) return { current: events.at(-1) ?? null, next: null };
	return { current: events[i - 1] ?? null, next: events[i] };
}
