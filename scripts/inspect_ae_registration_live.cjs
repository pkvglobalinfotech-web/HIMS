const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

async function getTargets(port = 9224) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${port}/json`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function main() {
  const targets = await getTargets(9224);
  const pageTarget = targets.find(t => t.type === 'page');
  if (!pageTarget) {
    console.error('No page target found on port 9224');
    process.exit(1);
  }
  console.log('Connecting to page:', pageTarget.url, pageTarget.title);

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));

  let msgId = 1;
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = msgId++;
    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id === id) {
        ws.off('message', handler);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });

  const consoleLogs = [];
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.method === 'Console.messageAdded') {
        consoleLogs.push({ source: 'console', level: msg.params.message.level, text: msg.params.message.text });
      } else if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map(a => a.value || a.description || '').join(' ');
        consoleLogs.push({ source: 'runtime', type: msg.params.type, text });
      }
    } catch (e) {}
  });

  await send('Console.enable');
  await send('Runtime.enable');
  await send('Page.enable');

  // Reload the page to capture initial mounting console logs cleanly
  console.log('Reloading page to capture mount logs...');
  await send('Page.reload');
  await new Promise(r => setTimeout(r, 3500));

  // Inspect DOM elements
  const evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const btnTop = document.getElementById('btnSaveApproveTop');
      const btnBottom = document.getElementById('btnSaveApprove');
      const legacySave = document.getElementById('saveAndApproveid');
      const legacyApprove = document.getElementById('btnApprove');

      const selects = Array.from(document.querySelectorAll('select')).map(s => ({
        id: s.id || s.name || 'unnamed',
        value: s.value,
        optionsCount: s.options.length,
        disabled: s.disabled,
        visible: s.offsetParent !== null
      }));

      return {
        url: window.location.href,
        hasContainer: !!document.querySelector('.ae-patient-registration-container'),
        btnTop: btnTop ? {
          id: btnTop.id,
          text: btnTop.innerText.replace(/\\s+/g, ' ').trim(),
          visible: btnTop.offsetParent !== null,
          rect: btnTop.getBoundingClientRect(),
          style: {
            display: window.getComputedStyle(btnTop).display,
            visibility: window.getComputedStyle(btnTop).visibility,
            bg: window.getComputedStyle(btnTop).backgroundColor,
            color: window.getComputedStyle(btnTop).color
          }
        } : null,
        btnBottom: btnBottom ? {
          id: btnBottom.id,
          text: btnBottom.innerText.replace(/\\s+/g, ' ').trim(),
          visible: btnBottom.offsetParent !== null,
          rect: btnBottom.getBoundingClientRect(),
          style: {
            display: window.getComputedStyle(btnBottom).display,
            visibility: window.getComputedStyle(btnBottom).visibility,
            bg: window.getComputedStyle(btnBottom).backgroundColor,
            color: window.getComputedStyle(btnBottom).color
          }
        } : null,
        legacySave: legacySave ? { id: legacySave.id, display: window.getComputedStyle(legacySave).display } : null,
        legacyApprove: legacyApprove ? { id: legacyApprove.id, display: window.getComputedStyle(legacyApprove).display } : null,
        selects
      };
    })()`,
    returnByValue: true
  });

  console.log('\n--- DOM INSPECTION RESULTS ---');
  console.log(JSON.stringify(evalRes.result.value, null, 2));

  console.log('\n--- CONSOLE LOGS & WARNINGS ---');
  const relevantWarnings = consoleLogs.filter(l => 
    l.text.includes('value') || 
    l.text.includes('select') || 
    l.text.includes('null') || 
    l.text.includes('warning') || 
    l.text.includes('error') || 
    l.type === 'error' || 
    l.type === 'warning'
  );
  console.log('Total console logs captured:', consoleLogs.length);
  console.log('Select/value warnings:', relevantWarnings);

  // Capture screenshot
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const shotPath = '/Users/sharmila/.gemini/antigravity-ide/brain/369811d1-8628-48f0-8cde-2c8ae49d4743/ae_live_screen.png';
  fs.writeFileSync(shotPath, Buffer.from(shot.data, 'base64'));
  console.log(`\nScreenshot saved to ${shotPath}`);

  ws.close();
}

main().catch(console.error);
