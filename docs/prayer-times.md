# Prayer times map — methodology & sources

The **Prayer times** view (`/prayer/`, or press `P`) draws, live, the line of
places on Earth where each of the daily prayer times is beginning *right now*.
It's optional and off by default: turn it on under **Settings → Prayer
times**, and the toolbar gains a *Day & night | Prayer times* switch.
As the Earth turns, the lines sweep westward at 15° an hour, so somewhere on
the planet each prayer is always beginning.

Each line is drawn three ways:

| Style  | Meaning |
| ------ | ------- |
| solid  | the sign that defines the time actually occurs there today |
| dashed | the sign doesn't occur (twilight lasts all night), so the time is estimated by the selected high-latitude rule |
| dotted | the sun doesn't rise or set at all today, so every time follows latitude 45° |

The timetable starts at the principal city of your device's time zone (from
the tz database), marked *from your time zone* since it's only approximate.
Click the map, or use *Use my location*, to pin your exact spot; if the
browser can't share a location (permission blocked, Location Services off, or
an embedded browser), the timetable says why and keeps the time-zone city.
Clicking a city dot or the Kaaba marker picks that city and shows its local
time; any other point shows times in your own time zone. Nothing leaves your
device. Times marked **est.** come from a high-latitude rule.

The code is in [`src/lib/astro/prayer.ts`](../src/lib/astro/prayer.ts).

## How each time is defined

| Prayer  | Begins when | Computed as |
| ------- | ----------- | ----------- |
| Fajr    | true dawn: light spreads across the eastern horizon | sun *α*° below the horizon, before sunrise (α from the method) |
| Sunrise | the sun's upper edge appears — the end of Fajr | sun 0.833° below the horizon (34′ refraction + 16′ semi-diameter) |
| Dhuhr   | the sun passes the meridian | local apparent noon |
| Asr     | an object's shadow exceeds its noon shadow by its height (Shafiʿi, Maliki, Hanbali) or twice its height (Hanafi) | sun at altitude `atan(1 / (k + tan(abs(φ − δ_noon))))`, k = 1 or 2 |
| Maghrib | sunset | as sunrise, after noon; the Jaʿfari methods wait until the sun is 4°–4.5° below |
| Isha    | the evening twilight disappears | sun *β*° below the horizon after sunset, or a fixed interval after Maghrib |

Every time is reduced to the sun's **hour angle** *h* — hours from local
apparent noon — for a latitude φ and solar declination δ:

```
cos h = (sin a − sin φ · sin δ) / (cos φ · cos δ)        a = the sun's altitude at that moment
```

Because the sun's hour angle at longitude λ is just λ minus the longitude of
the subsolar point, the line for a prayer at an instant is
`λ(φ) = subsolar longitude + 15° × h(φ)`, evaluated with the sun's declination
at that instant. The timetable for a place solves the same equation for the
instant, so a place lies on a line exactly when its timetable says that prayer
begins.

## Calculation methods

| Method | Fajr | Isha | Maghrib | Minutes added | Used in |
| ------ | ---: | ---: | ------: | ------------- | ------- |
| Muslim World League | 18° | 17° | sunset | Dhuhr +1 | Europe, Far East, worldwide |
| Islamic Society of North America | 15° | 15° | sunset | Dhuhr +1 | US, Canada |
| Egyptian General Authority of Survey | 19.5° | 17.5° | sunset | Dhuhr +1 | Africa, Syria, Lebanon |
| Umm al-Qura University, Makkah | 18.5° | 90 min (120 in Ramadan) | sunset | — | Saudi Arabia |
| University of Islamic Sciences, Karachi | 18° | 18° | sunset | Dhuhr +1 | Pakistan, India, Bangladesh, Afghanistan |
| Kementerian Agama (Kemenag) | 20° | 18° | sunset | +2 (sunrise −2) | Indonesia |
| Majlis Ugama Islam Singapura (MUIS) | 20° | 18° | sunset | Dhuhr +1 | Singapore |
| Diyanet İşleri Başkanlığı | 18° | 17° | sunset | sunrise −7, Dhuhr +5, Asr +4, Maghrib +7 | Türkiye |
| Islamic Affairs, Dubai | 18.2° | 18.2° | sunset | sunrise −3, Dhuhr/Asr/Maghrib +3 | UAE |
| Kuwait | 18° | 17.5° | sunset | — | Kuwait |
| Qatar | 18° | 90 min | sunset | — | Qatar |
| Union des Organisations Islamiques de France | 12° | 12° | sunset | — | France |
| Spiritual Administration of Muslims of Russia | 16° | 15° | sunset | — | Russia |
| Institute of Geophysics, University of Tehran | 17.7° | 14° | 4.5° | — | Iran |
| Shia Ithna-Ashari, Leva Institute, Qum | 16° | 14° | 4° | — | Shia communities |

