<script lang="ts">
	import { APP_NAME, APP_TAGLINE } from '$lib/config';
	import Logo from './Logo.svelte';
	import type { GeoPoint } from '$lib/astro/solar';
	import type { MoonPhase } from '$lib/astro/lunar';
	import { CLOCK_CITIES } from '$lib/astro/cities';
	import type { Layers } from '$lib/stores/settings.svelte';
	import {
		formatDate,
		formatLatLon,
		formatTime,
		formatUTC,
		localTimeZone,
		tzAbbrev
	} from '$lib/time';

	interface Props {
		layers: Layers;
		time: Date;
		sun: GeoPoint;
		moon: GeoPoint;
		phase: MoonPhase;
		cursor: GeoPoint | null;
		scale: number;
		customTime: boolean;
	}

	let { layers, time, sun, moon, phase, cursor, scale, customTime }: Props = $props();

	const tz = localTimeZone();
	const localLabel = $derived(`${tz.split('/').pop()?.replace('_', ' ') ?? tz} · ${tzAbbrev(time)}`);
</script>

<!-- Title — top-left -->
{#if layers.title}
	<div
		class="absolute top-0 left-0 p-5 sm:p-7"
		style={`transform: scale(${scale}); transform-origin: top left;`}
	>
		<div class="flex items-center gap-2.5">
			<Logo size={22} class="shrink-0" />
			<h1 class="text-xl font-semibold tracking-tight lowercase sm:text-2xl">{APP_NAME}</h1>
		</div>
		<p class="text-ink-dim mt-1 text-xs sm:text-sm">{APP_TAGLINE}</p>
	</div>
{/if}

<!-- Clocks & date — top-right -->
{#if layers.clock || layers.localClock || layers.date}
	<div
		class="absolute top-0 right-0 p-5 text-right sm:p-7"
		style={`transform: scale(${scale}); transform-origin: top right;`}
	>
		{#if customTime}
			<div
				class="mb-2 inline-block rounded-full border border-[var(--color-dusk)]/40 px-2 py-0.5 text-[10px] tracking-wide text-[var(--color-dusk)] uppercase"
			>
				Custom time
			</div>
		{/if}
		{#if layers.clock}
			<div class="tnum text-3xl leading-none font-semibold sm:text-4xl">{formatUTC(time)}</div>
			<div class="text-ink-dim mt-1 text-[11px] tracking-widest uppercase">UTC</div>
		{/if}
		{#if layers.localClock}
			<div class="tnum mt-3 text-lg font-medium sm:text-xl">{formatTime(time)}</div>
			<div class="text-ink-dim text-[11px] tracking-wide">{localLabel}</div>
		{/if}
		{#if layers.date}
			<div class="text-ink-dim mt-3 text-sm">{formatDate(time)}</div>
		{/if}
	</div>
{/if}

<!-- City clocks — bottom strip -->
{#if layers.cityClocks}
	<div
		class="absolute right-0 bottom-0 left-0 flex justify-center px-4 pb-5 sm:pb-7"
		style={`transform: scale(${scale}); transform-origin: bottom center;`}
	>
		<div class="panel flex flex-wrap justify-center gap-x-5 gap-y-2 rounded-xl px-4 py-2.5">
			{#each CLOCK_CITIES as c (c.name)}
				<div class="text-center">
					<div class="tnum text-sm font-medium">{formatTime(time, c.tz, false)}</div>
					<div class="text-ink-dim text-[10px] tracking-wide">{c.name}</div>
				</div>
			{/each}
		</div>
	</div>
{/if}

<!-- Sun & moon — bottom-right -->
{#if layers.subsolar || layers.sublunar}
	<div
		class="absolute right-0 bottom-0 p-5 text-right sm:p-7"
		class:pb-20={layers.cityClocks}
		style={`transform: scale(${scale}); transform-origin: bottom right;`}
	>
		<div class="space-y-2.5">
			{#if layers.subsolar}
				<div class="flex items-center justify-end gap-2">
					<div>
						<div class="text-sm font-medium">Subsolar point</div>
						<div class="text-ink-dim tnum text-xs">{formatLatLon(sun)}</div>
					</div>
					<span class="inline-block h-2.5 w-2.5 rounded-full bg-[var(--color-sun)]"></span>
				</div>
			{/if}
			{#if layers.sublunar}
				<div class="flex items-center justify-end gap-2">
					<div>
						<div class="text-sm font-medium">{phase.emoji} {phase.name}</div>
						<div class="text-ink-dim tnum text-xs">
							{formatLatLon(moon)} · {Math.round(phase.illumination * 100)}% lit
						</div>
					</div>
					<span
						class="inline-block h-2.5 w-2.5 rounded-full border border-[var(--color-moon)]"
					></span>
				</div>
			{/if}
		</div>
	</div>
{/if}

<!-- Legend & cursor coordinates — bottom-left -->
{#if layers.legend || (layers.coordinates && cursor)}
	<div
		class="absolute bottom-0 left-0 p-5 sm:p-7"
		class:pb-20={layers.cityClocks}
		style={`transform: scale(${scale}); transform-origin: bottom left;`}
	>
		{#if layers.coordinates && cursor}
			<div class="tnum text-ink-dim mb-2 text-xs">{formatLatLon(cursor, 2)}</div>
		{/if}
		{#if layers.legend}
			<div class="text-ink-dim flex flex-col gap-1.5 text-xs">
				<div class="flex items-center gap-2">
					<span class="h-2 w-4 rounded-sm bg-[var(--color-day)]"></span> Daylight
				</div>
				<div class="flex items-center gap-2">
					<span class="h-2 w-4 rounded-sm bg-[var(--color-sun)]/70"></span> Night · city lights
				</div>
				<div class="flex items-center gap-2">
					<span class="h-0.5 w-4 rounded-sm bg-[var(--color-dusk)]"></span> Terminator
				</div>
			</div>
		{/if}
	</div>
{/if}
