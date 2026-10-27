# Moon — methodology & sources

How diurnoct works out where the moon is, and where on Earth it is rising,
highest and setting. The same position places the moon marker and its phase
on the Day & night view.

The **Moon** view (`/moon/`, or press `M`) draws, live, three lines on the
map:

| Line | Places where the moon is … |
| ---- | --------------------------- |
| moonrise | rising right now |
| moon transit | at its highest right now, crossing the meridian |
| moonset | setting right now |

It's optional and off by default: turn it on under **Settings → Moon**, and
the toolbar's view switch gains a *Moon* entry. As the Earth turns, the lines
sweep westward at about 14.5° an hour — a little slower than the sun's 15°,
because the moon moves eastward against the stars by about 13° a day. The
moon marker is always shown on this view, since the lines circle it.

The position is in [`src/lib/astro/lunar.ts`](../src/lib/astro/lunar.ts), the
lines in [`src/lib/astro/moon.ts`](../src/lib/astro/moon.ts).

## Moon position

The moon's geocentric ecliptic longitude, latitude and distance come from the
ELP-2000/82 lunar theory as abridged by Meeus (*Astronomical Algorithms*,
ch. 47):

| Quantity | Terms | Good to |
| -------- | ----: | ------- |
| longitude | 59 sine terms (table 47.A) and 3 additive terms | about 10″ |
| latitude | 60 sine terms (table 47.B) and 6 additive terms | about 4″ |
| distance | 46 cosine terms (table 47.A) | within about 20 km of astronomy-engine |

Each term is a multiple of four slowly turning angles — the moon's mean
elongation from the sun *D*, the sun's mean anomaly *M*, the moon's mean
anomaly *M′* and its argument of latitude *F* — and terms in *M* shrink with
the slowly falling eccentricity of Earth's orbit. The additive terms account
for Venus, Jupiter and Earth's flattening.

**Time.** The series run on Terrestrial Time, which is ahead of the clock by
ΔT. ΔT comes from [Espenak & Meeus' polynomials][deltat] for 1986–2150, and
their long-term parabola for other years. For 2026 they give about 75 s
against a measured value near 69 s, and those 6 s move the moon by about 3″ —
well inside the series' own error. (astronomy-engine uses the same model, so
the checks below don't test ΔT itself.)

**From the ecliptic to the map.** Longitude and latitude are turned into right
ascension and declination with the mean obliquity of the ecliptic (Meeus 22.2).
The point under the moon is then at latitude = declination and longitude =
right ascension − Greenwich mean sidereal time. Nutation is left out: it moves
the right ascension and sidereal time together, so it shifts the point under
the moon by less than 10″.

**Parallax.** The distance gives the moon's horizontal parallax,
π = asin(6378.14 km / distance), between about 0.90° and 1.03°. Seen from
Earth's surface rather than its centre, the moon sits up to that much lower in
the sky, which delays moonrise and hastens moonset by a few minutes.

**Phase.** The lit fraction of the disk comes from the moon's phase angle by
Meeus' shorter formula (48.4); the phase name (new, waxing crescent, …) from
the mean elongation *D*.

## How each event is defined

**Moonrise and moonset** are the instants the top of the moon's disk touches
the horizon, seen from the ground through a standard atmosphere. Meeus
(*Astronomical Algorithms*, ch. 15) folds that into one geocentric altitude
for the moon's centre:

```
h₀ = 0.7275 · π − 0°34′        π = the moon's horizontal parallax at that instant
```

Three effects add up to it:

- **parallax** — seen from Earth's surface rather than its centre, the moon
  sits lower in the sky by up to π (0.90°–1.03°), so its centre must be that
  much *higher* geocentrically to show on the horizon;
- **semi-diameter** — the moon's radius is 0.2725 of Earth's, so its disk is
  0.2725·π across from centre to edge, and the top of it shows first;
- **refraction** — the air lifts objects at the horizon by about 34′.

The result is about +0.125°, varying by ±0.03° as the moon's distance changes:
unlike the sun (−0.833°), the moon's centre is slightly *above* the geocentric
horizon as it rises, because parallax outweighs the other two. Folding the
parallax into h₀ means no topocentric conversion is needed.

**Transit** is the moon's upper culmination: crossing the place's meridian,
at its highest. It's only counted where the moon is above the horizon (higher
than h₀) as it crosses; elsewhere the moon culminates out of sight.

