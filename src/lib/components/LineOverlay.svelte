<script lang="ts">
	import type { Snippet } from 'svelte';
	import { wrapLon, type GeoPoint } from '$lib/astro/solar';
	import { LINE_HALO, LINE_STROKE } from '$lib/map/lines';
	import { linePath, project, type Rect } from '$lib/map/projection';

	interface Props {
		rect: Rect;
		width: number;
		height: number;
		/** Each in its CSS colour, dashed when `dash` is set. Longitudes may run past ±180°. */
		lines: { points: GeoPoint[]; color: string; dash?: string }[];
		/** Each beside its point, which may be on a line past ±180°. */
		labels: { text: string; color: string; at: GeoPoint }[];
		/** The pinned place, marked on the map. */
		place: GeoPoint | null;
		scale: number;
		/** Drawn under the lines, in every copy of the world. */
		under?: Snippet;
		/** Marks drawn over the lines and labels, under the pin. */
		children?: Snippet;
	}

	let { rect, width, height, lines, labels, place, scale, under, children }: Props = $props();

	const uid = $props.id();
	const r = (n: number) => n * scale;

	/**
	 * Each line has the terminator line's look ($lib/map/lines) in its own
	 * colour: a thin stroke with a soft halo, drawn halo first. Opacity applies
	 * to each path as a whole, so where a line's dash ends overlap they're no
	 * darker. The halo keeps its stroke's dashes, and its round ends close the
	 * gaps: dashed parts glow as touching pills, dotted parts as touching beads.
	 */
	const STROKES = [LINE_HALO, LINE_STROKE];

	// Longitudes are unwrapped, so paths run off the map's edges; the markup draws
	// each one again a world to the left and right, clipped to the map.
	const paths = $derived(lines.map((l) => ({ ...l, d: linePath(l.points, rect) })));

	const placed = $derived(
		labels.map(({ text, color, at }) => {
			const p = project(at.lat, wrapLon(at.lon), rect);
			// Flip to the point's left when the label would run off the map.
			const flip = p.x + r(6 + 7 * text.length) > rect.left + rect.width;
			return { text, color, x: p.x + (flip ? -r(6) : r(6)), y: p.y - r(4), flip };
		})
	);

	const pin = $derived(place ? project(place.lat, place.lon, rect) : null);
</script>

<svg
	class="pointer-events-none absolute inset-0"
	{width}
	{height}
	viewBox={`0 0 ${width} ${height}`}
	fill="none"
>
	<defs>
		<clipPath id={`map-${uid}`}>
			<rect x={rect.left} y={rect.top} width={rect.width} height={rect.height} />
		</clipPath>
	</defs>

	<g clip-path={`url(#map-${uid})`} stroke-linecap="round" stroke-linejoin="round">
		<!-- The `under` marks (the Moon view's fills) go first, in every copy of
		     the world, so they lie below every line in every copy. Then every
		     halo, then every stroke, each in every copy before the next, so no
		     halo tints a stroke, even where lines from neighbouring copies meet,
		     as the moonrise and moonset lines do at one end. -->
		{#each [-1, 0, 1] as shift (shift)}
			<g transform={`translate(${shift * rect.width} 0)`}>{@render under?.()}</g>
		{/each}
		{#each STROKES as s, k (k)}
			{#each [-1, 0, 1] as shift (shift)}
				<g transform={`translate(${shift * rect.width} 0)`}>
					{#each paths as p, i (i)}
						<path
							d={p.d}
							stroke={p.color}
							stroke-width={r(s.width)}
							stroke-dasharray={p.dash}
							opacity={s.opacity}
						/>
					{/each}
				</g>
			{/each}
		{/each}
	</g>

	{#if placed.length}
		<g
			font-size={r(11)}
			font-weight="600"
			style={`paint-order: stroke; stroke: var(--color-space); stroke-width: ${r(3)}px; stroke-linejoin: round;`}
		>
			{#each placed as l, i (i)}
				<text x={l.x} y={l.y} fill={l.color} text-anchor={l.flip ? 'end' : 'start'}>{l.text}</text>
			{/each}
		</g>
	{/if}

	{@render children?.()}

	{#if pin}
		<g>
			<circle cx={pin.x} cy={pin.y} r={r(9)} fill="var(--color-ink)" opacity="0.15" />
			<circle
				cx={pin.x}
				cy={pin.y}
				r={r(4)}
				fill="var(--color-ink)"
				stroke="var(--color-space)"
				stroke-width={r(1.5)}
			/>
		</g>
	{/if}
</svg>
