/**
 * Widget de Scriptable para Desde / Hasta.
 *
 * `npm run build:widget` lo empaqueta junto con src/lib/counter.ts (la misma lógica de conteo
 * que usa la app) en public/widget.js. La app (pantalla "Widget") le antepone `DH_CONFIG`
 * con la URL de Supabase, la anon key y el token, y te lo da para pegar en Scriptable.
 *
 * Parámetro del widget (opcional): parte del nombre de un evento para mostrar ese primero.
 */
import {
  computeCounter,
  describeDates,
  formatQuantities,
  nextRefreshDate,
  toCounterEvent,
  type CounterEvent,
  type CounterView,
} from '../../src/lib/counter';

// ---------------------------------------------------------------------------
// API de Scriptable (lo mínimo que se usa). Declarado en el módulo para no pisar
// los tipos globales de la app (por ejemplo, `Request`).
// ---------------------------------------------------------------------------

interface SColor {
  hex: string;
}
interface SFont {
  readonly __font: true;
}
interface SText {
  font: SFont;
  textColor: SColor;
  lineLimit: number;
  minimumScaleFactor: number;
}
interface SStack {
  spacing: number;
  addText(text: string): SText;
  addStack(): SStack;
  addSpacer(length?: number): void;
  layoutHorizontally(): void;
  layoutVertically(): void;
  centerAlignContent(): void;
}
interface SListWidget extends SStack {
  backgroundColor: SColor;
  url: string;
  refreshAfterDate: Date;
  setPadding(top: number, leading: number, bottom: number, trailing: number): void;
  presentSmall(): Promise<void>;
  presentMedium(): Promise<void>;
}
interface SRequest {
  method: string;
  headers: Record<string, string>;
  body: string;
  timeoutInterval: number;
  response: { statusCode: number };
  loadJSON(): Promise<unknown>;
}
interface SFileManager {
  documentsDirectory(): string;
  joinPath(a: string, b: string): string;
  fileExists(path: string): boolean;
  readString(path: string): string;
  writeString(path: string, content: string): void;
}

declare const ListWidget: new () => SListWidget;
declare const Request: new (url: string) => SRequest;
declare const Color: {
  new (hex: string, alpha?: number): SColor;
  dynamic(light: SColor, dark: SColor): SColor;
};
declare const Font: {
  systemFont(size: number): SFont;
  mediumSystemFont(size: number): SFont;
  semiboldSystemFont(size: number): SFont;
  boldRoundedSystemFont(size: number): SFont;
};
declare const FileManager: { local(): SFileManager };
declare const Script: { setWidget(widget: SListWidget): void; complete(): void };
declare const config: { runsInWidget: boolean; widgetFamily?: string };
declare const args: { widgetParameter: string | null };

interface DesdeHastaConfig {
  supabaseUrl: string;
  anonKey: string;
  token: string;
  appUrl: string;
}
declare const DH_CONFIG: DesdeHastaConfig;

// ---------------------------------------------------------------------------
// Datos
// ---------------------------------------------------------------------------

type WidgetEvent = CounterEvent & {
  id: string;
  title: string;
  emoji: string | null;
  color: string;
};

interface RawRow {
  id: string;
  title: string;
  emoji: string | null;
  color: string;
  kind: string;
  start_date: string;
  end_date: string | null;
  count_start_day: boolean;
  display_unit: string;
}

const CACHE_FILE = 'desde-hasta-cache.json';

class WidgetError extends Error {}

async function fetchEvents(): Promise<WidgetEvent[]> {
  const fm = FileManager.local();
  const cachePath = fm.joinPath(fm.documentsDirectory(), CACHE_FILE);

  let rows: RawRow[];
  try {
    const req = new Request(`${DH_CONFIG.supabaseUrl}/rest/v1/rpc/get_widget_events`);
    req.method = 'POST';
    req.headers = { apikey: DH_CONFIG.anonKey, 'Content-Type': 'application/json' };
    req.body = JSON.stringify({ p_token: DH_CONFIG.token });
    req.timeoutInterval = 15;
    const data = await req.loadJSON();
    const status = req.response.statusCode;
    if (status === 401 || status === 403) {
      throw new WidgetError('El token del widget no es válido o fue revocado. Generá uno nuevo.');
    }
    if (status !== 200 || !Array.isArray(data)) throw new Error(`HTTP ${status}`);
    rows = data as RawRow[];
    fm.writeString(cachePath, JSON.stringify(rows));
  } catch (e) {
    // Sin conexión: se muestra lo último que se descargó (el conteo se recalcula igual).
    if (e instanceof WidgetError || !fm.fileExists(cachePath)) throw e;
    rows = JSON.parse(fm.readString(cachePath)) as RawRow[];
  }

  return rows.map((row) => toCounterEvent(row));
}

