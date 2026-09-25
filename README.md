# joe doe · live

Estudio de live coding en el navegador para [joedoe.dev](https://joedoe.dev): sonido con [Strudel](https://strudel.cc), visuales con [Hydra](https://hydra.ojack.xyz) y control por MIDI, todo en un mismo editor.

- **Patrones incluidos**: lofi, ejemplo mínimo, plantilla para tus samples y plantilla para controlador MIDI.
- **Visuales aparte del sonido**: elige uno en el selector y combínalo con cualquier patrón. Unos siguen el compás (`H("...")`) y otros escuchan el audio.
- **Compartir**: el botón copia un enlace con el patrón y el visual dentro de la URL.
- **Tus samples**: arrastra archivos de audio a la página y úsalos con `s("nombre")`. Se guardan en el navegador (IndexedDB).
- **Guardar** patrones en el navegador (localStorage). El borrador se guarda solo cada pocos segundos.
- **Panel MIDI**: muestra qué nota o `cc` manda cada pad o knob, para usarlos con `midin()` y `midikeys()`.
- **Modo concierto**: `Ctrl+Shift+H` oculta el código y deja solo los visuales.

## Visuales que escuchan el audio

Añade `.analyze(1)` al final de tu patrón y usa estas funciones en el código de Hydra (devuelven de 0 a 1):

| Función | Qué mide |
|---|---|
| `bass()` | graves (20–150 Hz), ideal para el bombo |
| `mid()` | medios (150–2000 Hz) |
| `high()` | agudos (2–10 kHz), charles y platos |
| `level()` | volumen general |

```js
osc(10, 0.1).scale(() => 1 + bass()).out()
```

## Atajos

| Tecla | Acción |
|---|---|
| `Ctrl+Enter` | Play / actualizar |
| `Ctrl+.` | Stop |
| `Ctrl+Shift+H` | Mostrar u ocultar el código |

## Desarrollo

Requiere Node 22 y pnpm.

```bash
pnpm install
pnpm dev
pnpm build
```

Web MIDI solo funciona en navegadores Chromium (Chrome, Edge, Brave) y en `localhost` o HTTPS.

## Licencia

[AGPL-3.0-or-later](LICENSE), la misma que Strudel y Hydra, en los que se basa.
