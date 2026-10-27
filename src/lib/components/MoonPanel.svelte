<script lang="ts">
	import {
		MOON_EVENT_KINDS,
		MOON_EVENT_NAMES,
		type MoonEvent,
		type MoonTimeline
	} from '$lib/astro/moon';
	import type { MoonPhase, NextPhases } from '$lib/astro/lunar';
	import type { PlacePicker } from '$lib/map/place.svelte';
	import { formatCountdown, formatDayMonth, formatTime, tzAbbrev } from '$lib/time';
	import PlacePanel from './PlacePanel.svelte';

	interface Props {
		/** For the picker's place; null while none is pinned. */
		timeline: MoonTimeline | null;
		/** The moon above the horizon at `now`. */
		up: boolean;
		/** Its next rise or set. */
		next: MoonEvent | null;
		phase: MoonPhase;
		phases: NextPhases;
		now: Date;
		picker: PlacePicker;
	}

	let { timeline, up, next, phase, phases, now, picker }: Props = $props();

	/** The place's time zone when known, else the viewer's. */
	const tz = $derived(picker.place?.tz);

	/** The sooner first. */
	const upcoming = $derived(
		[
			{ name: 'New moon', emoji: '🌑', time: phases.newMoon },
			{ name: 'Full moon', emoji: '🌕', time: phases.fullMoon }
		].sort((a, b) => a.time.getTime() - b.time.getTime())
	);

	/** To the nearest minute. */
	const shown = (time: Date) => new Date(Math.round(time.getTime() / 60_000) * 60_000);

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

<PlacePanel subject="Moon times" {picker}>
	{#if timeline}
		<div class="mt-2 text-[var(--color-ink)]">
			<span class="font-semibold">{up ? 'Moon up' : 'Moon down'}</span>
			{#if next}
				·
				<span style={`color: var(--color-${next.kind})`}>{next.kind === 'moonrise' ? 'rises' : 'sets'}</span>
				in <span class="tnum">{formatCountdown(now, next.time)}</span>
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
						{t ? formatTime(shown(t), tz, false) : '—'}
					</span>
				</li>
			{/each}
		</ul>
		{#if notes.length}
			<p class="mt-1 px-1.5 text-[11px] text-[var(--color-dusk)]">{notes.join(' · ')}</p>
		{/if}
	{/if}

	<!-- The phase and the next new and full moon hold for any place. -->
	{#snippet footer()}
		<div class="mt-2 border-t border-white/10 pt-2 text-[var(--color-ink)]">
			{phase.emoji} {phase.name}
			<span class="tnum text-[var(--color-ink-dim)]">· {Math.round(phase.illumination * 100)}% lit</span>
		</div>
		<ul class="mt-1 space-y-0.5 text-[11px]">
			{#each upcoming as p (p.name)}
				<li class="flex justify-between gap-2">
					<span class="text-[var(--color-ink-dim)]">{p.emoji} {p.name}</span>
					<span class="tnum text-[var(--color-ink)]">
						{formatDayMonth(p.time, tz)}, {formatTime(shown(p.time), tz, false)}
					</span>
				</li>
			{/each}
		</ul>

		<div class="mt-2 text-[10px] text-[var(--color-ink-dim)]">
			{tz ? 'Local time' : 'In your time zone'} ({tzAbbrev(now, tz)})
		</div>
	{/snippet}
</PlacePanel>