function pickEvents(events: WidgetEvent[], parameter: string | null): WidgetEvent[] {
  const query = parameter?.trim().toLowerCase();
  if (!query) return events;
  const index = events.findIndex((e) => e.title.toLowerCase().includes(query));
  if (index <= 0) return events;
  return [events[index], ...events.slice(0, index), ...events.slice(index + 1)];
}

// ---------------------------------------------------------------------------
// Dibujo
// ---------------------------------------------------------------------------

const TEXT = Color.dynamic(new Color('#000000'), new Color('#FFFFFF'));
const SECONDARY = Color.dynamic(new Color('#6C6C70'), new Color('#AEAEB2'));
const BACKGROUND = Color.dynamic(new Color('#FFFFFF'), new Color('#1C1C1E'));

function valueText(view: CounterView): string {
  if (view.parts.length === 0) return view.text;
  const main = formatQuantities(view.parts);
  return view.suffix ? `${main} ${view.suffix}` : main;
}

function label(event: WidgetEvent): string {
  return event.emoji ? `${event.emoji} ${event.title}` : event.title;
}

function addText(stack: SStack, text: string, font: SFont, color: SColor, lines = 1): SText {
  const t = stack.addText(text);
  t.font = font;
  t.textColor = color;
  t.lineLimit = lines;
  t.minimumScaleFactor = 0.5;
  return t;
}

function drawSmall(widget: SListWidget, event: WidgetEvent) {
  const view = computeCounter(event);
  addText(widget, label(event), Font.semiboldSystemFont(14), TEXT, 2);
  widget.addSpacer();
  if (view.prefix) addText(widget, view.prefix, Font.mediumSystemFont(13), SECONDARY);
  addText(widget, valueText(view), Font.boldRoundedSystemFont(30), new Color(event.color), 2);
  widget.addSpacer(2);
  addText(widget, view.detail ?? describeDates(event), Font.systemFont(12), SECONDARY);
}

function drawList(widget: SListWidget, events: WidgetEvent[], max: number) {
  widget.spacing = 8;
  for (const event of events.slice(0, max)) {
    const view = computeCounter(event);
    const row = widget.addStack();
    row.layoutHorizontally();
    row.centerAlignContent();
    row.spacing = 8;
    addText(row, label(event), Font.semiboldSystemFont(14), TEXT);
    row.addSpacer();
    const right = view.prefix ? `${view.prefix} ${valueText(view)}` : valueText(view);
    addText(row, right, Font.boldRoundedSystemFont(17), new Color(event.color));
  }
  if (events.length > max) {
    widget.addSpacer();
    addText(widget, `+${events.length - max} más`, Font.systemFont(12), SECONDARY);
  }
}

function drawAccessory(widget: SListWidget, event: WidgetEvent, family: string) {
  const view = computeCounter(event);
  if (family === 'accessoryInline') {
    addText(widget, `${label(event)}: ${view.text}`, Font.systemFont(12), TEXT);
    return;
  }
  if (family === 'accessoryCircular') {
    const first = view.parts[0];
    const stack = widget.addStack();
    stack.layoutVertically();
    stack.centerAlignContent();
    addText(stack, first ? String(first.value) : '¡Hoy!', Font.boldRoundedSystemFont(20), TEXT);
    addText(stack, first?.unit || (event.emoji ?? ''), Font.systemFont(10), TEXT);
    return;
  }
  addText(widget, label(event), Font.semiboldSystemFont(13), TEXT);
  addText(widget, view.text, Font.boldRoundedSystemFont(17), TEXT);
  addText(widget, describeDates(event), Font.systemFont(11), TEXT);
}

function drawMessage(widget: SListWidget, message: string) {
  addText(widget, '🌱 Desde / Hasta', Font.semiboldSystemFont(14), TEXT);
  widget.addSpacer(6);
  addText(widget, message, Font.systemFont(12), SECONDARY, 5);
}

async function main() {
  const widget = new ListWidget();
  const family = config.widgetFamily ?? 'small';
  const accessory = family.startsWith('accessory');
  if (!accessory) {
    widget.backgroundColor = BACKGROUND;
    widget.setPadding(14, 14, 14, 14);
  }
  widget.url = DH_CONFIG.appUrl;
  widget.refreshAfterDate = nextRefreshDate();

  try {
    const events = pickEvents(await fetchEvents(), args.widgetParameter);
    if (events.length === 0) {
      drawMessage(widget, 'Todavía no tenés eventos. Creá uno en la app.');
    } else if (accessory) {
      drawAccessory(widget, events[0], family);
    } else if (family === 'small') {
      drawSmall(widget, events[0]);
    } else {
      drawList(widget, events, family === 'large' || family === 'extraLarge' ? 8 : 3);
    }
  } catch (e) {
    const message =
      e instanceof WidgetError ? e.message : 'Sin conexión. Se va a actualizar solo más tarde.';
    drawMessage(widget, message);
  }

  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else if (family === 'small') {
    await widget.presentSmall();
  } else {
    await widget.presentMedium();
  }
  Script.complete();
}

await main();
