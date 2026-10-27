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

Between the moonrise and moonset lines, where the moon is up **and** the sun
is down — the **moonlit night** — the map is lightly shaded, more strongly
the more of the moon is lit: it all but vanishes at new moon and is clearest
at full moon. Labels along the lines and a legend with today's phase can each
be turned off under **Settings → Moon**.

A **moon panel** gives one place's moonrise, transit and moonset today,
whether the moon is up now and when it next rises or sets, and its phase. It
starts at the principal city of your device's time zone, marked *from your
time zone* since it's only approximate; click the map (a city dot picks that
city and shows its local time) or use *Use my location* to pin your spot.
It's **the same pinned place** as in the Prayer times view, so you pin your
home once. Nothing leaves your device.

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

### The moonlit night

The moon is up inside that circle; the sun is down beyond the terminator,
the great circle 90° from the point under the sun (the same one the Day &
night view draws). The moonlit night is where the two overlap, outlined by
the arc of the moon's circle on the night side and the arc of the terminator
inside the moon's circle, which meet where the two circles cross. The circles
fail to cross only in the middle of a deep eclipse: the moon's circle then
lies wholly on the night side (lunar) or wholly on the day side (solar).

The shading's opacity is proportional to the moon's lit fraction (Meeus 48.4),
so it tracks how much light the moon actually gives.

## The moon panel's times

**The day** is the place's local mean-solar day, midnight to midnight at its
meridian — the same day the prayer timetable uses, so "today" means the same
in both views and no time zone is needed. Times are shown to the nearest
minute, in the place's local time when it's a city (otherwise in yours).

**Each time** is the instant the same condition that draws the lines holds at
the place, with the same moon position and parallax: its altitude crosses h₀
(rise or set), or its hour angle passes 0° with the moon above h₀ (transit).
So a place lies on a line exactly when its panel says that event is happening.
Between one culmination and the next the moon mostly only climbs or only
sinks, so the culminations bracket each rise and set — the bracketing
astronomy-engine uses too — and each stretch is also sampled every two hours,
since near the poles the moon's changing declination moves it as much as
Earth's turn does.

**Missing times are normal.** The moon rises about 50 minutes later each day,
so roughly once a month a day has no moonrise — it rose just before midnight
and rises again just after the next — and likewise no moonset, or no transit.
The panel says so ("no moonrise today") rather than showing a time from
another day. At high latitudes the moon can stay up or stay down for days, as
the sun does around the solstices; the panel then says "moon up all day" or
"moon down all day". Unlike the prayer view's high-latitude rules, nothing is
estimated: a time is shown only when the event happens.

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
| moonlit night vs where astronomy-engine has the moon up and the sun down, every 5° | worst 0.001° of altitude from an edge | 0.1° |
| lit fraction used for the shading | 0.28 percentage points | 1 percentage point |

The instants include the middles of a near-central solar eclipse (22 July
2009) and lunar eclipse (26 June 2029), when the moon's circle and the
terminator don't cross.

**The panel's times.** For 17 cities from near the equator (Jakarta) to the
high Arctic (Longyearbyen, 78° N) — the prayer-times check's 16, plus
Longyearbyen — on every other day
of October 2026 and four more days through the year, against
astronomy-engine's moonrise, moonset and transit in the same local day:

| Check | Result | Limit |
| ----- | -----: | ----: |
| moonrise, transit and moonset, up to 60° latitude | worst 6 s | 2 min |
| the same, beyond 60° (reported) | median 1 s, worst 7 s | — |
| a day misses an event exactly when astronomy-engine finds none | always | always |
| moon up or down all day, as astronomy-engine has it | always | always |
| the map against the panel: points on the lines have that event at that instant | worst 0.0 s | 5 s |

An event within two minutes of midnight may fairly fall on either day, so a
disagreement there doesn't count as a missing event.

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
