/** Time formatting helpers built on Intl, plus day/night sampling utilities. */

import { geoToVec3, subsolarPoint, type GeoPoint } from './astro/solar';

export type TimeMode = 'live' | 'custom';

export interface TimeSettings {
	mode: TimeMode;
	/** ISO instant used when `mode === 'custom'`. */
	customISO: string;
}

/** Resolve the instant the whole app should render for. */
export function effectiveTime(now: Date, t: TimeSettings): Date {
	if (t.mode === 'custom' && t.customISO) {
		const d = new Date(t.customISO);
		if (!Number.isNaN(d.getTime())) return d;
	}
	return now;
}

const cache = new Map<string, Intl.DateTimeFormat>();
function fmt(key: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
	let f = cache.get(key);
	if (!f) {
		f = new Intl.DateTimeFormat('en-GB', opts);
		cache.set(key, f);
	}
	return f;
}

export function formatTime(date: Date, tz?: string, withSeconds = true): string {
	return fmt(`t:${tz ?? 'local'}:${withSeconds}`, {
		timeZone: tz,
		hour: '2-digit',
		minute: '2-digit',
		...(withSeconds ? { second: '2-digit' } : {}),
		hour12: false
	}).format(date);
}

export function formatDate(date: Date, tz?: string): string {
	return fmt(`d:${tz ?? 'local'}`, {
		timeZone: tz,
		weekday: 'short',
		day: '2-digit',
		month: 'short',
		year: 'numeric'
	}).format(date);
}

/** Weekday, day and month, e.g. "Tue 10 Nov". */
export function formatDayMonth(date: Date, tz?: string): string {
	return fmt(`dm:${tz ?? 'local'}`, {
		timeZone: tz,
		weekday: 'short',
		day: 'numeric',
		month: 'short'
	}).format(date);
}

/** How long from `now` until `to`, in whole minutes, e.g. "2 h 5 min". */
export function formatCountdown(now: Date, to: Date): string {
	const min = Math.floor((to.getTime() - now.getTime()) / 60_000);
	if (min < 1) return 'under a minute';
	const h = Math.floor(min / 60);
	const m = min % 60;
	return h ? `${h} h ${m} min` : `${m} min`;
}

export function formatUTC(date: Date, withSeconds = true): string {
	return formatTime(date, 'UTC', withSeconds);
}

/** Browser's resolved timezone, e.g. "Asia/Jakarta". */
export function localTimeZone(): string {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
	} catch {
		return 'UTC';
	}
}

/** Short timezone abbreviation, e.g. "GMT+7" / "PDT". */
export function tzAbbrev(date: Date, tz?: string): string {
	try {
		const parts = new Intl.DateTimeFormat('en-US', {
			timeZone: tz,
			hour: '2-digit',
			timeZoneName: 'short'
		}).formatToParts(date);
		return parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
	} catch {
		return '';
	}
}

export function formatLatLon({ lat, lon }: GeoPoint, decimals = 1): string {
	const ns = lat >= 0 ? 'N' : 'S';
	const ew = lon >= 0 ? 'E' : 'W';
	return `${Math.abs(lat).toFixed(decimals)}°${ns}, ${Math.abs(lon).toFixed(decimals)}°${ew}`;
}

/**
 * Is a given point currently sunlit? Uses the dot product between the surface
 * normal and the sun direction (sun above the geometric horizon => daytime).
 */
export function isDaylight(point: GeoPoint, date: Date): boolean {
	const sun = geoToVec3(subsolarPoint(date));
	const p = geoToVec3(point);
	return p[0] * sun[0] + p[1] * sun[1] + p[2] * sun[2] > 0;
}
