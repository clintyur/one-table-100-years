# One Table, 100 Years — a Nom Wah Tea Parlor story

▶ **Play online: https://clintyur.github.io/one-table-100-years/**

A short (~10 minute) click-through story game. You sit at **one table** in Nom Wah Tea Parlor on Doyers Street. Every time you do something new (meet the host, look around, flag down the dim sum lady…), time jumps forward, from **1920 to today**. Click the people around you to talk to them and learn the restaurant's history.

## Play it

Play the online version above, or open `index.html` in a browser. It works straight from the folder; no install needed.

Or run a tiny local server from this folder:

```bash
python3 -m http.server 5557
```

Then visit http://localhost:5557.

**Tip for presenting:** add `?stop=N` to the URL to jump straight to an era:
- or use **Presenting? Jump to:** on the title screen
- `?stop=0` is 1920
- `?stop=3` is the 1950s–60s
- `?stop=6` is 2010
- `?stop=8` is Today

## The flow (matches the flowchart)

| # | Era | Action | What you learn |
|---|---|---|---|
| 1 | 1920 | Walk down Doyers St, get seated | The Bloody Angle, the bakery opens |
| 2 | 1930s | Meet the host (May Choy), give your name | Bakery at 15 Doyers, tea at 13, almond cookies & mooncakes |
| 3 | 1940s | Sit back and look around | Bakery = main business, 1943 Exclusion repeal, tea house as family |
| 4 | 1950s–60s | Dim sum lady comes around; meet Wally the busboy | Wally arrives at 16 → manager at 20 |
| 5 | 1970s–80s | Talk to other patrons; the cart comes by | Move to 13 Doyers (1968), Wally buys it (1974), carts, little Wilson |
| 6 | 1990s–2000s | Order tea, learn the blends, tap the table | Quiet years, card games, movie shoots |
| 7 | 2010 | Order from the new made-to-order menu | Wilson takes over: new kitchen, same old room |
| 8 | 2020 | 100th birthday | Pandemic fear, resilience, Instagram, expansion |
| 9 | Today | Finish your meal, walk outside | The faded pink awning, the legacy |

The ending shows "the recipe" that kept Nom Wah going, which answers the research question.

## Editing

- **All words, people and places** are in `js/story.js`. Change a line of dialogue there and refresh. Each step format is documented at the top of the file.
- **Art** is drawn in code (SVG) in `js/art/`:
  - `people.js`: the character builder
  - `room.js`: the dining room for each era
  - `street.js`: Doyers Street
  - `things.js`: food, cars, radios and phones
- **Music & sound** are synthesized in `js/audio.js`, with one period track per era: ragtime, swing, big band, doo-wop, disco, boom-bap, indie pop and lo-fi.
- **Look & feel** is in `css/style.css`, including each era's color grading (sepia → full color).

## Emailing it (one-file version)

`tools/make_zip.sh` bundles everything (code, art, music, fonts) into **one** self-contained file, `dist/One-Table-100-Years.html`, and zips it with `HOW TO PLAY.txt` as `dist/One-Table-100-Years.zip` (~190 KB). The one-file version works offline and contains no `.js` files, which matters because Gmail blocks zips that contain `.js` files.

## Putting it online

It's a plain static site, so any static host works. For example:
- drag the folder onto Netlify Drop
- push to a GitHub repo and turn on GitHub Pages

## Notes

This is an unofficial student/fan project, not affiliated with Nom Wah Tea Parlor. Some characters are fictional, and the dialogue is dramatized from the sources. See `docs/SOURCES.md` for where every fact comes from.
