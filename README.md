# BirdHunt

A collection log of the birds of the United Kingdom. Built as a companion to
[WorldHunt](https://github.com/Bpatt44/worldhunt), sharing its engine philosophy but
inverting the genre: WorldHunt is a game with a collection log attached, BirdHunt is a
collection log with a game attached.

**262 species.** Category A and C, annually occurring. Vagrants deliberately excluded.

---

## Deploy

Drop the repo on Netlify. No build step, no dependencies, no serverless functions —
V1 makes no network calls at all.

```
publish directory: .
build command:     (none)
```

Or run locally:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

A service worker is registered, so it needs to be served over http/https —
opening `index.html` from the filesystem will work but the PWA install and offline
cache will not.

---

## Files

| File | Purpose |
|---|---|
| `index.html` | Everything. Engine, UI, procedural art, and the 262-species dataset embedded as JSON. |
| `sw.js` | Cache-first service worker. **Bump `CACHE` on every deploy.** |
| `manifest.webmanifest` | PWA manifest. |
| `icon-192.png` / `icon-512.png` | App icons. |
| `netlify.toml` | Sets `no-cache` on `sw.js` and `index.html` so deploys actually land. |

---

## The engine

One formula. That is the entire tuning surface.

```
weight(species) = habitat_weight × month_weight × (reporting_rate ^ GAMMA)
```

Gated by region lock. The species with the highest weight is not guaranteed —
one is drawn from the pool proportional to weight.

| Gate | Source | Effect |
|---|---|---|
| **Habitat** | `s.h[code]`, 0–3 | 0 excludes the species entirely |
| **Month** | `s.m[index]`, 0–3 | 0 excludes. This is what makes the log take a year |
| **Region** | `s.R`, array or `null` | `null` = found anywhere. Ancients are locked |
| **GAMMA** | Settings, default `1.3` | The single global rarity dial |
| **Shiny** | 1 in 2000 per encounter | Independent of everything else |

### Why reporting rate, not a tier weight

An earlier build used per-tier pick weights (Common 1000 → Ancient 3). It produced
visible artefacts: every jackpot in a context shared identical odds, and Great Spotted
Woodpecker outranked Blue Tit in woodland. Using real-world reporting rate directly
removes a whole tuning table and fixes both.

**Tier is now purely cosmetic.** It selects the card treatment and nothing else.

### Difficulty curve

Jackpot odds (Ultra Rare or Ancient) per bird encountered, at GAMMA 1.3:

| Context | Odds |
|---|---|
| Suburban garden, January | 1 in 2,867 |
| Broadleaf woodland, May | 1 in 680 |
| Reedbed, September | 1 in 132 |
| Caledonian pinewood, June | 1 in 117 |
| Cairngorm plateau, June | 1 in 41 |
| Cornwall seawatch, October | 1 in 13 |

That ~220× spread between a back garden and a Cornish headland **is the game.**
Travel is the difficulty curve — no separate system is needed to produce it.

---

## Location handling

**Geolocation is deliberately not wired up.** Region, habitat, month and weather are set
manually in Settings, plus a randomiser.

The engine reads those four values exactly as it would read GPS + Overpass + a weather
API, so swapping the source later touches one function: `currentPool()`. Everything
downstream is unchanged.

Weather currently modifies encounter count and, for an onshore gale on the coast,
triples the weight of pelagic and coastal species — the seawatch effect.

---

## Data model

Each species is one compact record:

```js
{
  i: 1,                       // stable ID — append only, never renumber
  n: "Mute Swan",             // common name
  s: "Cygnus olor",           // scientific name
  f: "Anatidae",              // family
  t: "C",                     // tier — C U R X A (cosmetic only)
  r: 34,                      // reporting rate %, ESTIMATED — see caveats
  b: "Green",                 // BoCC5 status
  g: "duck",                  // art shape group
  p: ["#3d6b8f","#8fb8d6"],   // art palette
  h: { FRW:3, PRK:3, CST:1 }, // habitat weights
  m: "333333333333",          // month weights, Jan–Dec
  R: null,                    // region lock, null = anywhere
  x: 0,                       // 1 if sexually dimorphic
  L: "UK"                     // human-readable range
}
```

Habitat codes: `URB SUB PRK FRM WBL WCF HTH UPL FRW RED CST PEL`
Region codes: `SE SW EA MID NWE NEE WAL SCS SCH ISL`

---

## Collection storage

`localStorage`, two keys: `bh_cfg` (settings) and `bh_col` (collection).

```js
col[speciesId] = { c: 12, M: 7, F: 5, sh: 0, t: 1719... }
//                 total  male female shiny  first caught
```

Finish tier is **derived** from `c`, never stored — so changing the thresholds
retroactively re-grades the whole log.

| Finish | Common | Uncommon | Rare | Ultra | Ancient |
|---|---|---|---|---|---|
| Bronze | 1 | 1 | 1 | 1 | 1 |
| Silver | 10 | 6 | 3 | 2 | 2 |
| Gold | 50 | 25 | 10 | 5 | 3 |
| Platinum | 250 | 100 | 30 | 12 | 5 |

Note the inversion: Commons need volume, Ancients need travel. A Platinum Woodpigeon
and a Platinum Golden Eagle are both hard, for opposite reasons.

Export is available in Settings.

---

## Known caveats

- **Reporting rates are estimated, not sourced.** They drive the entire weighting, so
  replacing them with real BTO BirdTrack figures is the single highest-value improvement.
- **BoCC5 statuses need verification** against the published 2021 list.
- **Art is procedural placeholder.** A parametric SVG driven by a per-family shape table.
  Phase 4 replaces it with real illustration.
- **Fun facts and population figures are not yet written.** Phase 5.
- **Region locks are blunt.** Ten regions, yes/no. Fine for V1, too coarse for a species
  like Cirl Bunting that really means "South Devon".

---

## Not in V1 (parked, deliberately)

Patch rarity · wanderer weights · condition gates (dusk, night, cold snap) · age /
seasonal / racial plumage variants · in-range rates and pity timers · WorldHunt cross-linking.

Each of these adds a system. The log ships first.

---

## Safety

Several species in the dataset are legally protected at the nest under Schedule 1 of
the Wildlife and Countryside Act. Before this goes anywhere public, those cards need a
visible "observe from distance, never approach a nest" line. A collection app that
nudges people toward sensitive sites is a genuine problem, not a theoretical one.
