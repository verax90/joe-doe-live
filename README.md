# joe doe · live

A live coding studio in the browser for [joedoe.dev](https://joedoe.dev): sound with [Strudel](https://strudel.cc), visuals with [Hydra](https://hydra.ojack.xyz) and MIDI control, all in one editor. English and Spanish.

- **Learn** (More → Learn): 14 short steps from one sound to a song with visuals, each playable with one click and ending in a small challenge.
- **Compose** (More → Compose): build a song layer by layer without writing code. Style (boom bap, lo-fi, trap, drill), key and chord progression are shared by six layers (drums, hats, bass, chords, melody, background); each is a named track in the code (`bass: …`) with Another, Mute and Remove.
- **Built-in patterns**: lofi, boom bap on the E-mu SP-1200 and the Akai MPC60, trap on the 808, UK drill, G-funk, phonk, old school 808, dembow, drum and bass, house on the 909, a bare-minimum example, and templates for your own samples, the MPK Mini and any MIDI controller.
- **Tracks**: the Cheatsheet's Insert adds a pattern as a `$:` track (and turns loose patterns into tracks), so everything you add plays together. `_$:` or `_name:` mutes one.
- **Undo / redo** buttons next to Play; while playing, you hear each step.
- **Copy, download and open** the code (More): downloads are dated `.js` files that open again from the menu or by dropping them on the page.
- **Help** (More → Help, or `?`): getting started, shortcuts, every MPK Mini control in each mode, the panels and troubleshooting.
- **Visuals apart from the sound**: 22 to pair with any pattern. Some follow the bar (`H("...")`), others listen to the audio; **Auto** changes to another every 4 bars.
- **Video** (More → Video): YouTube links or a playlist behind everything (no effects: YouTube does not let pages read its picture), or your own videos / a captured tab through the webcam visuals, with every effect.
- **Tempo**: BPM field and Tap in the bar; changes apply at once and are written into the pattern's `setcps` line.
- **Share**: the button copies a link with the pattern and the visual inside the URL.
- **Your samples**: drop audio files on the page and use them with `s("name")`. They stay in the browser (IndexedDB).
- **Tools**: other browser-based live coding tools, read from the [joedoe.dev/art](https://joedoe.dev/art?cat=livecoding) shelf. A few open inside the studio.
- **Errors you can read**: syntax slips, misspelled names and missing sounds show up in plain words, not only in the console.
- **Save** patterns in the browser (localStorage). The draft saves itself every few seconds.
- **MIDI panel**: shows which note or `cc` each pad or knob sends, to use with `midin()` and `midikeys()`.
- **MIDI program change picks the visual**: program 0 is the first visual in the list, 1 the second, and so on (on the MPK Mini, the pads in PROG CHANGE mode).
- **MPK Mini Mk II preset**, mapped from the controller: keys, bank B pads, knobs, joystick, and CC-mode pads as hold-to-apply effects.
- **Themes** (More → Theme): fourteen pairings of an accent colour and one of Strudel's code themes. The UI, the ASCII filter and the built-in visuals follow; in your own visuals use `.color(...tint(0.4))`.
- **Scenes**: in a pattern that uses `.mask(part(n))`, parts switch on and off with the number keys 1-8, a click on the strip at the bottom, or MPK pads in CC mode. The "Scenes" pattern is a ready example. MIDI program change can also switch patterns instead of visuals (MIDI panel).
- **Performance mode**: `Ctrl+Shift+H` hides the code and leaves only the visuals.

## Language

English by default. The studio follows `?lang=en|es`, then the `jd-lang` cookie shared with joedoe.dev, then the browser language. The EN / ES button switches and remembers it.

## Shortcuts

| Key | Action |
|---|---|
| `Ctrl+Enter` | Play / update |
| `Ctrl+.` | Stop |
| `Ctrl+Shift+H` | Show or hide the code |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Undo / redo |
| `1`–`8` | Switch scene parts on and off |
| `?` | Help |

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
| `$:` and named labels (`bass:`) become `.p(id)`; once any exists, the bare last expression is dropped; `_` in front mutes | Insert, Compose | `tracks.ts`, `compose.ts` |
| `H(pattern)` reads the pattern at `getTime()`, and only the transpiler turns `"..."` into mini-notation | built-in visuals, which run without it, pass strings through `mini()` | `visuals.ts` |
| WebMidi.js (behind `midin`) assigns `input.onmidimessage` | the studio listens with `addEventListener` so neither silences the other | `midi.ts` |
| `@strudel/repl` bundles its own CodeMirror, so `@codemirror/*` imports are separate instances | undo/redo press the editor's own Ctrl+Z | `undo.ts` |

## License

[AGPL-3.0-or-later](LICENSE), the same as Strudel and Hydra, which it builds on.