Angles are from [PrayTimes.org][praytimes-methods] and the [adhan][adhan]
library; the added minutes follow adhan's method definitions, plus the 2-minute
*ihtiyāṭ* customary in Indonesian timetables for Kemenag ([NU Online][kemenag]
on the −20° Subuh criterion; *[Efektivitas Ihtiyath Awal Waktu Salat][ihtiyat]*
on ihtiyāṭ).
Umm al-Qura's Ramadan interval is applied automatically from the Umm al-Qura
calendar.

## High latitudes

### The problem

The signs that open Fajr and Isha are twilight phenomena. Around the summer
solstice the sun no longer sinks 18° below the horizon anywhere beyond about
**48.5°** of latitude: twilight lasts all night, so there is no true dawn and
the evening glow never fades. Beyond about **65.7°** the sun doesn't set at
all (and in winter doesn't rise). Since Muslims must still pray five times a
day, jurists estimate the missing times (*taqdīr*).

### What scholars have ruled

- **The hadith of the Dajjal.** Describing a day "like a year", the Prophet ﷺ
  was asked whether one day's prayers would suffice; he answered: no — "estimate
  its measure" (*uqdurū lahu qadrah*). [Sahih Muslim 2937][muslim-2937]; also
  Abu Dawud 4321. Every ruling below rests on it.
- **Council of Senior Scholars, Saudi Arabia — resolution 61 (12/4/1398 AH,
  1978).** Where night and day are distinguishable within 24 hours, the five
  prayers are prayed at their actual times, however long or short the day.
  Where the sun doesn't set in summer or rise in winter, the five prayers are
  prayed in every 24 hours, their times estimated from the nearest place where
  the prayer times are distinct. ([IslamQA 106527][islamqa-61],
  [IslamWeb 130383][islamweb-61])
- **Islamic Fiqh Council of the Muslim World League — 9th session, 6th
  resolution (12–19 Rajab 1406 AH, March 1986)**, building on its 5th session
  (1402 AH / 1982), which had adopted resolution 61. It divides high latitudes
  into three zones:
  1. **45°–48°**: every sign occurs within 24 hours, so the actual times apply.
  2. **48°–66°**: some signs are absent on some days. Isha and Fajr are set by
     *proportional analogy* (*al-qiyās al-nisbī*) with the nearest place where
     they are distinct, and the Council proposes latitude 45°: if Isha begins
     after a third of the night at 45°, it begins after a third of the night
     there; likewise Fajr.
  3. **66° to the pole**: every time is estimated by analogy with its
     counterpart at 45°.

  ([translation of the decree][mwl-1406]; [IslamOnline summary][islamonline]).
  The European Council for Fatwa and Research endorsed this resolution
  ([IslamOnline][islamonline]).
- **Islamic Fiqh Council — 19th session (22–26 Shawwal 1428 AH, 3–7 November
  2007).** It reaffirmed the zones, and clarified that proportional estimation
  applies **only where the astronomical sign is absent**. Where the sign occurs
  but very late, Isha is prayed at its time, and those for whom waiting is a
  hardship (students, employees, workers on working days) may combine Maghrib
  and Isha — without that becoming the rule for everyone.
  ([decisions of the 19th session][mwl-1428]; quoted and followed by
  [Dar al-Iftaʾ al-Misriyyah, fatwa 2259][dar-alifta])
- **Middle of the night.** "The time of Isha lasts until the middle of the
  night" ([Sahih Muslim 612][muslim-612]); al-Nawawi read this as the end of
  Isha's *preferred* time ([Mufti of Wilayah Persekutuan][muftiwp]). If
  twilight hasn't faded by then, Isha (and, mirrored, Fajr) is placed at the
  midpoint between sunset and sunrise.
- **One-seventh of the night (*subʿ al-layl*).** Isha after the first seventh
  of the night, Fajr at the start of the last seventh — permitted by Ashraf Ali
  Thanwi (*Imdād al-Fatāwā* 2/98), with ʿAllāmah Shāmī (Ibn ʿĀbidīn, on
  *al-Durr al-Mukhtār*) and Mufti Muhammad Shafiʿ cited for it; the
  Moonsighting Committee Worldwide uses it from 55°
  ([moonsighting.com][moonsighting]).
- **Twilight angle (α/60).** The night is split in the ratio α/60, α being the
  twilight angle — a computational convention ([PrayTimes.org][praytimes-calc])
  rather than a ruling, roughly reproducing ordinary twilight lengths.

Some scholars instead estimate from the times of Makkah and Madinah, or from the
last day on which the signs were distinct (*aqrab al-ayyām*)
([IslamicFiqh.net][islamicfiqh]); those aren't offered here.

### What the map does

**Settings → Prayer times → High latitudes** chooses the rule; the default
follows the Fiqh Council.

| Rule | Isha (Fajr mirrored, before sunrise) |
| ---- | ---- |
| **45° proportion** (default) | Where the sun never reaches the Isha angle, `sunset + f × night`, with `f` = (Isha − sunset) ÷ night at latitude ±45° on the same date. Only where the sign is absent, per the 1428 AH clarification. |
| **Middle of the night** | Beyond 48°, never later than `sunset + ½ night`; anywhere the sign is absent, exactly that. |
| **One-seventh of the night** | Beyond 48°, never later than `sunset + ⅐ night`; anywhere the sign is absent, exactly that. |
| **Twilight angle** | Beyond 48°, never later than `sunset + α/60 × night`; anywhere the sign is absent, exactly that. |
| **None** | Only where the sun actually reaches the angle; elsewhere the line stops. |

"Night" is sunset to sunrise. The night-fraction rules act as caps, as in
PrayTimes.org and adhan, but only beyond 48° — the Fiqh Council's zone
boundary — so they don't shift ordinary mid-latitude times. A Jaʿfari Maghrib
angle that is never reached is estimated the same way.

**Where the sun doesn't rise or set at all** (beyond about 65.7° near the
solstices), every rule except *None* takes all six times from latitude ±45° at
the same longitude, as the Fiqh Council's zone 3 prescribes; resolution 61's
"nearest place where the times are distinct" points the same way. Under the
midnight sun Dhuhr is still observed (the sun visibly crosses the meridian)
and stays solid.

