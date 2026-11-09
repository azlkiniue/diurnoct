# diurnoct

A live day & night map of Earth, with optional views that draw where prayer times and moon events are happening right now.

## Language

### Views

**Day & night view**:
The home view: the satellite map of Earth, split into day and night as they are right now.
_Avoid_: original map, main map

**Prayer times view**:
The optional view that draws the prayer lines; its docs title it the _Prayer times map_.

**Moon view**:
The optional view that draws the moon lines and shades where the moon is up.
_Avoid_: moon map

### Lines

**Terminator**:
The great circle 90° from the point under the sun, where the sun's centre is on the horizon, ignoring refraction; drawn on the map as the **terminator line**.
It is neither the sunrise nor (in most methods) the Maghrib prayer line, which use the sun's upper edge with refraction and lie just on its night side, nor the soft twilight band around it.

**Event line**:
The line of places where an event is happening right now. Prayer lines and moon lines are event lines; the terminator line is not.

**Prayer line**:
The event line where one of the daily prayer times (Fajr, sunrise, Dhuhr, Asr, Maghrib or Isha) is beginning right now.

**Moon line**:
The event line where the moon is rising, crossing the meridian at its highest, or setting right now: the moonrise, transit and moonset lines.
