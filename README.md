# joe doe · live

A live coding studio in the browser for [joedoe.dev](https://joedoe.dev): sound with [Strudel](https://strudel.cc), visuals with [Hydra](https://hydra.ojack.xyz) and MIDI control, all in one editor. English and Spanish.

- **Live room** (More → Live room): open a room and send its link (`?sala=<id>`); listeners hear your code made in their own browser, with your visual, every play and stop, and the kits of your own samples the code uses. Browsers connect directly over WebRTC (PeerJS, whose free public server only introduces them; loaded only when a room is used). Not sent: your voice or free play. Each browser keeps its own bar line. With "share the image" ticked, what the webcam visuals show (camera, video or tab) goes as WebRTC video and the listeners' webcam visuals use it; their own camera is never opened.
- **Live set** (More → Live set): the running order for a gig, each song a pattern with its visual. During the set a bar at the bottom shows where you are; ◀ ▶, ← →, a presentation clicker (PageUp / PageDown) or the MPK pads in PROG CHANGE mode move through it, and while it plays the next song comes in on the next bar with its own tempo and visual.
- **Offline and installable**: a service worker (written at build time with the exact file list) keeps the app and every sound once played; More → Live set → Get ready to play offline downloads every sound the set's songs use. Chrome offers to install it as an app.
- **Learn** (More → Learn): 14 short steps from one sound to a song with visuals, each playable with one click and ending in a small challenge.
- **Compose** (More → Compose): build a song layer by layer without writing code. Style (boom bap, lo-fi, trap, drill), key and chord progression are shared by six layers (drums, hats, bass, chords, melody, background); each is a named track in the code (`bass: …`) with Another, Mute and Remove. The Arrangement grid sets when each layer plays, in 8 parts of 4 bars (32 bars that loop), written as a `.mask("<1!8 0!4 …>")` at the end of the line so hand edits stay; Typical song fills in an intro, entries, a break and an ending.
- **Built-in patterns**: lofi, boom bap on the E-mu SP-1200 and the Akai MPC60, three harder 90s New York ones (Shaolin, Queensbridge, Raw), trap on the 808, UK drill, G-funk, phonk, old school 808, dembow, drum and bass, house on the 909, a bare-minimum example, and templates for your own samples, the MPK Mini and any MIDI controller.
- **Tracks**: the Cheatsheet's Insert adds a pattern as a `$:` track (and turns loose patterns into tracks), so everything you add plays together. `_$:` or `_name:` mutes one.
- **Undo / redo** buttons next to Play; while playing, you hear each step.
- **Save as session** (More): a dated `.md` for the Sessions gallery on joedoe.dev (`/music/sessions`), with the code, the visual and room for a YouTube link.
- **Copy, download and open** the code (More): downloads are dated `.js` files that open again from the menu or by dropping them on the page.
- **Help** (More → Help, or `?`): getting started, shortcuts, every MPK Mini control in each mode, the panels and troubleshooting.
- **Visuals apart from the sound**: 22 to pair with any pattern. Some follow the bar (`H("...")`), others listen to the audio; **Auto** changes to another every 4 bars.
- **Video** (More → Video): YouTube links or a playlist behind everything (no effects: YouTube does not let pages read its picture), or your own videos / a captured tab through the webcam visuals, with every effect.
- **Tempo**: BPM field and Tap in the bar; changes apply at once and are written into the pattern's `setcps` line.
- **Share**: the button copies a link with the pattern and the visual inside the URL.
- **Your samples**: drop audio files or folders (each folder a kit) on the page and use them with `s("name")` or `s("kit:3")`. They stay in the browser (IndexedDB). The MPK's bank B pads can play one of your kits, eight sounds at a time (MIDI panel), like pad banks on an MPC. Kits open into their numbered sounds: ▶ to hear one, + to pick it, and Add as a track puts the picked ones in your code in that order.
- **Tools**: other browser-based live coding tools, read from the [joedoe.dev/art](https://joedoe.dev/art?cat=livecoding) shelf. A few open inside the studio.
- **Errors you can read**: syntax slips, misspelled names and missing sounds show up in plain words, not only in the console.
- **Save** patterns in the browser (localStorage). The draft saves itself every few seconds.
- **Record a riff** (MIDI panel): play a few bars on the MPK (keys and bank B pads) and get them back as `$:` tracks, quantised to eighths or sixteenths, one bracket per bar. Over a playing pattern it starts on its next bar and measures against what you hear (the scheduler's `now()` minus its latency); with nothing playing, a one-bar count-in and a click at the BPM field's tempo.
- **MIDI panel**: shows which note or `cc` each pad or knob sends, to use with `midin()` and `midikeys()`.
- **MIDI program change picks the visual**: program 0 is the first visual in the list, 1 the second, and so on (on the MPK Mini, the pads in PROG CHANGE mode).
- **MPK Mini Mk II preset**, mapped from the controller: keys, bank B pads, knobs, joystick, and CC-mode pads as hold-to-apply effects.
- **Themes** (More → Theme): fourteen pairings of an accent colour and one of Strudel's code themes. The UI, the ASCII filter and the built-in visuals follow; in your own visuals use `.color(...tint(0.4))`.
- **Scenes**: in a pattern that uses `.mask(part(n))`, parts switch on and off with the number keys 1-8, a click on the strip at the bottom, or MPK pads in CC mode. The "Scenes" pattern is a ready example. MIDI program change can also switch patterns instead of visuals (MIDI panel).
- **Recording**: WAV audio, a video of the screen, or a vertical 9:16 video (1080 × 1920) for socials with the code on top if you like. MP4 when the browser can record it (Chrome 126+), WebM otherwise.
- **VJ** (More → VJ): six effects over any built-in visual (zoom, colour, warp, pixels, trails, spin). The visual draws into Hydra's `o1` and a chain reading `globalThis.vj` draws it into `o0`, so moving a control runs nothing again; neutral leaves the picture as it was. Sliders, or MPK knobs 1–6 when ticked (the knob HUD follows).
- **Audio waves** (More): an oscilloscope of the studio's output along the bottom, over any visual, tapped after the limiter; vertical videos include it.
- **Vertical framing** (More): the visuals and the code in a 9:16 column under the bar, for vertical streams. On a 1920 × 1080 screen with Chrome full screen, that column is x 672–1248, y 56–1080 (576 × 1024): an OBS scene cropping 672 left, 672 right and 56 top, stretched to 1080 × 1920, streams exactly it. Hydra draws at the column's size, so nothing is stretched.
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
| `←` `→` / `PageUp` `PageDown` | Previous / next song in a live set |

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
