# joe doe · live

A live coding studio in the browser for [joedoe.dev](https://joedoe.dev): sound with [Strudel](https://strudel.cc), visuals with [Hydra](https://hydra.ojack.xyz) and MIDI control, all in one editor. English and Spanish.

- **Built-in patterns**: lofi, a bare-minimum example, a template for your own samples and one for a MIDI controller.
- **Visuals apart from the sound**: pick one in the selector and pair it with any pattern. Some follow the bar (`H("...")`), others listen to the audio.
- **Share**: the button copies a link with the pattern and the visual inside the URL.
- **Your samples**: drop audio files on the page and use them with `s("name")`. They stay in the browser (IndexedDB).
- **Tools**: other browser-based live coding tools, read from the [joedoe.dev/art](https://joedoe.dev/art?cat=livecoding) shelf. A few open inside the studio.
- **Errors you can read**: syntax slips, misspelled names and missing sounds show up in plain words, not only in the console.
- **Save** patterns in the browser (localStorage). The draft saves itself every few seconds.
- **MIDI panel**: shows which note or `cc` each pad or knob sends, to use with `midin()` and `midikeys()`.
- **Performance mode**: `Ctrl+Shift+H` hides the code and leaves only the visuals.

## Language

English by default. The studio follows `?lang=en|es`, then the `jd-lang` cookie shared with joedoe.dev, then the browser language. The EN / ES button switches and remembers it.

## Shortcuts

| Key | Action |
|---|---|
| `Ctrl+Enter` | Play / update |
| `Ctrl+.` | Stop |
| `Ctrl+Shift+H` | Show or hide the code |

## Visuals that listen to the audio

Add `.analyze(1)` at the end of your pattern and use these in Hydra code (they return 0 to 1):

| Function | Measures |
|---|---|
| `bass()` | lows (20–150 Hz), made for the kick |
| `mid()` | mids (150–2000 Hz) |
| `high()` | highs (2–10 kHz), hats and cymbals |
| `level()` | overall volume |
| `bend()` | MIDI pitch bend, from -1 to 1 (e.g. the MPK joystick sideways) |

```js
osc(10, 0.1).scale(() => 1 + bass()).out()
```

## Development

Needs Node 22 and pnpm.

```bash
pnpm install
pnpm dev
pnpm build
```

Web MIDI only works in Chromium browsers (Chrome, Edge, Brave) and on `localhost` or HTTPS.

## License

[AGPL-3.0-or-later](LICENSE), the same as Strudel and Hydra, which it builds on.
