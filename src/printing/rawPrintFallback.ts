/**
 * Browser-native Label and Barcode Print Engine.
 * Formats and prints barcodes, labels, and receipts based on the configuration from:
 * http://localhost:5174/#/app/barcodesetting (HIMS_MASTER_BARCODE_CONFIG).
 *
 * Totally replaces QZ Tray with standard, reliable browser-native printing for all users.
 */
import { printWithBrowser } from './browserPrint';
import type { PrintOptions } from './qzPrinter';

export interface ModuleBarcodeConfig {
  printerName: string;
  autoPrintOnAction: boolean;
  printMethod: 'browser' | 'thermal_raw' | 'print_service';
  preset: '50x30' | '38x25' | '74x38' | '100x50' | 'custom';
  widthMm: number;
  heightMm: number;
  fontSize: 'small' | 'medium' | 'large';
  borderStyle: 'solid' | 'dashed' | 'none';
  alignment: 'left' | 'center';
  barcodeHeight: number;
  barcodeType: 'CODE128' | 'CODE39' | 'QR';
  customHeader: string;
  fields: Record<string, boolean>;
}

export interface MasterBarcodeSettings {
  registration: ModuleBarcodeConfig;
  labSample: ModuleBarcodeConfig;
  inventory: ModuleBarcodeConfig;
}

export const DEFAULT_MASTER_SETTINGS: MasterBarcodeSettings = {
  registration: {
    printerName: 'Zebra ZD220 / ZD230 (Thermal)',
    autoPrintOnAction: true,
    printMethod: 'browser',
    preset: '50x30',
    widthMm: 50,
    heightMm: 30,
    fontSize: 'medium',
    borderStyle: 'solid',
    alignment: 'left',
    barcodeHeight: 36,
    barcodeType: 'CODE128',
    customHeader: '',
    fields: {
      showHospitalName: true,
      showMRN: true,
      showPatientName: true,
      showAgeGender: true,
      showVisitDate: true,
      showDoctorName: true,
      showDepartment: false,
      showTokenNo: true,
      showMobile: false,
      showAddress: false,
      showBarcodeGraphic: true,
      showBarcodeText: true,
    },
  },
  labSample: {
    printerName: 'TSC TTP-244 Pro / TE200',
    autoPrintOnAction: true,
    printMethod: 'browser',
    preset: '38x25',
    widthMm: 38,
    heightMm: 25,
    fontSize: 'small',
    borderStyle: 'solid',
    alignment: 'left',
    barcodeHeight: 28,
    barcodeType: 'CODE128',
    customHeader: 'CENTRAL CLINICAL LAB',
    fields: {
      showLabHeader: true,
      showTestNames: true,
      showPatientName: true,
      showMRN: true,
      showCollectionDate: true,
      showContainerColor: true,
      showBarcodeGraphic: true,
      showBarcodeText: true,
    },
  },
  inventory: {
    printerName: 'Godex G500 / RT700',
    autoPrintOnAction: false,
    printMethod: 'browser',
    preset: '50x30',
    widthMm: 50,
    heightMm: 30,
    fontSize: 'medium',
    borderStyle: 'solid',
    alignment: 'left',
    barcodeHeight: 34,
    barcodeType: 'CODE128',
    customHeader: 'PHARMACY & MEDICAL STORES',
    fields: {
      showStoreHeader: true,
      showItemCode: true,
      showItemName: true,
      showBatchNo: true,
      showExpiryDate: true,
      showMfgDate: false,
      showPrice: true,
      showBarcodeGraphic: true,
      showBarcodeText: true,
    },
  },
};

/** Reads master barcode configuration saved from http://localhost:5174/#/app/barcodesetting */
export function getMasterBarcodeConfig(moduleKey: 'registration' | 'labSample' | 'inventory' = 'registration'): ModuleBarcodeConfig {
  try {
    const saved = localStorage.getItem('HIMS_MASTER_BARCODE_CONFIG');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed[moduleKey]) {
        return {
          ...DEFAULT_MASTER_SETTINGS[moduleKey],
          ...parsed[moduleKey],
          fields: {
            ...DEFAULT_MASTER_SETTINGS[moduleKey].fields,
            ...(parsed[moduleKey].fields || {}),
          },
        };
      }
    }
    const legacy = localStorage.getItem('HIMS_BARCODE_MASTER_CONFIG');
    if (legacy && moduleKey === 'registration') {
      const parsedLegacy = JSON.parse(legacy);
      return {
        ...DEFAULT_MASTER_SETTINGS.registration,
        ...parsedLegacy,
        fields: {
          ...DEFAULT_MASTER_SETTINGS.registration.fields,
          ...(parsedLegacy.fields || {}),
        },
      };
    }
  } catch (e) {
    console.warn('Could not read HIMS_MASTER_BARCODE_CONFIG from localStorage', e);
  }
  return DEFAULT_MASTER_SETTINGS[moduleKey];
}

