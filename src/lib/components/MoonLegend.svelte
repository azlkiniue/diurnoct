<script lang="ts">
	import { MOON_EVENT_KINDS, MOON_EVENT_NAMES, type MoonEventKind } from '$lib/astro/moon';
	import type { MoonPhase } from '$lib/astro/lunar';

	interface Props {
		phase: MoonPhase;
	}

	let { phase }: Props = $props();

	const MEANING: Record<MoonEventKind, string> = {
		moonrise: 'top of the moon on the horizon, rising',
		transit: 'the moon crosses the meridian, at its highest',
		moonset: 'top of the moon on the horizon, setting'
	};
</script>

<div class="panel rounded-xl px-3 py-2.5 text-xs">
	<ul class="space-y-1">
		{#each MOON_EVENT_KINDS as kind (kind)}
			<li class="flex items-center gap-2">
				<span
					class="h-[3px] w-4 shrink-0 rounded-full"
					style={`background: var(--color-${kind})`}
					aria-hidden="true"
				></span>
				<span class="w-24 font-medium text-[var(--color-ink)]">{MOON_EVENT_NAMES[kind]}</span>
				<span class="hidden text-[11px] text-[var(--color-ink-dim)] sm:inline">{MEANING[kind]}</span>
			</li>
		{/each}
		<li class="flex items-center gap-2">
			<span
				class="h-2.5 w-4 shrink-0 rounded-sm border border-[var(--color-moon)]/40 bg-[var(--color-moon)]/25"
				aria-hidden="true"
			></span>
			<span class="w-24 font-medium text-[var(--color-ink)]">Moonlit night</span>
			<span class="hidden text-[11px] text-[var(--color-ink-dim)] sm:inline">
				moon up, sun down; brighter the fuller the moon
			</span>
		</li>
		<li class="flex items-center gap-2">
			<span
				class="h-2.5 w-4 shrink-0 rounded-sm border border-[var(--color-moon)]/20 bg-[var(--color-moon)]/10"
				aria-hidden="true"
			></span>
			<span class="w-24 font-medium text-[var(--color-ink)]">Moon by day</span>
			<span class="hidden text-[11px] text-[var(--color-ink-dim)] sm:inline">moon and sun both up; a faint haze</span>
		</li>
	</ul>
	<div class="mt-2 border-t border-white/10 pt-2 text-[11px] text-[var(--color-ink-dim)]">
		Today: <span class="text-[var(--color-ink)]">{phase.emoji} {phase.name}</span>,
		<span class="tnum">{Math.round(phase.illumination * 100)}%</span> lit
	</div>
</div>
