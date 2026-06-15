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
| `S` / `,` | Open settings                       |
| `Esc`     | Close settings                      |

The toolbar (top center) exposes the same actions and auto-hides when idle.

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

## License

MIT.
