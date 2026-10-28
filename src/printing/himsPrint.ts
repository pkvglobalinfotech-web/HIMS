/**
 * window.HimsPrint: Universal Browser-Native Print API.
 * Used by AngularJS controllers (barcodeprintcontroller.js, dotmatrixprintcontroller.js)
 * and React components.
 *
 * 100% browser-native printing for all users without QZ Tray.
 * Formats barcodes based on http://localhost:5174/#/app/barcodesetting.
 */
import type { PrinterKind, PrintOptions } from './qzPrinter';
import { printRaw, printHtml, setPrinter, listPrinters } from './qzPrinter';

export const HimsPrint = {
  printRaw,
  printHtml,
  setPrinter,
  listPrinters,
};

declare global {
  interface Window {
    HimsPrint?: typeof HimsPrint;
  }
}

window.HimsPrint = HimsPrint;
