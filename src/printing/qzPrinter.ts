/**
 * Universal Printing Module.
 * Completely replaces QZ Tray with browser-native printing for all users.
 *
 * - Formats barcode and label prints using the master configuration from
 *   http://localhost:5174/#/app/barcodesetting (HIMS_MASTER_BARCODE_CONFIG).
 * - HTML documents (Consent Form, Admission Form, Registration Print, Bill print)
 *   open directly via the native browser print engine.
 * - Dot-matrix receipts format cleanly in preformatted monospace text.
 * - ZERO WebSocket connection attempts (no localhost:8182 errors).
 * - ZERO desktop app dependencies.
 */
import { printWithBrowser } from './browserPrint';
import { printRawWithBrowser, getMasterBarcodeConfig } from './rawPrintFallback';

export type PrinterKind = 'barcode' | 'dotmatrix';

export interface PrintOptions {
  /** Which local printer to use when no explicit printer is given. Default: 'barcode'. */
  kind?: PrinterKind;
  /** Exact printer name as shown by the operating system. */
  printer?: string;
  copies?: number;
}

export type QzPrintItem = any;

const SAVED_PRINTER_KEY = 'hims.printer.';

/**
 * Sends raw printer commands (EPL/ZPL for label printers, ESC/P text for dot-matrix printers).
 * Formats the output according to the configuration in /app/barcodesetting and triggers browser print.
 */
export async function printRaw(data: unknown, options: PrintOptions = {}): Promise<void> {
  const items = (Array.isArray(data) ? data : [data]).filter(
    (item): item is string | QzPrintItem => (typeof item === 'string' && item.length > 0) || (typeof item === 'object' && item !== null),
  );
  if (items.length === 0) throw new Error('Nothing to print.');

  printRawWithBrowser(items, options);
}

/** Prints an HTML document using the browser's native print engine. */
export async function printHtml(html: unknown, _options: PrintOptions = {}): Promise<void> {
  if (typeof html !== 'string' || !html.trim()) throw new Error('Nothing to print.');
  printWithBrowser(html);
}

/** Remembers which printer preference to use on this PC. */
export function setPrinter(kind: PrinterKind, printerName: string | null): void {
  try {
    if (printerName) localStorage.setItem(SAVED_PRINTER_KEY + kind, printerName);
    else localStorage.removeItem(SAVED_PRINTER_KEY + kind);
  } catch {
    /* storage unavailable (private mode) */
  }
}

/** Names of available printers for the current browser environment. */
export async function listPrinters(): Promise<string[]> {
  const config = getMasterBarcodeConfig('registration');
  const configuredPrinter = config?.printerName || 'Generic / System Default Printer';
  return [
    'System Default Printer (Browser Dialog)',
    configuredPrinter,
  ];
}
