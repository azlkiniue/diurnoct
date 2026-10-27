# Moon — methodology & sources

How diurnoct works out where the moon is. Today this places the moon marker
and its phase on the Day & night view; the planned **Moon** view will draw
where the moon is rising, highest and setting from the same position.

The code is in [`src/lib/astro/lunar.ts`](../src/lib/astro/lunar.ts).

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

## Accuracy

`bun run verify-moon` checks the engine against independent references. Every
61 hours for a year from 1 January 2026, against
[astronomy-engine][astronomy-engine]:

| Check | Worst difference | Limit |
| ----- | ---------------: | ----: |
| point under the moon | 0.003° (11″) | 0.02° |
| Earth–moon distance | 0.005% (about 20 km) | 0.1% |
| lit fraction | 0.31 percentage points | 1 percentage point |

It also reproduces Meeus' worked example 47.a (1992 April 12, 0h TT) to its
last printed digit — λ = 133.162655°, β = −3.229126°, Δ = 368409.7 km,
π = 0.991990° — so a mistyped coefficient in either table shows up at once.

## References

[astronomy-engine]: https://github.com/cosinekitty/astronomy
[deltat]: https://eclipse.gsfc.nasa.gov/SEhelp/deltatpoly2004.html

- Jean Meeus, *Astronomical Algorithms*, 2nd ed. (Willmann-Bell, 1998) — ch. 22 (obliquity), ch. 47 (position of the moon), ch. 48 (illuminated fraction)
- M. Chapront-Touzé & J. Chapront, *ELP 2000-82* lunar theory — the series Meeus abridges
- F. Espenak & J. Meeus, *Polynomial expressions for Delta T*, NASA — <https://eclipse.gsfc.nasa.gov/SEhelp/deltatpoly2004.html>
- astronomy-engine — <https://github.com/cosinekitty/astronomy>
