<script lang="ts">
	import {
		MOON_EVENT_KINDS,
		MOON_EVENT_NAMES,
		type MoonEvent,
		type MoonTimeline
	} from '$lib/astro/moon';
	import type { MoonPhase } from '$lib/astro/lunar';
	import type { Place } from '$lib/stores/settings.svelte';
	import { formatLatLon, formatTime, tzAbbrev } from '$lib/time';

	interface Props {
		place: Place | null;
		timeline: MoonTimeline | null;
		/** The moon above the horizon at `now`. */
		up: boolean;
		/** Its next rise or set. */
		next: MoonEvent | null;
		phase: MoonPhase;
		now: Date;
		locating: boolean;
		locateError: string;
		onlocate: () => void;
		onclear: () => void;
	}

	let { place, timeline, up, next, phase, now, locating, locateError, onlocate, onclear }: Props =
		$props();

	/** To the nearest minute. */
	const shown = (time: Date) => new Date(Math.round(time.getTime() / 60_000) * 60_000);

	function countdown(to: Date): string {
		const min = Math.floor((to.getTime() - now.getTime()) / 60_000);
		if (min < 1) return 'under a minute';
		const h = Math.floor(min / 60);
		const m = min % 60;
		return h ? `${h} h ${m} min` : `${m} min`;
	}

	/** Why a time is missing today: it's normal, not a fault. */
	const notes = $derived.by(() => {
		if (!timeline) return [];
		if (timeline.allDay === 'down') return ['Moon down all day'];
		const { today, allDay } = timeline;
		// Up all day, it may still cross the meridian only just before or after it.
		return [
			allDay ? 'Moon up all day' : today.moonrise ? '' : 'No moonrise today',
			today.transit ? '' : 'No transit today',
			allDay || today.moonset ? '' : 'No moonset today'
		].filter(Boolean);
	});
</script>

<div class="panel w-60 rounded-xl px-3 py-2.5 text-xs">
	{#if place && timeline}
		<div class="flex items-start justify-between gap-2">
			<div class="min-w-0">
				<div class="truncate text-sm font-medium text-[var(--color-ink)]">
					{place.name || 'Pinned place'}
				</div>
				<div class="tnum text-[11px] text-[var(--color-ink-dim)]">
					{place.approx ? 'from your time zone' : formatLatLon(place, 2)}
				</div>
			</div>
			<div class="flex shrink-0 gap-0.5">
				<button
					type="button"
					class="ic"
					aria-label="Use my location"
					title="Use my location"
					disabled={locating}
					onclick={onlocate}
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
						<circle cx="12" cy="12" r="7" />
						<circle cx="12" cy="12" r="2" fill="currentColor" />
						<path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
					</svg>
				</button>
				<button type="button" class="ic" aria-label="Remove place" title="Remove place" onclick={onclear}>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
						<path d="M18 6 6 18M6 6l12 12" />
					</svg>
				</button>
			</div>
		</div>

		<div class="mt-2 text-[var(--color-ink)]">
			<span class="font-semibold">{up ? 'Moon up' : 'Moon down'}</span>
			{#if next}
				·
				<span style={`color: var(--color-${next.kind})`}>{next.kind === 'moonrise' ? 'rises' : 'sets'}</span>
				in <span class="tnum">{countdown(next.time)}</span>
			{/if}
		</div>

		<ul class="mt-2 space-y-0.5 border-t border-white/10 pt-2">
			{#each MOON_EVENT_KINDS as kind (kind)}
				{@const t = timeline.today[kind]}
				<li class="flex items-center gap-2 px-1.5 py-0.5">
					<span
						class="h-3 w-[3px] shrink-0 rounded-full"
						style={`background: var(--color-${kind})`}
						aria-hidden="true"
					></span>
					<span class="flex-1 text-[var(--color-ink)]">{MOON_EVENT_NAMES[kind]}</span>
					<span class="tnum w-10 text-right font-medium text-[var(--color-ink)]">
						{t ? formatTime(shown(t), place.tz, false) : '—'}
					</span>
				</li>
			{/each}
		</ul>
		{#if notes.length}
			<p class="mt-1 px-1.5 text-[11px] text-[var(--color-dusk)]">{notes.join(' · ')}</p>
		{/if}

		<div class="mt-2 border-t border-white/10 pt-2 text-[var(--color-ink)]">
			{phase.emoji} {phase.name}
			<span class="tnum text-[var(--color-ink-dim)]">· {Math.round(phase.illumination * 100)}% lit</span>
		</div>

		<div class="mt-2 text-[10px] text-[var(--color-ink-dim)]">
			{place.tz ? 'Local time' : 'In your time zone'} ({tzAbbrev(now, place.tz)})
		</div>
	{:else}
		<div class="text-sm font-medium text-[var(--color-ink)]">Moon times for a place</div>
		<p class="mt-1 text-[var(--color-ink-dim)]">Click anywhere on the map, or</p>
		<button
			type="button"
			class="mt-2 flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-[var(--color-ink)] transition hover:bg-white/10 disabled:opacity-50"
			disabled={locating}
			onclick={onlocate}
		>
			<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
				<circle cx="12" cy="12" r="7" />
				<circle cx="12" cy="12" r="2" fill="currentColor" />
				<path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
			</svg>
			{locating ? 'Locating…' : 'Use my location'}
		</button>
	{/if}

	{#if locateError}
		<p class="mt-2 text-[11px] text-[var(--color-dusk)]">{locateError}</p>
	{/if}
</div>

<style>
	.ic {
		display: grid;
		place-items: center;
		width: 1.6rem;
		height: 1.6rem;
		border-radius: 0.5rem;
		color: var(--color-ink-dim);
		transition: all 0.15s ease;
	}
	.ic:hover:not(:disabled) {
		color: var(--color-ink);
		background: color-mix(in oklab, white 10%, transparent);
	}
	.ic:disabled {
		opacity: 0.5;
	}
</style>
