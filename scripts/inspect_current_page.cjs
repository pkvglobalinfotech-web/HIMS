const WebSocket = require('ws');
const http = require('http');

function getTargets() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json', (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function main() {
  const targets = await getTargets();
  const pageTarget = targets.find((t) => t.type === 'page');
  if (!pageTarget) {
    console.error('No page target found');
    process.exit(1);
  }
  console.log('Connecting to target:', pageTarget.url, pageTarget.title);

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((res) => ws.on('open', res));

  let msgId = 1;
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
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
        consoleLogs.push(msg.params.message.text);
      } else if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map((a) => a.value || a.description || '').join(' ');
        consoleLogs.push(`[${msg.params.type}] ${text}`);
      }
    } catch (e) {}
  });

  await send('Console.enable');
  await send('Runtime.enable');

  // Check where we are
  let evalRes = await send('Runtime.evaluate', {
    expression: 'window.location.href',
    returnByValue: true,
  });
  console.log('Current URL:', evalRes.result?.value);

  // If on login, do login
  if (evalRes.result?.value?.includes('login')) {
    console.log('Logging in...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const el = document.querySelector('[ng-controller*="Login"]');
          if (el && window.angular) {
            const scope = window.angular.element(el).scope();
            const vm = scope && (scope.vm || scope);
            if (vm && vm.handleLogin) {
              vm.handleLogin('sdh', '1234');
              return 'Logging in via vm.handleLogin';
            }
          }
          const u = document.querySelector('input[type="text"], input[name="username"]');
          const p = document.querySelector('input[type="password"]');
          const b = document.querySelector('button[type="submit"]');
          if (u && p && b) {
            u.value = 'sdh';
            u.dispatchEvent(new Event('input', { bubbles: true }));
            p.value = '1234';
            p.dispatchEvent(new Event('input', { bubbles: true }));
            b.click();
            return 'Submitted form';
          }
          return 'No login form found';
        })()
      `,
      returnByValue: true,
    });
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Navigate to AccidentEmergency
  console.log('Navigating to http://localhost:5174/#/app/AccidentEmergency ...');
  await send('Runtime.evaluate', {
    expression: 'window.location.hash = "#/app/AccidentEmergency"',
    returnByValue: true,
  });
  await new Promise((r) => setTimeout(r, 2500));

  // Inspect page state
  const inspection = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const topBtn = document.getElementById('btnSaveApproveTop');
        const bottomBtn = document.getElementById('btnSaveApprove');
        const allButtons = Array.from(document.querySelectorAll('button')).map(b => ({
          id: b.id,
          text: b.innerText?.trim(),
          visible: b.offsetParent !== null,
          rect: b.getBoundingClientRect()
        }));
        const allSelects = Array.from(document.querySelectorAll('select')).map(s => ({
          id: s.id,
          value: s.value,
          optionsCount: s.options.length,
          name: s.name
        }));
        return {
          currentUrl: window.location.href,
          topBtn: topBtn ? { id: topBtn.id, text: topBtn.innerText, visible: topBtn.offsetParent !== null } : null,
          bottomBtn: bottomBtn ? { id: bottomBtn.id, text: bottomBtn.innerText, visible: bottomBtn.offsetParent !== null } : null,
          selectCount: allSelects.length,
          allSelects,
          approveButtons: allButtons.filter(b => b.text && (b.text.toLowerCase().includes('approve') || b.id.toLowerCase().includes('approve')))
        };
      })()
    `,
    returnByValue: true,
  });

  console.log('Page Inspection Result:');
  console.log(JSON.stringify(inspection.result?.value, null, 2));

  console.log('Recent Console Logs:');
  consoleLogs.slice(-15).forEach((l) => console.log('  ', l));

  ws.close();
}

main().catch(console.error);
