<script lang="ts">
	import { terminatorLatitude, type GeoPoint } from '$lib/astro/solar';
	import { CITIES } from '$lib/astro/cities';
	import { isDaylight } from '$lib/time';
	import { project, type Rect } from '$lib/map/projection';
	import type { Layers } from '$lib/stores/settings.svelte';

	interface Props {
		rect: Rect;
		width: number;
		height: number;
		sun: GeoPoint;
		moon: GeoPoint;
		declination: number;
		now: Date;
		layers: Layers;
		scale: number;
	}

	let { rect, width, height, sun, moon, declination, now, layers, scale }: Props = $props();

	const meridians = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150, 180, -180];
	const parallels = [-60, -30, 0, 30, 60];
	const specials = [23.44, -23.44, 66.56, -66.56]; // tropics & polar circles

	const terminatorPath = $derived.by(() => {
		let d = '';
		for (let lon = -180; lon <= 180; lon += 1.5) {
			const lat = terminatorLatitude(lon, sun.lon, declination);
			const p = project(lat, lon, rect);
			d += `${lon === -180 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)} `;
		}
		return d;
	});

	const sunPos = $derived(project(sun.lat, sun.lon, rect));
	const moonPos = $derived(project(moon.lat, moon.lon, rect));

	const cityPts = $derived(
		CITIES.map((c) => ({
			city: c,
			...project(c.lat, c.lon, rect),
			day: isDaylight(c, now)
		}))
	);

	const r = (n: number) => (n * scale).toFixed(2);
</script>

<svg
	class="pointer-events-none absolute inset-0"
	{width}
	{height}
	viewBox={`0 0 ${width} ${height}`}
	fill="none"
>
	<defs>
		<radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
			<stop offset="0%" stop-color="var(--color-sun)" stop-opacity="0.95" />
			<stop offset="45%" stop-color="var(--color-sun)" stop-opacity="0.5" />
			<stop offset="100%" stop-color="var(--color-sun)" stop-opacity="0" />
		</radialGradient>
	</defs>

	{#if layers.graticule}
		<g stroke="var(--color-ink)" stroke-width="1" opacity="0.12">
			{#each meridians as lon (lon)}
				{@const a = project(85, lon, rect)}
				{@const b = project(-85, lon, rect)}
				<line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
			{/each}
			{#each parallels as lat (lat)}
				{@const a = project(lat, -180, rect)}
				{@const b = project(lat, 180, rect)}
				<line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
			{/each}
		</g>
		<g stroke="var(--color-ink)" stroke-width="1" stroke-dasharray="2 5" opacity="0.1">
			{#each specials as lat (lat)}
				{@const a = project(lat, -180, rect)}
				{@const b = project(lat, 180, rect)}
				<line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
			{/each}
		</g>
		<!-- Equator, slightly stronger -->
		{@const eqA = project(0, -180, rect)}
		{@const eqB = project(0, 180, rect)}
		<line x1={eqA.x} y1={eqA.y} x2={eqB.x} y2={eqB.y} stroke="var(--color-ink)" opacity="0.2" />
	{/if}

	{#if layers.terminatorLine}
		<path
			d={terminatorPath}
			stroke="var(--color-dusk)"
			stroke-width={r(1.6)}
			opacity="0.9"
			stroke-linejoin="round"
		/>
		<path d={terminatorPath} stroke="var(--color-dusk)" stroke-width={r(5)} opacity="0.15" />
	{/if}

	{#if layers.cities}
		<g>
			{#each cityPts as p (p.city.name)}
				<circle
					cx={p.x}
					cy={p.y}
					r={r(2.4)}
					fill={p.day ? 'var(--color-sun)' : 'var(--color-moon)'}
					opacity={p.day ? 0.95 : 0.7}
					stroke="var(--color-space)"
					stroke-width="0.6"
				/>
				{#if layers.cityLabels}
					<text
						x={p.x + Number(r(5))}
						y={p.y + Number(r(3.5))}
						font-size={r(10.5)}
						fill="var(--color-ink)"
						opacity="0.75"
						style="paint-order: stroke; stroke: var(--color-space); stroke-width: 2.5px;"
					>
						{p.city.name}
					</text>
				{/if}
			{/each}
		</g>
	{/if}

	{#if layers.sublunar}
		<g opacity="0.95">
			<circle cx={moonPos.x} cy={moonPos.y} r={r(7)} fill="var(--color-moon)" opacity="0.12" />
			<circle
				cx={moonPos.x}
				cy={moonPos.y}
				r={r(4.5)}
				fill="none"
				stroke="var(--color-moon)"
				stroke-width={r(1.6)}
			/>
			<circle cx={moonPos.x} cy={moonPos.y} r={r(1.4)} fill="var(--color-moon)" />
		</g>
	{/if}

	{#if layers.subsolar}
		<g>
			<circle cx={sunPos.x} cy={sunPos.y} r={r(16)} fill="url(#sunGlow)" />
			<circle cx={sunPos.x} cy={sunPos.y} r={r(4.5)} fill="var(--color-sun)" />
			<circle
				cx={sunPos.x}
				cy={sunPos.y}
				r={r(7)}
				fill="none"
				stroke="var(--color-sun)"
				stroke-width={r(1.2)}
				opacity="0.8"
			/>
		</g>
	{/if}
</svg>
