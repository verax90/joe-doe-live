# joe doe · live

A live coding studio in the browser for [joedoe.dev](https://joedoe.dev): sound with [Strudel](https://strudel.cc), visuals with [Hydra](https://hydra.ojack.xyz) and MIDI control, all in one editor. English and Spanish.

- **Live room** (More → Live room): open a room and send its link (`?sala=<id>`); listeners hear your code made in their own browser, with your visual, every play and stop, and the kits of your own samples the code uses. Browsers connect directly over WebRTC (PeerJS, whose free public server only introduces them; loaded only when a room is used). Not sent: your voice or free play. Each browser keeps its own bar line. With "share the image" ticked, what the webcam visuals show (camera, video or tab) goes as WebRTC video and the listeners' webcam visuals use it; their own camera is never opened.
- **Caption** (More → Caption): your name, the song's title and live.joedoe.dev over the visuals, bottom right so the code stays clear, for streams. The title can follow what plays (the live set's song, or else the picked pattern). OBS captures it with the screen, and both video recordings draw it into their frames (the horizontal one now composites the visuals, the audio waves where they sit on screen, and the caption).
- **Live set** (More → Live set): the running order for a gig, each song a pattern with its visual. During the set a bar at the bottom shows where you are; ◀ ▶, ← →, a presentation clicker (PageUp / PageDown) or the MPK pads in PROG CHANGE mode move through it, and while it plays the next song comes in on the next bar with its own tempo and visual.
- **Offline and installable**: a service worker (written at build time with the exact file list) keeps the app and every sound once played; More → Live set → Get ready to play offline downloads every sound the set's songs use. Chrome offers to install it as an app.
- **Learn** (More → Learn): 14 short steps from one sound to a song with visuals, each playable with one click and ending in a small challenge.
- **Compose** (More → Compose): build a song layer by layer without writing code. Style (boom bap, lo-fi, trap, drill), key and chord progression are shared by six layers (drums, hats, bass, chords, melody, background); each is a named track in the code (`bass: …`) with Another, Mute and Remove. The Arrangement grid sets when each layer plays, in 8 parts of 4 bars (32 bars that loop), written as a `.mask("<1!8 0!4 …>")` at the end of the line so hand edits stay; Typical song fills in an intro, entries, a break and an ending.
- **Built-in patterns**: lofi, boom bap on the E-mu SP-1200 and the Akai MPC60, three harder 90s New York ones (Shaolin, Queensbridge, Raw), trap on the 808, UK drill, G-funk, phonk, old school 808, dembow, drum and bass, house on the 909, a bare-minimum example, and templates for your own samples, the MPK Mini and any MIDI controller.
- **Tracks**: the Cheatsheet's Insert adds a pattern as a `$:` track (and turns loose patterns into tracks), so everything you add plays together. `_$:` or `_name:` mutes one.
- **Undo / redo** buttons next to Play; while playing, you hear each step.
- **Save as session** (More): a dated `.md` for the Sessions gallery on joedoe.dev (`/music/sessions`), with the code, the visual and room for a YouTube link.
- **Copy, download and open** the code (More): downloads are dated `.js` files that open again from the menu or by dropping them on the page.
- **Help** (the ? button, or the `?` key; in the menu on phones): getting started, shortcuts, every MPK Mini control in each mode, the panels and troubleshooting.
- **Visuals apart from the sound**: 22 to pair with any pattern. Some follow the bar (`H("...")`), others listen to the audio; **Auto** changes to another every 4 bars. **Lines** stacks lines with mountains in the middle, after the *Unknown Pleasures* cover and FLUUUID's [Lines](https://labs.fluuu.id/lines/): each new line is what sounds now (read off the limiter, so any pattern moves it), entering at the front and moving back, drawn on a canvas Hydra reads as `s1`.
- **Video** (More → Video): YouTube links or a playlist behind everything (no effects: YouTube does not let pages read its picture), or your own videos / a captured tab through the webcam visuals, with every effect.
- **YouTube queue** (More → Video → YouTube behind, `src/youtube.ts`): paste a link and Add (or Enter) and it joins the end of the queue without touching the video on: YouTube's own IFrame API player (loaded on first use) plays one video and, when it ends, the next (the first again after the last); ▶ plays one now, ✕ takes one out, Next skips, Remove all stops. Titles come from YouTube's oEmbed; a video its author does not let embed is skipped with a word; captions are kept off; a playlist link plays that list. The queue is remembered.
- **Tempo**: BPM field and Tap in the bar; changes apply at once and are written into the pattern's `setcps` line.
- **Separate tracks** (What to record → Separate tracks): a .zip with a WAV per voice, plus the mix (after the limiter), the mic and the backing track, all the same length from the same instant, for a DAW. While it records, the code plays with each voice on an orbit of its own (`tracks.ts` `stemCode`: every playing `$:` or named track, or each part of a `stack(...)`, gets `.orbit(11…)`, without touching the editor, also after Ctrl+Enter); superdough gives every orbit its own output, and each is tapped as it appears. Files are named after the track's label or its main sound (`2_bd`, `bass`). Voices that set their own orbit keep it. The zip is written without a library (stored, CRC-32).
- **History** (More → History): every version of the code that played (Play or Ctrl+Enter), the last 50, not the same twice in a row, kept across reloads; each with its time, its first playing line and how many lines changed. ↩ loads it as one edit (Ctrl+Z undoes it), ▶ loads and plays it. The draft is also saved when the page goes away, not only every 3 s.
- **Share**: the button copies a link with the pattern and the visual inside the URL.
- **Your samples**: drop audio files or folders (each folder a kit) on the page and use them with `s("name")` or `s("kit:3")`. They stay in the browser (IndexedDB). The MPK's bank B pads can play one of your kits, eight sounds at a time (MIDI panel), like pad banks on an MPC. Kits open into their numbered sounds: ▶ to hear one, + to pick it, and Add as a track puts the picked ones in your code in that order, with a `.cut(n)` of its own, so a sample longer than its step (a phrase, a loop) stops when it plays again instead of piling up on itself, and one track never cuts another.
- **Tools**: other browser-based live coding tools, read from the [joedoe.dev/art](https://joedoe.dev/art?cat=livecoding) shelf. A few open inside the studio.
- **Errors you can read**: syntax slips, misspelled names and missing sounds show up in plain words, not only in the console.
- **Save** patterns in the browser (localStorage). The draft saves itself every few seconds.
- **Record a riff** (MIDI panel): play a few bars on the MPK (keys and bank B pads) and get them back as `$:` tracks, quantised to eighths or sixteenths, one bracket per bar. Over a playing pattern it starts on its next bar and measures against what you hear (the scheduler's `now()` minus its latency); with nothing playing, a one-bar count-in and a click at the BPM field's tempo. **Or hum it**: with *From: Voice* the take is the mic before its effects, over the same bars (shifted by the looper's mic lag); `src/hum.ts` reads its pitch every 10 ms with YIN at 12 kHz, each grid step takes the median of its voiced moments, a note that goes on is held with `_` unless the voice dipped (re-sung), and in a key (Play in a key) each note moves to the scale. You get `note("c4 e4 g4 _ ~ a4 a4 g4").s(<keys sound>)`. Best with headphones, so the music stays out of the mic.
- **MIDI panel**: shows which note or `cc` each pad or knob sends, to use with `midin()` and `midikeys()`.
- **MIDI program change picks the visual**: program 0 is the first visual in the list, 1 the second, and so on (on the MPK Mini, the pads in PROG CHANGE mode).
- **MPK Mini Mk II preset**, mapped from the controller: keys, bank B pads, knobs, joystick, and CC-mode pads as hold-to-apply effects.
- **Themes** (More → Theme): fourteen pairings of an accent colour and one of Strudel's code themes. The UI, the ASCII filter and the built-in visuals follow; in your own visuals use `.color(...tint(0.4))`.
- **Scenes**: in a pattern that uses `.mask(part(n))`, parts switch on and off with the number keys 1-8, a click on the strip at the bottom, or MPK pads in CC mode. The "Scenes" pattern is a ready example. MIDI program change can also switch patterns instead of visuals (MIDI panel).
- **Recording**: WAV audio, a video of the screen (optionally with the code top left, cut to fit the left 60% so the visuals still show), or a vertical 9:16 video (1080 × 1920) for socials with the code on top if you like. MP4 when the browser can record it (Chrome 126+), WebM otherwise.
- **Go to the error**: when the code does not evaluate and the message says where, the status bar offers *Go to line N*, which selects it and focuses the editor; an error at the very start of a line is usually a bracket or quote left open on the last line with code before it (blank lines skipped): the message says so (*At the end of line 2 (or on 4)*) and the cursor lands at the end of that line, with nothing selected, ready to type what is missing.
- **What's new** (Help → What's new, `src/news.ts`): the latest additions, one line each with an Open button that takes you there (its panel, tab, visual or recording mode); the ? button carries a dot until you have seen them, and the help opens on them then. Panels close from their own ✕ or with Escape.
- **Play tells where you are** (`src/play-state.ts`): ▶ Play when stopped; ▶ Playing, outlined, when what sounds is what you see; ↻ Apply, lit and breathing, when the code has changes not applied yet (whitespace does not count, and code that failed to evaluate is not applied, since Strudel keeps the version before). The button keeps its width, so the bar never shifts.
- **Save and share** (More → Save and share…, Ctrl+S to save at once): one dialog with the pattern saved in this browser (name, delete), the share link, the exports (copy the code, a `.js`, a session page for joedoe.dev) and opening a `.js` (`src/project.ts`).
- **Quick finder** (Ctrl+K, or More → Search…): a few letters and Enter open any panel, run any menu or bar action, or pick a pattern or a visual; accents and case do not matter, and what starts with the letters comes first (`src/finder.ts`). On phones the More menu lays its items two to a row.
- **Whole session** (What to record → Whole session): for a jam of an hour or two, compressed audio (Opus in WebM, or AAC; about 90 MB an hour where a WAV is over 600) with markers: every change of code (its first new line and how many lines changed), every Stop and Play, and ★ (or Alt+M) whenever something is worth keeping. Stop gives a .zip: the audio, `marcas_audacity.txt` (Audacity: File → Import → Labels, and the markers sit on the waveform) and `sesion.md`, the chapters (they paste into a YouTube description) and every version of the code at its time, so a good moment can be cut out and its code taken back (`src/session.ts`).
- **TouchMe** (Playtronica): its notes play like the MPK keys without Play; `touch()` is how strong the touch is (its CC 90, 0 to 1, eased, back to 0 when you let go; units that send no CC 90, a setting, get it from the note, over the range of notes seen so far) and `touching()` whether anyone touches, for patterns (`.lpf(ref(() => 300 + touch() * 5000))`) and Hydra. The device is found by its name or as whatever sends CC 90. A "TouchMe" pattern and a "Touch" visual use them.
- **SP-404 / MIDI out** (More → SP-404): end a pattern in `.sp()` and its events go out as MIDI instead of sound, with Web MIDI timestamps so they leave on time. `s("a1 ~ a5 a1").sp()` plays pads by bank and number (the SP-404MKII's MIDI note map, mode A or B), `n("1 5 9 13").sp("b")` pads of one bank, `note("c3 e3").sp()` the chromatic sample (channel 16), `ccn(16).ccv(…).midichan(1).sp()` the effect controls. "Send the tempo" stacks 96 clock ticks per cycle onto the playing pattern, so the clock comes from the same scheduler as the notes, plus Start on cycle 0 and Stop. Notes echoed back by the device are ignored by free play.
- **Looper** (More → Looper): record 1, 2 or 4 bars of the mic (or the backing track, or everything) over the playing pattern, starting on the next bar you hear, and it repeats in time straight away. Each layer is saved as a sample (`capa1`, `capa2`…) and added as a line, `$: s("capa1").loopAt(2)` (with `.late(n)` when the take did not start on a multiple of its length), so it can be muted, turned up or edited like any track. The first repeat is played by an `AudioBufferSourceNode` at the audio time of the next loop, since Strudel has already planned that bar; the line takes over from the one after. With the mic, the output latency (capped at 150 ms) plus 10 ms and a Timing nudge are taken off the take. Undo the last layer, or remove all.
- **Sampler** (More → Sampler): take 1, 2, 4 or 8 bars of the backing track, the mic or everything that sounds and keep them as your own samples, like chopping a record on an MPC. While the studio plays, the take starts on the next bar you hear and is whole bars long; the bar times come from `src/cycle-clock.ts`, a silent event on every beat stacked onto the playing pattern, whose trigger gets the exact audio time Strudel schedules it for (the riff recorder uses it too). Saved normalised, twice: `s("muestra1")` whole (`.loopAt(bars)` plays it in time) and `s("muestra1_trozos")`, its chops for the pads or `n("0 3 1 …")`: 4, 8 or 16 equal, or 8 or 16 by hits (the strongest rises of the onset curve, each cut refined to 2 ms before its attack), shown on the waveform before saving; stored with your other samples.
- **Backing track** (More → Backing track): a song under the patterns, from a file (any audio, or a video's sound) or another tab's sound captured with screen sharing (its own playback muted with `suppressLocalAudioPlayback`). It goes into the master before the limiter, so the volume knob, recordings, the audio waves and the Lines visual get it; not sent to a live room. A file can start from the top with the studio's Play (when the first bar is heard) and stop and rewind with Stop; volume and repeat. **Detect the tempo** reads a decoded song's first minute at once (or listens to a tab for 10 s): an onset curve from the rise in energy every 10 ms, autocorrelated between 60 and 180 BPM with a gentle preference for 80-120, so a beat is not read as its double; the result goes into the BPM field, with ÷2 and ×2 to fix a half or double reading.
- **Tuner and voice synth** (Mic → Tuner): while the mic is on, `src/voice.ts` reads the voice's pitch 40 times a second (YIN from `hum.ts` on the mic before its effects, the median of the last five readings) and shows the note and how many cents off. *Your voice plays a synth*: an oscillator (saw, square, triangle, sine) through a gentle low-pass follows it free, to the nearest semitone or to the key, −2 to +1 octaves, as loud as you sing and silent when you stop; a reading that is the synth's own note coming back through the mic is ignored (possible when it is an octave away), but headphones are best. `voiceNote()` (MIDI, 0 when silent), `voiceHeld()` (the last note sung), `voiceLevel()` (0–1, quick up and slow down) and `voiceColor(0|1|2)` (the note's colour, the twelve notes round the colour wheel from C red, gliding) are globals for patterns and Hydra; the visuals *Voice (colour by note)* and *Voice (shapes by pitch)*, kept out of Auto, use them.
- **Build-up and drop** (More → Build-up): from the next bar, 2, 4 or 8 bars that build up and a drop on the one, none of it in the code (`src/drop.ts`). A TR-909 snare roll in four stages (4, 8, 16, 32 hits a bar) growing louder, handed to Strudel a quarter of a second ahead so Stop leaves nothing behind; white noise through a band-pass rising from 300 Hz to 9 kHz; a high-pass between the master and the limiter taking everything that plays up to 900 Hz; optionally an eighth of a bar of silence; and on the one, all back with a boom (a sine falling 110 → 40 Hz) and a crash. Bar times come from `cycle-clock.ts`; measured, the drop lands within 10 ms of the bar.
- **Pump** (More → Pump): sidechain without touching the code. Strudel's own `duckorbit` does the ducking, but everything plays on orbit 1, the kick too; so `src/pump.ts` maps every value on its way to the scheduler (a `withValue` around `setPattern`, read on each sound so switching it needs no new Play): a kick (`bd`, `kick`) without an orbit moves to orbit 9 and ducks every other orbit that has played and exists, with the amount as `duckdepth`, a 4 ms `duckonset` and the swell back in beats as `duckattack`. Stems keep working: their voices have orbits, and a kick ducks the others.
- **Play in a key** (MIDI → Play without Play): a key and a scale (major, minor, Dorian, harmonic minor, minor pentatonic, blues); every note played without Play moves to the nearest one of it (ties go down), and with chords on one key plays the scale's chord (third and fifth above in the scale; next two steps in five- and six-note scales). The riff recorder writes what sounded.
- **Computer keyboard** (MIDI → Play without Play): A W S E D F T G Y H U J K O L P Ñ as a piano, Z/X octave, 1–8 the pads (unless the pattern uses parts), read by key position so any layout works; notes go out as the MPK's, so free play and the riff recorder take them. Never while typing in the editor or a field.
- **Phone as controller** (More → Phone as controller): a QR code and a link to `mando.html`, a separate light page (no Strudel, no Hydra; 2.5 kB plus PeerJS) with an XY pad, 8 pads and 8 knobs, connected to the studio over WebRTC like the live room. Pads arrive as the MPK's bank B pads (notes 32-39) and knobs as its knobs (CC 1-8), so free play, the master volume, the VJ and the knob HUD all respond; the XY is `phoneX()` and `phoneY()`. The studio's id is kept, so the link stays the same and the phone reconnects on its own; the QR code comes from `qrcode-generator`, loaded only then.
- **Mic** (More → Mic): a microphone or any input (an SP-404MKII over USB, say) through a noise gate, volume, pitch (an octave down or up), distortion, lo-fi bits, a band filter, muffle, auto-wah, robot, tremolo, vibrato, flanger, chorus, echo, ping-pong and reverb, with 28 presets in four groups (space, radio and tape, characters, machines). The gate and the auto-wah's level follower run in an AudioWorklet, sample by sample. While the studio plays, the echo and the ping-pong land on a dotted eighth of its tempo. The browser's voice-call processing is off. It goes into recordings, through its own compressor and a soft clip so it never clips; Hear me also sends it into the studio's limiter (headphones only). Not sent to a live room.
- **VJ** (More → VJ): six effects over any built-in visual (zoom, colour, warp, pixels, trails, spin). The visual draws into Hydra's `o1` and a chain reading `globalThis.vj` draws it into `o0`, so moving a control runs nothing again; neutral leaves the picture as it was. Sliders, or MPK knobs 1–6 when ticked (the knob HUD follows).
- **Sequencer** (More → View → Sequencer): every playing track (each part of a stack) gets Strudel's own inline view under its line: `._pianoroll()` for notes, `._punchcard()` for the rest, with a `.color()` from a palette of six when it has none, which also colours its highlighted notes. One edit on, one off (it takes out only what it added; your own colours stay), so Ctrl+Z undoes it; the views sit on a dark band so they read over any visual (`withSequencer` in `src/tracks.ts`, `src/sequencer.ts`).
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
