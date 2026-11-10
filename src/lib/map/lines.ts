/**
 * The look of the terminator line and the event lines: a thin stroke with a
 * soft halo, both in the line's own colour. MapOverlay draws the terminator
 * line, and LineOverlay every event line, with these widths and opacities, so
 * the two can't drift apart. Each draws them in its own order: the terminator
 * line's halo lies over its stroke, while every event line's halo lies under
 * every stroke. Widths are before HUD scaling.
 */

/** The line itself. */
export const LINE_STROKE = { width: 1.6, opacity: 0.9 } as const;

/** The soft halo around it. */
export const LINE_HALO = { width: 5, opacity: 0.15 } as const;