// Code 128 (Subset B) pattern table
const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];

/** Generates clean SVG barcode string */
export function generateBarcodeSvg(text: string, height = 36): string {
  const clean = (text || '').trim();
  if (!clean) return '';

  const codes: number[] = [104]; // Start B
  let checksum = 104;

  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i) - 32;
    if (code >= 0 && code <= 95) {
      codes.push(code);
      checksum += code * (i + 1);
    }
  }

  codes.push(checksum % 103);
  codes.push(106); // Stop code

  let patternStr = '';
  for (const c of codes) {
    patternStr += CODE128_PATTERNS[c] || '';
  }

  let x = 6;
  let isBar = true;
  let rects = '';
  const moduleWidth = 1.6;

  for (let i = 0; i < patternStr.length; i++) {
    const width = parseInt(patternStr[i], 10) * moduleWidth;
    if (isBar) {
      rects += `<rect x="${x.toFixed(1)}" y="0" width="${width.toFixed(1)}" height="${height}" fill="#000000" />`;
    }
    x += width;
    isBar = !isBar;
  }

  const totalWidth = Math.ceil(x + 6);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${height}" style="width: 100%; max-width: ${totalWidth}px; height: ${height}px; display: block; margin: 0 auto;">
      ${rects}
    </svg>
  `;
}

interface ExtractedPatientData {
  mrn: string;
  ipNo: string;
  patientName: string;
  ageGender: string;
  doctorName: string;
  date: string;
  ward: string;
  room: string;
  mobile: string;
  address: string;
  tokenNo: string;
  barcodeValue: string;
  testNames?: string;
  rawLines: string[];
  isLabel: boolean;
}

/** Extracts clinical and demographic fields from raw printer commands (EPL, ZPL, TSC, text) */
function extractPatientData(rawText: string): ExtractedPatientData {
  const lines = rawText.split(/\r?\n/);
  const data: ExtractedPatientData = {
    mrn: '',
    ipNo: '',
    patientName: '',
    ageGender: '',
    doctorName: '',
    date: '',
    ward: '',
    room: '',
    mobile: '',
    address: '',
    tokenNo: '',
    barcodeValue: '',
    rawLines: [],
    isLabel: false,
  };

  const rawFields: Array<{ key: string; val: string }> = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // EPL Detection & Parsing
    if (/^I8,|^Q\d+|^q\d+|^N$|^P\d+$/.test(trimmed)) {
      data.isLabel = true;
      continue;
    }
    const eplText = trimmed.match(/^A\s*\d+.*?"([^"]*)"/);
    if (eplText) {
      data.isLabel = true;
      const text = eplText[1].trim();
      if (text.includes(':')) {
        const [k, ...v] = text.split(':');
        rawFields.push({ key: k.trim().toLowerCase(), val: v.join(':').trim() });
      } else {
        rawFields.push({ key: '', val: text });
      }
      continue;
    }
    const eplBarcode = trimmed.match(/^B\s*\d+.*?"([^"]*)"/);
    if (eplBarcode) {
      data.isLabel = true;
      data.barcodeValue = eplBarcode[1].trim();
      continue;
    }

    // ZPL Detection & Parsing
    if (/^\^XA|^\^XZ|^\^PW|^\^LL/.test(trimmed)) {
      data.isLabel = true;
      continue;
    }
    const zplText = trimmed.match(/\^FD([^^]+)\^FS/);
    if (zplText) {
      data.isLabel = true;
      let text = zplText[1].trim();
      if (text.startsWith('>;')) text = text.substring(2);
      if (text !== ':' && text !== 'UHID' && text !== 'IP.NO' && !text.startsWith('vMRN')) {
        if (text.includes(':')) {
          const [k, ...v] = text.split(':');
          rawFields.push({ key: k.trim().toLowerCase(), val: v.join(':').trim() });
        } else {
          rawFields.push({ key: '', val: text });
        }
      }
      continue;
    }

    // TSC Detection & Parsing
    if (/^SIZE |^GAP |^CLS|^CODEPAGE/.test(trimmed)) {
      data.isLabel = true;
      continue;
    }
    const tscText = trimmed.match(/TEXT\s+\d+,\d+.*?"([^"]*)"/);
    if (tscText) {
      data.isLabel = true;
      const text = tscText[1].trim();
      if (text.includes(':')) {
        const [k, ...v] = text.split(':');
        rawFields.push({ key: k.trim().toLowerCase(), val: v.join(':').trim() });
      } else {
        rawFields.push({ key: '', val: text });
      }
      continue;
    }
    const tscBarcode = trimmed.match(/BARCODE\s+\d+,\d+.*?"([^"]*)"/);
    if (tscBarcode) {
      data.isLabel = true;
      data.barcodeValue = tscBarcode[1].trim();
      continue;
    }

    // Dot-Matrix / Plain text
    const cleanLine = trimmed.replace(/[\x00-\x09\x0B-\x1F\x7F-\x9F]/g, '');
    if (cleanLine) {
      data.rawLines.push(cleanLine);
    }
  }

  // Map raw fields to structured patient fields
  for (const f of rawFields) {
    const k = f.key;
    const v = f.val;
    if (k.includes('phid') || k.includes('mrn') || k.includes('uhid')) {
      data.mrn = v;
      if (!data.barcodeValue) data.barcodeValue = v;
    } else if (k.includes('ip') || k.includes('op') || k.includes('ip.no')) {
      data.ipNo = v;
      if (!data.tokenNo) data.tokenNo = v;
    } else if (k.includes('name') || k.includes('pat.name')) {
      data.patientName = v;
    } else if (k.includes('gender') || k.includes('age') || k.includes('sex')) {
      data.ageGender = v;
    } else if (k.includes('doctor') || k.includes('consultant') || k.includes('dr')) {
      data.doctorName = v;
    } else if (k.includes('date') || k.includes('adm.date')) {
      data.date = v;
    } else if (k.includes('ward')) {
      data.ward = v;
    } else if (k.includes('room')) {
      data.room = v;
    } else if (k.includes('mobile') || k.includes('phone') || k.includes('ph')) {
      data.mobile = v;
    } else if (k.includes('test')) {
      data.testNames = v;
    } else if (!k && v) {
      // Unlabeled values
      if (!data.patientName && v.length > 2) data.patientName = v;
    }
  }

  if (!data.barcodeValue && data.mrn) {
    data.barcodeValue = data.mrn;
  }

  return data;
}

/**
 * Builds HTML based on master configuration from http://localhost:5174/#/app/barcodesetting.
 */
export function buildConfiguredBarcodeHtml(rawItems: any[]): string {
  const combinedText = (Array.isArray(rawItems) ? rawItems : [rawItems])
    .map((item) => (typeof item === 'string' ? item : item?.data || ''))
    .join('\n');

  const data = extractPatientData(combinedText);
  const config = getMasterBarcodeConfig('registration');

  // If this is a barcode label
  if (data.isLabel || data.mrn || data.patientName || data.barcodeValue) {
    const barcodeVal = data.barcodeValue || data.mrn || 'SH0001';
    const barcodeSvg = config.fields.showBarcodeGraphic ? generateBarcodeSvg(barcodeVal, config.barcodeHeight || 36) : '';

    // Font size scaling matching BarcodeMasterSettingsComponent
    const headerFontSize = config.fontSize === 'small' ? '11px' : config.fontSize === 'large' ? '15px' : '13px';
    const bodyFontSize = config.fontSize === 'small' ? '10px' : config.fontSize === 'large' ? '13px' : '11.5px';

    const hospitalTitle = config.customHeader || 'SHUVADARSINI HOSPITAL';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Patient Barcode Label - ${barcodeVal}</title>
          <style>
            @page {
              size: ${config.widthMm}mm ${config.heightMm}mm;
              margin: 0;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              margin: 0;
              padding: 4px;
              background-color: #ffffff;
              color: #000000;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .label-page {
              width: 100%;
              max-width: ${Math.min(380, config.widthMm * 5.5)}px;
              background-color: #ffffff;
              border: ${config.borderStyle === 'none' ? 'none' : `1.5px ${config.borderStyle} #000000`};
              border-radius: 6px;
              padding: 6px 10px;
              text-align: ${config.alignment};
              margin: 0 auto;
            }
            .label-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 1px solid #000000;
              padding-bottom: 3px;
              margin-bottom: 5px;
            }
            .grid-container {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 2px 6px;
              font-size: ${bodyFontSize};
              line-height: 1.3;
            }
            .grid-full {
              grid-column: span 2;
            }
            .barcode-section {
              margin-top: 5px;
              text-align: center;
            }
            .barcode-text {
              font-size: 10px;
              letter-spacing: 2px;
              font-weight: 700;
              margin-top: 2px;
              font-family: monospace;
            }
            .token-badge {
              font-size: 10px;
              font-weight: 700;
              background: #eeeeee;
              padding: 1px 4px;
              border-radius: 3px;
            }
          </style>
        </head>
        <body>
          <div class="label-page">
            ${
              config.fields.showHospitalName
                ? `
                <div class="label-header">
                  <strong style="font-size: ${headerFontSize};">${hospitalTitle}</strong>
                  ${config.fields.showTokenNo && (data.tokenNo || data.ipNo) ? `<span class="token-badge">${data.tokenNo || data.ipNo}</span>` : ''}
                </div>
              `
                : ''
            }

            <div class="grid-container">
              ${config.fields.showMRN && data.mrn ? `<div><strong>MRN:</strong> ${data.mrn}</div>` : ''}
              ${config.fields.showVisitDate && data.date ? `<div><strong>Date:</strong> ${data.date}</div>` : ''}
              ${config.fields.showPatientName && data.patientName ? `<div class="grid-full"><strong>Name:</strong> ${data.patientName}</div>` : ''}
              ${config.fields.showAgeGender && data.ageGender ? `<div><strong>Age/Sex:</strong> ${data.ageGender}</div>` : ''}
              ${config.fields.showMobile && data.mobile ? `<div><strong>Ph:</strong> ${data.mobile}</div>` : ''}
              ${config.fields.showDoctorName && data.doctorName ? `<div class="grid-full"><strong>Dr:</strong> ${data.doctorName}</div>` : ''}
              ${config.fields.showDepartment && (data.ward || data.room) ? `<div class="grid-full"><strong>Ward/Room:</strong> ${[data.ward, data.room].filter(Boolean).join(' / ')}</div>` : ''}
              ${config.fields.showAddress && data.address ? `<div class="grid-full"><strong>Addr:</strong> ${data.address}</div>` : ''}
            </div>

            ${
              config.fields.showBarcodeGraphic && barcodeSvg
                ? `
                <div class="barcode-section">
                  ${barcodeSvg}
                  ${config.fields.showBarcodeText ? `<div class="barcode-text">${barcodeVal}</div>` : ''}
                </div>
              `
                : ''
            }
          </div>
        </body>
      </html>
    `;
  }

  // Dot-Matrix Bill / Receipt Layout
  const textContent = (data.rawLines.length > 0 ? data.rawLines : [combinedText]).join('\n');
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Print Receipt</title>
        <style>
          @page {
            size: auto;
            margin: 6mm;
          }
          body {
            margin: 0;
            padding: 8px;
            font-family: "Courier New", Courier, monospace;
            font-size: 11px;
            line-height: 1.25;
            color: #000000;
            background-color: #ffffff;
          }
          pre {
            margin: 0;
            white-space: pre-wrap;
            word-break: break-word;
            font-family: inherit;
            font-size: inherit;
          }
        </style>
      </head>
      <body>
        <pre>${textContent}</pre>
      </body>
    </html>
  `;
}

/**
 * Public execution helper: takes raw printer commands, formats them according to
 * the /app/barcodesetting configuration, and opens the native browser print dialog.
 */
export function printRawWithBrowser(items: any[], _options?: PrintOptions): void {
  const html = buildConfiguredBarcodeHtml(items);
  printWithBrowser(html);
}
