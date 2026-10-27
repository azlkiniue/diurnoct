/**
 * The views the toolbar switches between. Day & night is always there; each
 * other view is opt-in — turned on in its own settings section, opened with
 * its own key, which toggles Day & night ↔ that view. The layout's keys and
 * view switch work from this list; adding a view means an entry here, its
 * page, its settings and their section in the settings panel, and its icon
 * in the toolbar.
 */

import type { Pathname, RouteId } from '$app/types';
import type { Layers, Settings } from '$lib/stores/settings.svelte';

export type ViewId = 'day' | 'prayer' | 'moon';

export interface View {
	id: ViewId;
	/** Name in the view switch. */
	label: string;
	route: RouteId;
	path: Pathname;
	/** Lower-case key that toggles Day & night ↔ this view; none for Day & night itself. */
	key?: string;
	/** Whether the view is turned on in settings. */
	enabled: (s: Settings) => boolean;
	/** Layers the view decides for itself, whatever the settings say. */
	layers: Partial<Layers>;
}

export const VIEWS: View[] = [
	{
		id: 'day',
		label: 'Day & night',
		route: '/',
		path: '/',
		enabled: () => true,
		layers: {}
	},
	{
		id: 'prayer',
		label: 'Prayer times',
		route: '/prayer',
		path: '/prayer/',
		key: 'p',
		enabled: (s) => s.prayer.enabled,
		// The prayer lines stand in for the terminator, and bring their own legend.
		layers: { terminatorLine: false, legend: false }
	},
	{
		id: 'moon',
		label: 'Moon',
		route: '/moon',
		path: '/moon/',
		key: 'm',
		enabled: (s) => s.moon.enabled,
		// The lines circle the point under the moon, so it's always marked.
		layers: { sublunar: true, legend: false }
	}
];

export const HOME = VIEWS[0];

export function viewById(id: ViewId): View {
	return VIEWS.find((v) => v.id === id) ?? HOME;
}

/** The view a route shows. */
export function viewAt(route: string | null): View {
	return VIEWS.find((v) => v.route === route) ?? HOME;
}

/** The layers to draw on `view`: the settings', with the ones it decides for itself. */
export function viewLayers(view: View, layers: Layers): Layers {
	return { ...layers, ...view.layers };
}
