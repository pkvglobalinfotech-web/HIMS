const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const viewsDir = path.join(rootDir, 'public', 'views');

function walkDir(dir, filterFn) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results = results.concat(walkDir(filePath, filterFn));
    } else if (!filterFn || filterFn(filePath)) {
      results.push(filePath);
    }
  }
  return results;
}

// 1. Scan public/views directories
const viewFolders = fs.readdirSync(viewsDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

const moduleStats = {};

for (const folder of viewFolders) {
  const dirPath = path.join(viewsDir, folder);
  const htmlFiles = walkDir(dirPath, p => p.endsWith('.html'));
  const jsFiles = walkDir(dirPath, p => p.endsWith('.js'));

  let reactMountedTemplates = 0;
  let pureAngularTemplates = 0;
  const reactMountedList = [];
  const pureAngularList = [];

  for (const html of htmlFiles) {
    const content = fs.readFileSync(html, 'utf8');
    if (content.includes('<react-component')) {
      reactMountedTemplates++;
      reactMountedList.push(path.relative(viewsDir, html));
    } else {
      pureAngularTemplates++;
      pureAngularList.push(path.relative(viewsDir, html));
    }
  }

  let reactBridgeControllers = 0;
  let pureAngularControllers = 0;

  for (const js of jsFiles) {
    const content = fs.readFileSync(js, 'utf8');
    if (content.includes('refreshReactProps') || content.includes('handleReactAction') || content.includes('reactProps')) {
      reactBridgeControllers++;
    } else {
      pureAngularControllers++;
    }
  }

  moduleStats[folder] = {
    totalHtml: htmlFiles.length,
    reactMountedTemplates,
    pureAngularTemplates,
    totalJs: jsFiles.length,
    reactBridgeControllers,
    pureAngularControllers,
    pctReact: htmlFiles.length > 0 ? Math.round((reactMountedTemplates / htmlFiles.length) * 100) : 0,
    reactSamples: reactMountedList.slice(0, 5),
    angularSamples: pureAngularList.slice(0, 5)
  };
}

// Also scan pages directory
const pagesDir = path.join(rootDir, 'public', 'pages');
if (fs.existsSync(pagesDir)) {
  const pageHtml = walkDir(pagesDir, p => p.endsWith('.html'));
  const pageJs = walkDir(pagesDir, p => p.endsWith('.js'));
  let reactCount = 0;
  for (const html of pageHtml) {
    if (fs.readFileSync(html, 'utf8').includes('<react-component')) reactCount++;
  }
  moduleStats['pages (auth/shell)'] = {
    totalHtml: pageHtml.length,
    reactMountedTemplates: reactCount,
    pureAngularTemplates: pageHtml.length - reactCount,
    totalJs: pageJs.length,
    reactBridgeControllers: 0,
    pureAngularControllers: pageJs.length,
    pctReact: pageHtml.length > 0 ? Math.round((reactCount / pageHtml.length) * 100) : 0
  };
}

// 2. React components count
const reactCompDir = path.join(rootDir, 'src', 'react-components');
const allReactComponents = walkDir(reactCompDir, p => p.endsWith('.tsx'));

// 3. AppRoutes count
const appRoutesPath = path.join(rootDir, 'src', 'routes', 'AppRoutes.tsx');
let reactRoutes = [];
if (fs.existsSync(appRoutesPath)) {
  const content = fs.readFileSync(appRoutesPath, 'utf8');
  const routeRegex = /path=["']([^"']+)["']/g;
  let rm;
  while ((rm = routeRegex.exec(content)) !== null) {
    reactRoutes.push(rm[1]);
  }
}

// 4. Analyze States by module
const stateFiles = [
  'public/js/hims-states.js',
  'public/js/emr-states.js',
  'public/js/lis-states.js',
  'public/js/linenandlaundry-states.js'
];

const stateByModule = {};

for (const sf of stateFiles) {
  const fullPath = path.join(rootDir, sf);
  if (!fs.existsSync(fullPath)) continue;
  const content = fs.readFileSync(fullPath, 'utf8');
  const stateRegex = /\.state\s*\(\s*['"]([^'"]+)['"]/g;
  let sm;
  while ((sm = stateRegex.exec(content)) !== null) {
    const sName = sm[1];
    // determine module from state name
    let mod = 'other';
    const parts = sName.split('.');
    if (parts.length > 1) {
      const p1 = parts[1];
      if (p1.includes('billing') || p1.includes('receipt') || p1.includes('cashier') || p1.includes('credit') || p1.includes('claim')) mod = 'billing';
      else if (p1.includes('patient') || p1.includes('registration') || p1.includes('appointment') || p1.includes('visit') || p1.includes('search')) mod = 'patientservices / registration';
      else if (p1.includes('emr') || sName.startsWith('patientemr')) mod = 'emr';
      else if (p1.includes('inpatient') || p1.includes('admission') || p1.includes('bed') || p1.includes('surgery') || p1.includes('discharge') || p1.includes('mrd') || p1.includes('ot')) mod = 'inpatient / surgery';
      else if (p1.includes('pharmacy') || p1.includes('inventory') || p1.includes('purchase') || p1.includes('stock') || p1.includes('grn') || p1.includes('drug')) mod = 'pharmacy & inventory';
      else if (p1.includes('lis') || sf.includes('lis-states')) mod = 'lis';
      else if (p1.includes('report') || p1.includes('print')) mod = 'reports';
      else if (p1.includes('master') || p1.includes('general') || p1.includes('country') || p1.includes('state') || p1.includes('city') || p1.includes('dept') || p1.includes('role') || p1.includes('facility')) mod = 'common / masters';
      else if (p1.includes('hrms')) mod = 'hrms';
      else if (p1.includes('linen') || sf.includes('linenandlaundry')) mod = 'linen and laundry';
      else if (p1.includes('cssd')) mod = 'cssd';
      else if (p1.includes('incident')) mod = 'incidentmanagement';
      else if (p1.includes('qms')) mod = 'qms';
      else if (p1.includes('tally')) mod = 'tally';
      else if (p1.includes('virtual')) mod = 'virtualservices';
      else if (p1.includes('asset')) mod = 'assetmanagement';
      else mod = p1;
    } else {
      mod = 'root/page';
    }

    if (!stateByModule[mod]) stateByModule[mod] = 0;
    stateByModule[mod]++;
  }
}

const summary = {
  totalReactComponentFiles: allReactComponents.length,
  totalReactRoutes: reactRoutes.length,
  moduleViewsSummary: moduleStats,
  statesByModule: stateByModule
};

fs.writeFileSync(path.join(rootDir, 'module_summary_report.json'), JSON.stringify(summary, null, 2));
console.log('Summary report written to module_summary_report.json');