### From the point under the moon to the lines

On a spherical Earth the moon's geocentric altitude at a place is
90° minus the place's angular distance from the point under the moon. So at
any instant:

- the moonrise and moonset lines together are the **circle of places
  90° − h₀ from the point under the moon**. The half to its west is
  **moonrise** — the moon there is still east of the meridian, climbing — and
  the half to its east is **moonset**.
- the **transit line** is the meridian through the point under the moon, as
  far as the moon stands higher than h₀ there.

The two halves meet on the meridian under the moon and on the one opposite
it. Beyond those points, toward the poles, the moon stays up or stays down
whatever the time of day, so the lines simply stop rather than inventing
events that don't happen; the transit line reaches the pole on the side where
the moon stays up, and stops on the other where it can't be seen.

## Accuracy

`bun run verify-moon` checks the engine against independent references.

**Position.** Every 61 hours for a year from 1 January 2026, against
[astronomy-engine][astronomy-engine]:

| Check | Worst difference | Limit |
| ----- | ---------------: | ----: |
| point under the moon | 0.003° (11″) | 0.02° |
| Earth–moon distance | 0.005% (about 20 km) | 0.1% |
| lit fraction | 0.31 percentage points | 1 percentage point |

It also reproduces Meeus' worked example 47.a (1992 April 12, 0h TT) to its
last printed digit — λ = 133.162655°, β = −3.229126°, Δ = 368409.7 km,
π = 0.991990° — so a mistyped coefficient in either table shows up at once.

**The lines.** At instants every 79 hours through October 2026 and four more
through the year, every fourth point along each line is handed to
astronomy-engine's own moonrise, moonset and transit searches (its rise and
set are the top of the disk, seen from the surface, crossing a horizon
lowered 34′ by refraction): each must have that event at that instant.

| Check | Result | Limit |
| ----- | -----: | ----: |
| moonrise, transit and moonset, up to 60° latitude | worst 6 s | 2 min |
| the same, 60°–66° (reported) | median 3 s, 95% within 36 s, worst 13 min | — |
| the same, beyond 66° (reported) | median 6 s, 95% within 3 min, worst 2.9 h | — |
| rise and set lines drawn where the moon doesn't rise or set | none | none |
| ends of the rise and set lines vs the edges of the always-up and always-down caps | 0.002° | 0.02° |
| transit line vs where the moon is up as it crosses | exact | 0.2° |

Close to the ends of the rise and set lines the moon only grazes the horizon:
its altitude barely changes for hours, so an arc-second's difference moves
the time by minutes — or decides whether it rises at all. That's why
differences beyond 60° are reported rather than held to a limit, and why the
"none drawn where it doesn't rise or set" check leaves out the last half
degree of each line.

## References

[astronomy-engine]: https://github.com/cosinekitty/astronomy
[deltat]: https://eclipse.gsfc.nasa.gov/SEhelp/deltatpoly2004.html

- Jean Meeus, *Astronomical Algorithms*, 2nd ed. (Willmann-Bell, 1998) — ch. 22 (obliquity), ch. 47 (position of the moon), ch. 48 (illuminated fraction)
- M. Chapront-Touzé & J. Chapront, *ELP 2000-82* lunar theory — the series Meeus abridges
- F. Espenak & J. Meeus, *Polynomial expressions for Delta T*, NASA — <https://eclipse.gsfc.nasa.gov/SEhelp/deltatpoly2004.html>
- astronomy-engine — <https://github.com/cosinekitty/astronomy>