The lines jump where a rule takes over. That's real: a place just inside the
twilight zone has its astronomical Isha close to midnight, while one just
beyond it gets the 45° fraction. Both segments are drawn, with their own style.

## Accuracy

- **Sun position.** The Astronomical Almanac's low-precision formulae (the
  ones PrayTimes.org uses), good to about an arc-minute between 1950 and 2050
  — a few seconds of time.
- **Declination at the right moment.** Each time uses the declination at that
  instant, and Asr's noon shadow uses the declination at that day's noon.
- **Checked against independent references.** `bun run verify-prayer-times`
  compares the engine with [adhan][adhan] (Meeus' algorithms) for every method
  the two share, both Asr schools, 16 cities from the equator to the Arctic and
  6 dates through the year:

  | Check | Compared | Worst difference |
  | ----- | -------: | ---------------: |
  | Fajr, sunrise, Dhuhr, Maghrib, Isha vs adhan | 14,126 | 52 s |
  | Asr vs a brute-force solution of the shadow condition | 190 | 0.1 s |
  | 1/7 and α/60 caps beyond 48° vs adhan | 8,448 | 114 s ¹ |
  | Map lines vs timetable, up to ±66° | 10,270 | 0.0 s |
  | Midnight sun (Tromsø) vs the times of 45° N | 18 | 0.0 s |

  ¹ adhan caps a day's Fajr using the *following* night's length; here it is
  the night Fajr ends. adhan's own Asr runs up to 3 minutes off near the
  equinoxes at high latitudes, because it takes the noon shadow at 0h UT, which
  is why Asr is checked against the brute-force solution instead.
- **Official timetables** can still differ by a minute or two: they correct
  Maghrib and sunrise for the observer's elevation, add their own precautionary
  minutes, and compute for a reference point of the city. For Jakarta on
  12 October 2026, Kemenag publishes Subuh 04:17, Terbit 05:30, Dzuhur 11:43,
  Ashar 14:45, Maghrib 17:49, Isya 18:58; this map gives 04:17, 05:30, 11:42,
  14:45, 17:48, 18:58. The timetable rounds starts up and sunrise down, as
  published timetables do.
- **Beyond about 70°**, on the few days a sign appears or vanishes, the
  declination's change through the day decides whether it occurs; the
  timetable and the line can then land on different sides of that boundary.

## References

[muslim-2937]: https://sunnah.com/muslim:2937a
[muslim-612]: https://sunnah.com/muslim:612a
[islamqa-61]: https://islamqa.info/en/answers/106527
[islamweb-61]: https://www.islamweb.net/ar/fatwa/130383/
[mwl-1406]: https://birka.nur.nu/prayertimes/prayertimes-references/quoted/Rabita1406-transl.html
[mwl-1428]: https://sunnionline.us/arabic/2007/12/125/
[islamonline]: https://fiqh.islamonline.net/en/praying-and-fasting-at-high-latitudes/
[dar-alifta]: https://www.dar-alifta.org/ar/fatwa/details/13433/
[muftiwp]: https://www.muftiwp.gov.my/en/artikel/irsyad-al-hadith/3946-irsyad-al-hadith-series-449-the-meaning-of-the-hadith-the-time-of-isya-prayer-is-to-the-middle-of-the-night
[moonsighting]: https://www.moonsighting.com/how-we.html
[islamicfiqh]: https://islamicfiqh.net/en/articles/267
[praytimes-calc]: https://praytimes.org/docs/calculation
[praytimes-methods]: https://praytimes.org/docs/methods
[adhan]: https://github.com/batoulapps/adhan-js
[kemenag]: https://www.nu.or.id/nasional/kemenag-kriteria-waktu-subuh-20-derajat-benar-secara-fiqih-dan-sains-fDnQZ
[ihtiyat]: https://journal.uin-alauddin.ac.id/index.php/elfalaky/article/view/14161

- Sahih Muslim 2937 (hadith of an-Nawwās ibn Samʿān) — <https://sunnah.com/muslim:2937a>
- Sahih Muslim 612 (hadith of ʿAbdullāh ibn ʿAmr) — <https://sunnah.com/muslim:612a>
- Council of Senior Scholars (Saudi Arabia), resolution 61, 12/4/1398 AH — quoted at <https://islamqa.info/en/answers/106527>
- Islamic Fiqh Council (MWL), 9th session, 1406 AH — translation at <https://birka.nur.nu/prayertimes/prayertimes-references/quoted/Rabita1406-transl.html>
- Islamic Fiqh Council (MWL), 19th session, 1428 AH — <https://sunnionline.us/arabic/2007/12/125/>
- Dar al-Iftaʾ al-Misriyyah, fatwa 2259 — <https://www.dar-alifta.org/ar/fatwa/details/13433/>
- *Praying and fasting at high latitudes*, IslamOnline — <https://fiqh.islamonline.net/en/praying-and-fasting-at-high-latitudes/>
- *How moonsighting.com calculates prayer times* — <https://www.moonsighting.com/how-we.html>
- PrayTimes.org, *Prayer times calculation* and *Calculation methods* — <https://praytimes.org/docs/calculation>, <https://praytimes.org/docs/methods>
- adhan-js — <https://github.com/batoulapps/adhan-js>
