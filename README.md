# joe doe · live

Estudio de live coding en el navegador para [joedoe.dev](https://joedoe.dev): sonido con [Strudel](https://strudel.cc), visuales con [Hydra](https://hydra.ojack.xyz) y control por MIDI, todo en un mismo editor.

- **Patrones incluidos**: lofi, ejemplo mínimo, plantilla para controlador MIDI y solo visuales.
- **Guardar** patrones en el navegador (localStorage). El borrador se guarda solo cada pocos segundos.
- **Panel MIDI**: muestra qué nota o `cc` manda cada pad o knob, para usarlos con `midin()` y `midikeys()`.
- **Modo concierto**: `Ctrl+Shift+H` oculta el código y deja solo los visuales.

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
