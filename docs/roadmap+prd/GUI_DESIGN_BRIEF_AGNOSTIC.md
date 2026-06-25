# Threadify — UI Design Brief (platform-agnostic / clean slate)

> Paste this into a UI builder (v0, Lovable, Subframe, etc.). It asks for **two screens**.
> **Clean slate: no platform conventions, no inherited design system.** Invent a single,
> cohesive, modern look-and-feel that would feel at home as a polished web app and work
> identically on any OS. The two review screens below are the heart of the product — nail
> those. Surprise me on aesthetics, but make it *consistent and self-confident*: one
> design language, used everywhere.

## What the app does (1 paragraph of context)

Threadify turns a messy web page full of music recommendations (a Reddit thread, a blog
post, a DJ setlist) into a Spotify playlist. It scrapes the page, an AI extracts the
`Artist — Album` pairs mentioned in the prose, then resolves each to a real Spotify
release, and the user reviews everything before a playlist is created. The two screens
below are the two human review steps. The whole point is letting a person quickly catch
and fix what the AI and Spotify get wrong, with the least friction.

## Design freedom (read this first)

- **Don't mimic macOS, Windows, or any OS.** No traffic-light buttons, no native
  titlebars, no system-specific control styling. Define your own.
- **One universal layout that's identical on every platform** — same button positions,
  same spacing, same everything. Consistency across platforms is the goal here, *not*
  matching each OS.
- Treat it like a **modern web app**: your own type scale, colour system, components,
  light + dark themes. Be opinionated. Give it a point of view (this is for music lovers —
  a little editorial warmth is welcome).
- Keep **buttons described by role** in your design: a clear primary action, a quieter
  secondary/back, and a distinct destructive style — placed however your design language
  dictates, applied the same way on every screen.

## SCREEN 1 — "Review extraction" (split screen)

The AI has just read the source page and pulled out music references. The user checks the
AI read the text correctly before anything touches Spotify.

**Layout:** a split screen, two panes side by side.

- **Left pane — Source text (read-only).** The original page text, scrollable. When the
  user selects a row on the right, highlight the sentence on the left that it came from
  (provenance). Slightly muted styling — it's reference, not the focus.
- **Right pane — Extracted items.** A table/list of rows, each a **two-column
  `Artist | Album`** pair. This is the working area.

**Each row needs:**
- Inline-editable **Artist** and **Album** text fields (the AI makes mistakes — e.g. it
  reads the word "Also" as an album title).
- A small **swap (⇄) button** between the two columns to flip Artist ↔ Album when the AI
  got the order backwards. Show it on hover.
- A **keep/skip toggle** (include this row or not).
- A subtle **confidence badge** (high / medium / low) — low-confidence rows should draw
  the eye (this is where errors hide).
- A way to **remove** a row, and an **"+ Add row"** to add one the AI missed.

**Primary action (bottom):** a prominent **"Looks good → find on Spotify"** button.

**Use this real sample data so the mock feels true:**

Left pane (source text):
```
Also by Bill Evans. Nights of ballads and blues by McCoy Tyner.

Can't go wrong with Chet Baker. Especially any of the seven albums he
recorded on the Steeple Chase label, circa 1979–1985. My favorites are
The Touch of Your Lips and This Is Always.
```

Right pane (extracted rows):
| Artist | Album | Confidence |
|---|---|---|
| Bill Evans | Also | low  ← (wrong: "Also" isn't an album; user will fix/skip) |
| McCoy Tyner | Nights of Ballads and Blues | high |
| Chet Baker | The Touch of Your Lips | high |
| Chet Baker | This Is Always | medium |

Show one row in a **hover state** revealing the ⇄ swap button, and one row in an
**inline-edit state**, so the interactions are visible in the mock.

## SCREEN 2 — "Review Spotify matches"

Spotify has searched for each item and returned its best match. The user confirms each
match is the right release, swaps to alternates where it's wrong, then creates the
playlist.

**Layout:** a vertical list of result rows (consider a tabbed header — e.g.
`Playlist | Tracks` — but the Playlist list is the main view).

**Each result row needs:**
- On the left, the **submitted `Artist — Album`** (what we searched for).
- Next to it, the **matched Spotify result**: **album-art thumbnail** + matched title +
  artist + year. This is the hero of the row.
- Show **only the single best match by default**, with a **"More matches ▾"** expander
  that reveals 2–4 alternate results (each with its own thumbnail) to pick from when the
  default is wrong or ambiguous.
- An **"Edit & re-search"** action (fix a typo, or switch album↔single intent) and a
  **delete** action for the whole row.
- Rows that **couldn't be matched** must be clearly flagged (e.g. an "Unmatched — needs
  attention" state), never hidden.

**Header / summary strip:** small counts — e.g. "12 matched · 1 unmatched · 2 low
confidence" — and the playlist name (editable).

**Primary action (bottom):** a prominent **"Create playlist"** button, with a quiet
secondary note that nothing is written until clicked.

**Use this real sample data:**

| Submitted | Matched on Spotify | State |
|---|---|---|
| McCoy Tyner — Nights of Ballads and Blues | 🖼 *Nights of Ballads & Blues* — McCoy Tyner (1963) | matched |
| Chet Baker — The Touch of Your Lips | 🖼 *The Touch of Your Lips* — Chet Baker (1979) | matched |
| Chet Baker — This Is Always | 🖼 *This Is Always* — Chet Baker (1988) | ambiguous (show "More matches") |
| Bill Evans — Waltz for Debby | 🖼 *Waltz for Debby* — Bill Evans Trio (1962) | matched |
| Some Obscure Demo — Untitled | — | unmatched (needs attention) |

Show one row with the **"More matches" expander open** (3 alternate thumbnails), and the
**unmatched** row in its attention state.

## Design notes (applies to both screens)

- **Tone:** calm, confident, a little editorial — this is for music lovers. Generous
  whitespace, strong typographic hierarchy, album art does the visual heavy lifting on
  Screen 2.
- **Don't over-chrome it.** Actions appear contextually (on hover / per row).
- **Make the "needs attention" path obvious** — low confidence and unmatched items should
  be the easiest things to spot on each screen.
- **Single window**, desktop-sized (~1200×800), with **light and dark themes** in one
  coherent system.
- These two screens are steps 3 and 4 of a 5-step wizard (Connect → Paste URL → *Review
  extraction* → *Review Spotify matches* → Done), so a slim top progress indicator is
  fine but keep it understated. Use your own progress-indicator style — consistent across
  every step.

Deliver: high-fidelity mockups of both screens, including the hover/edit/expanded states
called out above, plus a brief note on the design language (type, colour, components) you
chose.
