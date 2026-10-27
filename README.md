# diurnoct

A real-time **day & night map of Earth** — _diurnal_ + _nocturnal_ — rendered
from satellite imagery, in the spirit of a [Geochron](https://geochron.com)
clock. Built to live as a desktop / browser **wallpaper**, so every piece of
information can be toggled on or off to taste.

![diurnoct](https://img.shields.io/badge/runtime-bun-black) ![svelte](https://img.shields.io/badge/svelte-5-ff3e00) ![tailwind](https://img.shields.io/badge/tailwind-4-38bdf8)

## What it does

- 🌍 **Satellite day/night composite** — NASA "Blue Marble" by day and the
  "Black Marble" city lights by night, blended in real time by a WebGL shader
  that computes the solar terminator per-pixel (with a soft twilight band).
- 🕗 **Astronomically accurate** — the sun's subsolar point, the moon's
  sub-lunar point and phase, and per-city day/night are computed live and
  updated every second.
- 🕌 **Prayer times map** _(optional)_ — turn it on in **Settings → Prayer
  times** for a second view (`/prayer/`, or press `P`) of where Fajr, sunrise,
  Dhuhr, Asr, Maghrib and Isha are beginning right now, with 15 calculation
  methods, both Asr schools, and the high-latitude rules of the Muslim World
  League's Fiqh Council and other scholars. Pin a place for its timetable.
  Methodology, sources and accuracy checks are in
  [`docs/prayer-times.md`](docs/prayer-times.md).
- 🌙 **Moon view** _(optional)_ — turn it on in **Settings → Moon** for a
  view (`/moon/`, or press `M`) of where the moon is rising, highest in the
  sky and setting right now, with the moonlit night — moon up, sun down —
  shaded by how full the moon is, from the full Meeus lunar series. Pin a
  place — the same one as the prayer view — for its moonrise, transit and
  moonset today. Methodology,
  sources and accuracy checks are in [`docs/moon.md`](docs/moon.md).
- 🎚️ **Adjustable verbosity** — three presets (Minimal / Standard / Detailed)
  plus individual toggles for clocks, date, sun & moon markers, the terminator
  line, a graticule, city dots & labels, cursor coordinates and a legend.
- 🖼️ **Wallpaper-friendly** — letterbox ("fit") or fill ("cover") framing,
  starfield backdrop, auto-hiding controls, one-key fullscreen, and a pure-map
  mode (`H`). Everything persists to `localStorage`.
- ⚡ **Fully static** — no server, no Node. Builds to plain HTML/JS/CSS for
  GitHub Pages or Cloudflare Pages. Only redraws when the clock ticks, so it
  sips power.

## Tech stack

[Bun](https://bun.sh) · [SvelteKit](https://kit.svelte.dev) (Svelte 5 runes,
`adapter-static`) · [Tailwind CSS v4](https://tailwindcss.com) · WebGL. No
runtime dependencies ship to the browser beyond the framework.

## Getting started

```bash
bun install
bun run dev          # http://localhost:5173
```

That's it — on first run the map pulls its textures from a CDN, so it works
immediately.

### Self-hosting the textures (recommended)

For an offline-capable, CDN-free build, download local copies:

```bash
bun run fetch-textures
```

This saves `static/textures/day.jpg` and `night.jpg`. The default texture mode
(**Auto**) prefers these local files and falls back to the CDN if they're
missing. Want sharper imagery? Point `DAY_URL` / `NIGHT_URL` at higher-res NASA
equirectangular images:

```bash
DAY_URL="https://…/blue_marble_8k.jpg" NIGHT_URL="https://…/black_marble_8k.jpg" bun run fetch-textures
```

…or paste URLs directly in **Settings → Satellite textures → Custom**.

## Controls

| Key       | Action                              |
| --------- | ----------------------------------- |
| `H`       | Hide / show all overlays (pure map) |
| `F`       | Toggle fullscreen                   |
| `P`       | Switch day & night / prayer times ¹ |
| `M`       | Switch day & night / Moon ¹         |
| `S` / `,` | Open settings                       |
| `Esc`     | Close settings                      |

¹ Once that view is turned on in settings.

The toolbar (top center) exposes the same actions and auto-hides when idle.
On the prayer-times and Moon views, click the map to pin a place for its
times; both views share it.

## Build

```bash
bun run build        # → ./build (static)
bun run preview      # serve the production build locally
```

## Deploy

### GitHub Pages

A workflow is included at [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

1. Push to `main`.
2. In the repo, **Settings → Pages → Build and deployment → Source → GitHub
   Actions**.

The workflow sets `BASE_PATH=/<repo-name>` automatically so assets resolve on a
project site (`https://<user>.github.io/<repo>/`). It also runs
`fetch-textures` so the deployed site self-hosts its imagery.

> Using a custom domain or a user/org site served from `/`? Leave `BASE_PATH`
> unset (the default).

### Cloudflare Pages

- **Framework preset:** none
- **Build command:** `bun run build`
- **Build output directory:** `build`

Served from the root, so no `BASE_PATH` is needed.

## Customizing

- **Cities** shown as dots / clocks live in
  [`src/lib/astro/cities.ts`](src/lib/astro/cities.ts).
- **Theme colors** are CSS variables in
  [`src/app.css`](src/app.css) (`@theme` block).
- **Verbosity presets** are defined in
  [`src/lib/stores/settings.svelte.ts`](src/lib/stores/settings.svelte.ts).
- **The terminator shader** is in
  [`src/lib/map/shaders.ts`](src/lib/map/shaders.ts).
- **Prayer times** — methods and high-latitude rules — are in
  [`src/lib/astro/prayer.ts`](src/lib/astro/prayer.ts). After changing them,
  run `bun run verify-prayer-times` to check them against the
  [adhan](https://github.com/batoulapps/adhan-js) library and an independent
  solution of the Asr shadow condition.
- **The moon's position** is in
  [`src/lib/astro/lunar.ts`](src/lib/astro/lunar.ts), and the Moon view's
  lines in [`src/lib/astro/moon.ts`](src/lib/astro/moon.ts). After changing
  them, run `bun run verify-moon` to check them against
  [astronomy-engine](https://github.com/cosinekitty/astronomy) and Meeus'
  worked example; methodology in [`docs/moon.md`](docs/moon.md).

## Credits

Satellite imagery is derived from NASA's
[Visible Earth](https://visibleearth.nasa.gov) (Blue Marble & Black Marble,
public domain). By default the map loads a **4K** daytime map and a **2K**
city-lights map over CORS-friendly CDNs (jsDelivr-hosted assets from
[`turban/webgl-earth`](https://github.com/turban/webgl-earth) and
[three.js](https://github.com/mrdoob/three.js)), with the
[`three-globe`](https://github.com/vasturiano/three-globe) 2K pair as a fallback.
Point `fetch-textures` at 8K NASA imagery for an even sharper wallpaper. Solar
and lunar positions use the standard low-precision formulae from Meeus,
_Astronomical Algorithms_.

## Similar projects

* [openhamclock](https://github.com/accius/openhamclock) – A real-time dashboard derived from HamClock, often described as a “poor man’s Geochron.”
* [geo-clock-card](https://github.com/jpettitt/geo-clock-card) – A Geochron-style clock designed for use in Home Assistant.
* [day-night-map](https://github.com/lanrat/day-night-map) – A similar project that inspired making this project simple enough to be deployable on GitHub Pages.

## License

MIT.
