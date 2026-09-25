// Barra de estado: errores del código en español y aviso mientras se cargan sonidos.
// Strudel informa por dos vías: el evento "update" del editor (errores al evaluar
// o al sonar) y el evento "strudel.log" del documento (carga de samples).

type ReplState = { error?: unknown; pending?: boolean };
type LogDetail = { message: string; type?: string };

// Traduce los errores más habituales a algo que se entienda en pleno directo
export function explainError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  const at = raw.match(/\((\d+):(\d+)\)/);
  const line = at ? `Línea ${at[1]}: ` : '';
  const rules: [RegExp, (m: RegExpMatchArray) => string][] = [
    [/Unterminated string/i, () => 'faltan unas comillas por cerrar'],
    [/Unexpected token/i, () => 'algo sobra o falta: ¿un paréntesis, una coma o unas comillas?'],
    [/sound (\S+?) not found/i, (m) => `no existe el sonido ${m[1]}. Revisa el nombre o mira tu lista en Samples`],
    [/(\w+) is not defined/i, (m) => `"${m[1]}" no existe: ¿está bien escrito?`],
    [/([\w.]+) is not a function/i, (m) => `${m[1]} no es una función: revisa el nombre`],
    [/midi device .* not found|No MIDI devices found/i, () => 'no encuentro ese dispositivo MIDI. Mira el nombre exacto en el panel MIDI'],
  ];
  const sentence = (text: string) => (line ? line + text : text.charAt(0).toUpperCase() + text.slice(1));
  for (const [pattern, explain] of rules) {
    const match = raw.match(pattern);
    if (match) return { text: sentence(explain(match)), raw };
  }
  return { text: sentence(raw), raw };
}

export function setupStatus(repl: HTMLElement) {
  const bar = document.querySelector<HTMLElement>('#status')!;
  const text = bar.querySelector<HTMLElement>('.status-text')!;
  const detail = bar.querySelector<HTMLElement>('.status-detail')!;

  type Shown = { text: string; raw: string };
  // Errores al evaluar (vienen con el estado del editor) y errores mientras suena
  // (solo llegan como mensaje de registro); estos duran hasta el siguiente play
  let evalError: Shown | null = null;
  let runtimeError: Shown | null = null;
  let loading = false;
  let loadingTimer: number | undefined;

  const render = () => {
    const error = evalError ?? runtimeError;
    if (error) {
      bar.dataset.kind = 'error';
      text.textContent = error.text;
      detail.textContent = error.raw === error.text ? '' : error.raw;
      bar.hidden = false;
    } else if (loading) {
      bar.dataset.kind = 'loading';
      text.textContent = 'Cargando sonidos…';
      detail.textContent = '';
      bar.hidden = false;
    } else {
      bar.hidden = true;
    }
  };

  repl.addEventListener('update', (event) => {
    const state = (event as CustomEvent<ReplState>).detail;
    if (state.pending) runtimeError = null;
    evalError = state.error ? explainError(state.error) : null;
    render();
  });

  document.addEventListener('strudel.log', (event) => {
    const { message, type } = (event as CustomEvent<LogDetail>).detail;
    if (type === 'load-sample' || type === 'loaded-sample') {
      // Los avisos de carga se repiten y a veces se agrupan: en vez de contarlos,
      // se muestra "cargando" hasta que pasa un rato sin ninguno
      loading = true;
      clearTimeout(loadingTimer);
      loadingTimer = window.setTimeout(() => {
        loading = false;
        render();
      }, 800);
      render();
    } else if (type === 'error' && /could not load/.test(message)) {
      const name = message.match(/"([^"]+)"/)?.[1] ?? '';
      runtimeError = { text: `No se pudo descargar el sonido ${name}. ¿Hay conexión?`, raw: message };
      render();
    } else {
      // Errores mientras suena, p. ej. "[getTrigger] error: sound x not found!"
      const runtime = message.match(/^\[[\w-]+\] error: (.+)$/);
      if (runtime && runtime[1] !== runtimeError?.raw) {
        runtimeError = explainError(runtime[1]);
        render();
      }
    }
  });
}
