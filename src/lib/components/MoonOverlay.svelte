<script lang="ts">
	import type { GeoPoint } from '$lib/astro/solar';
	import {
		MOON_EVENT_KINDS,
		MOON_EVENT_NAMES,
		type MoonEventKind,
		type MoonLines
	} from '$lib/astro/moon';
	import { linePath, type Rect } from '$lib/map/projection';
	import LineOverlay from './LineOverlay.svelte';

	interface Props {
		rect: Rect;
		width: number;
		height: number;
		lines: MoonLines;
		/** Latitude of the point under the moon, to keep the transit label clear of its marker. */
		moonLat: number;
		labels: boolean;
		/** The pinned place, marked on the map. */
		place: GeoPoint | null;
		scale: number;
	}

	let { rect, width, height, lines, moonLat, labels, place, scale }: Props = $props();

	const strokes = $derived(
		MOON_EVENT_KINDS.flatMap((kind) =>
			lines[kind].map((points) => ({ points, color: `var(--color-${kind})` }))
		)
	);
	const area = (rings: GeoPoint[][]) => rings.map((ring) => `${linePath(ring, rect)}Z`);
	const moonlit = $derived(area(lines.moonlit));
	const moonByDay = $derived(area(lines.moonByDay));
	// Faint near new moon, clearest at full. By day sunlight swamps the moon's,
	// so there it's a faint haze at any phase, just marking where it's up.
	const moonlitOpacity = $derived(0.29 * lines.illumination);
	const BY_DAY_OPACITY = 0.17;

	// Labels sit where each line crosses a chosen latitude; the transit line's
	// goes in the hemisphere away from the moon marker.
	function labelAt(kind: MoonEventKind) {
		const target = kind === 'transit' ? (moonLat > 0 ? -38 : 38) : 8;
		let best: GeoPoint | null = null;
		for (const line of lines[kind]) {
			for (const p of line) {
				if (!best || Math.abs(p.lat - target) < Math.abs(best.lat - target)) best = p;
			}
		}
		return best && { text: MOON_EVENT_NAMES[kind], color: `var(--color-${kind})`, at: best };
	}

	const labelPts = $derived(
		labels ? MOON_EVENT_KINDS.map(labelAt).filter((l) => l !== null) : []
	);
</script>

<LineOverlay {rect} {width} {height} lines={strokes} labels={labelPts} {place} {scale}>
	{#snippet under()}
		<!-- The moonlit night: the moon up and the sun down. -->
		{#each moonlit as d, i (i)}
			<path {d} fill="var(--color-moon)" fill-opacity={moonlitOpacity} />
		{/each}
		<!-- The moon up by day. -->
		{#each moonByDay as d, i (i)}
			<path {d} fill="var(--color-moon)" fill-opacity={BY_DAY_OPACITY} />
		{/each}
	{/snippet}
</LineOverlay>
