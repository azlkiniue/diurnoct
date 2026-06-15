<script lang="ts">
	import { onMount } from 'svelte';
	import type { GeoPoint } from '$lib/astro/solar';
	import type { ResolvedSources } from '$lib/config';
	import { DayNightRenderer, type RenderParams } from '$lib/map/renderer';

	interface Props {
		sun: GeoPoint;
		params: RenderParams;
		sources: ResolvedSources;
		width: number;
		height: number;
		/** Fired once both textures have loaded (or definitively failed). */
		onready?: () => void;
	}

	let { sun, params, sources, width, height, onready }: Props = $props();

	let canvas: HTMLCanvasElement;
	let renderer: DayNightRenderer | null = null;
	let failed = $state(false);
	let appliedKey = '';

	onMount(() => {
		const r = new DayNightRenderer(canvas);
		renderer = r;
		if (!r.ok) {
			failed = true;
			onready?.(); // don't hang the loading screen when WebGL is unavailable
			return;
		}
		r.onReady = () => onready?.();
		r.resize(width, height, window.devicePixelRatio || 1);
		r.setSun(sun);
		r.setParams(params);
		appliedKey = JSON.stringify(sources);
		r.setTextureSources(sources.day, sources.night);
		r.render();
		return () => {
			r.dispose();
			renderer = null;
		};
	});

	// Texture source changes after mount (e.g. Auto / CDN / Custom switch).
	$effect(() => {
		const key = JSON.stringify(sources);
		if (renderer?.ok && key !== appliedKey) {
			appliedKey = key;
			renderer.setTextureSources(sources.day, sources.night);
		}
	});

	// Viewport size / fit changes.
	$effect(() => {
		const w = width;
		const h = height;
		if (renderer?.ok && w > 0 && h > 0) {
			renderer.resize(w, h, window.devicePixelRatio || 1);
			renderer.render();
		}
	});

	// Sun position (ticks each second) + render params.
	$effect(() => {
		const s = sun;
		const p = params;
		if (renderer?.ok) {
			renderer.setSun(s);
			renderer.setParams(p);
			renderer.render();
		}
	});
</script>

<canvas bind:this={canvas} class="block h-full w-full" class:hidden={failed}></canvas>

{#if failed}
	<div class="absolute inset-0 grid place-items-center p-8 text-center">
		<div class="panel max-w-sm rounded-2xl p-6">
			<p class="text-ink text-base font-medium">WebGL isn't available</p>
			<p class="text-ink-dim mt-2 text-sm">
				diurnoct renders the day/night map with WebGL. Try a different browser, or enable
				hardware acceleration.
			</p>
		</div>
	</div>
{/if}
