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
- **MIDI program change picks the visual**: program 0 is the first visual in the list, 1 the second, and so on (on the MPK Mini, the pads in PROG CHANGE mode).
- **MPK Mini Mk II preset**, mapped from the controller: keys, bank B pads, knobs, joystick, and CC-mode pads as hold-to-apply effects.
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

## Strudel internals this relies on

Strudel is pinned to an exact version (`@strudel/repl` 1.3.0) because the studio
reaches past its public editor into a few internals. After any upgrade, check:

| What | Used for | Where |
|---|---|---|
| Globals set by Strudel's `evalScope`: `samples`, `initHydra`, `getAnalyzerData`, `getAudioContext`, `getSuperdoughAudioController`, `superdough` | samples, bundled Hydra, audio-reactive visuals, limiter, free play | `samples.ts`, `visuals.ts`, `limiter.ts`, `freeplay.ts` |
| `getSuperdoughAudioController().output.destinationGain` | inserting the limiter and the recording tap | `limiter.ts`, `record.ts` |
| `<strudel-editor>`'s `editor` (StrudelMirror: `code`, `setCode`, `evaluate`, `stop`, `repl.scheduler.started`) and its `update` event (`error`, `pending`) | the whole UI, error bar | `main.ts`, `status.ts` |
| The `strudel.log` document event and its message texts (`load-sample`, `[getTrigger] error: …`) | loading notice, runtime errors | `status.ts` |
| `midin(name)(cc, channel)` and `midikeys(name)()` | the MIDI presets | `presets.ts` |

## License

[AGPL-3.0-or-later](LICENSE), the same as Strudel and Hydra, which it builds on.
