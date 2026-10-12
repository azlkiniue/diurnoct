<script lang="ts">
	import { resolve } from '$app/paths';

	interface Props {
		uiHidden: boolean;
		isFullscreen: boolean;
		/** Which view is showing: prayer times, or day & night. */
		prayerView: boolean;
		/** The prayer-times view is switched on in settings, so offer the view switch. */
		prayerEnabled: boolean;
		onToggleHide: () => void;
		onToggleFullscreen: () => void;
		onSettings: () => void;
	}
	let {
		uiHidden,
		isFullscreen,
		prayerView,
		prayerEnabled,
		onToggleHide,
		onToggleFullscreen,
		onSettings
	}: Props = $props();
</script>

<div class="pointer-events-auto absolute top-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full panel px-1.5 py-1.5 shadow-xl">
	{#if prayerEnabled}
		<nav class="flex items-center gap-0.5 rounded-full bg-white/5 p-0.5" aria-label="Views">
			<a href={resolve('/')} class="view" class:on={!prayerView} aria-current={prayerView ? undefined : 'page'} title="Day & night (P)">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<circle cx="12" cy="12" r="9" />
					<path d="M12 3a9 9 0 0 0 0 18Z" fill="currentColor" />
				</svg>
				<span class="hidden sm:inline">Day &amp; night</span>
			</a>
			<a href={resolve('/prayer/')} class="view" class:on={prayerView} aria-current={prayerView ? 'page' : undefined} title="Prayer times (P)">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path d="M12 3v3" />
					<path d="M6 13a6 6 0 0 1 12 0" />
					<path d="M4 21v-8h16v8Z" />
					<path d="M10 21v-3a2 2 0 0 1 4 0v3" />
				</svg>
				<span class="hidden sm:inline">Prayer times</span>
			</a>
		</nav>

		<span class="mx-0.5 h-5 w-px bg-white/10" aria-hidden="true"></span>
	{/if}

	<button type="button" class="tb" aria-label={uiHidden ? 'Show overlays' : 'Hide overlays'} title="Hide / show overlays (H)" onclick={onToggleHide}>
		{#if uiHidden}
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
				<circle cx="12" cy="12" r="3" />
			</svg>
		{:else}
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.42M6.6 6.6A13.3 13.3 0 0 0 2 11s3.5 7 10 7a9 9 0 0 0 5.4-1.6" />
				<path d="m2 2 20 20" />
			</svg>
		{/if}
	</button>

	<button type="button" class="tb" aria-label="Toggle fullscreen" title="Fullscreen (F)" onclick={onToggleFullscreen}>
		{#if isFullscreen}
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" />
			</svg>
		{:else}
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
			</svg>
		{/if}
	</button>

	<button type="button" class="tb" aria-label="Open settings" title="Settings (S)" onclick={onSettings}>
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<circle cx="12" cy="12" r="3" />
			<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
		</svg>
	</button>
</div>

<style>
	.tb {
		display: grid;
		place-items: center;
		width: 2.1rem;
		height: 2.1rem;
		border-radius: 9999px;
		color: var(--color-ink-dim);
		transition: all 0.15s ease;
	}
	.tb:hover {
		color: var(--color-ink);
		background: color-mix(in oklab, white 10%, transparent);
	}
	.view {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		height: 1.85rem;
		padding: 0 0.55rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 500;
		white-space: nowrap;
		color: var(--color-ink-dim);
		transition: all 0.15s ease;
	}
	.view:hover {
		color: var(--color-ink);
	}
	.view.on {
		background: var(--color-day);
		color: var(--color-space);
	}
</style>
