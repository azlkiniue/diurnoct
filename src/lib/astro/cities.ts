export interface City {
	name: string;
	lat: number;
	lon: number;
	/** IANA timezone id, used for local clocks. */
	tz: string;
}

/**
 * A compact, well-spread set of major cities. Kept short on purpose: enough to
 * read the globe at a glance without cluttering the wallpaper.
 */
export const CITIES: City[] = [
	{ name: 'San Francisco', lat: 37.77, lon: -122.42, tz: 'America/Los_Angeles' },
	{ name: 'New York', lat: 40.71, lon: -74.01, tz: 'America/New_York' },
	{ name: 'Bogotá', lat: 4.71, lon: -74.07, tz: 'America/Bogota' },
	{ name: 'São Paulo', lat: -23.55, lon: -46.63, tz: 'America/Sao_Paulo' },
	{ name: 'Reykjavík', lat: 64.15, lon: -21.94, tz: 'Atlantic/Reykjavik' },
	{ name: 'London', lat: 51.51, lon: -0.13, tz: 'Europe/London' },
	{ name: 'Lagos', lat: 6.52, lon: 3.38, tz: 'Africa/Lagos' },
	{ name: 'Paris', lat: 48.86, lon: 2.35, tz: 'Europe/Paris' },
	{ name: 'Cape Town', lat: -33.92, lon: 18.42, tz: 'Africa/Johannesburg' },
	{ name: 'Cairo', lat: 30.04, lon: 31.24, tz: 'Africa/Cairo' },
	{ name: 'Moscow', lat: 55.76, lon: 37.62, tz: 'Europe/Moscow' },
	{ name: 'Nairobi', lat: -1.29, lon: 36.82, tz: 'Africa/Nairobi' },
	{ name: 'Dubai', lat: 25.2, lon: 55.27, tz: 'Asia/Dubai' },
	{ name: 'Mumbai', lat: 19.08, lon: 72.88, tz: 'Asia/Kolkata' },
	{ name: 'Singapore', lat: 1.35, lon: 103.82, tz: 'Asia/Singapore' },
	{ name: 'Beijing', lat: 39.9, lon: 116.41, tz: 'Asia/Shanghai' },
	{ name: 'Tokyo', lat: 35.68, lon: 139.69, tz: 'Asia/Tokyo' },
	{ name: 'Jakarta', lat: -6.21, lon: 106.85, tz: 'Asia/Jakarta' },
	{ name: 'Sydney', lat: -33.87, lon: 151.21, tz: 'Australia/Sydney' },
	{ name: 'Auckland', lat: -36.85, lon: 174.76, tz: 'Pacific/Auckland' },
	{ name: 'Honolulu', lat: 21.31, lon: -157.86, tz: 'Pacific/Honolulu' },
	{ name: 'Anchorage', lat: 61.22, lon: -149.9, tz: 'America/Anchorage' }
];

/** The Kaaba, which every prayer faces; marked on the prayer-times map. */
export const MAKKAH: City = { name: 'Makkah', lat: 21.4225, lon: 39.8262, tz: 'Asia/Riyadh' };

/** Cities shown as extra clocks when the "city clocks" layer is on. */
const CLOCK_CITY_NAMES = [
	'San Francisco',
	'New York',
	'London',
	'Paris',
	'Dubai',
	'Singapore',
	'Tokyo',
	'Sydney'
];

export const CLOCK_CITIES: City[] = CLOCK_CITY_NAMES.map(
	(name) => CITIES.find((c) => c.name === name)!
).filter(Boolean);
