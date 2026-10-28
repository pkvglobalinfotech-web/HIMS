/**
 * Prints an HTML document using the browser's native print engine.
 * Works seamlessly across all desktop and mobile browsers without requiring any desktop apps.
 */
export function printWithBrowser(html: string): void {
  // Create an iframe to hold the print document
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.setAttribute('tabindex', '-1');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(frame);

  const doc = frame.contentWindow?.document;
  if (!doc) {
    // Popup fallback if iframe cannot be accessed
    const win = window.open('', '_blank', 'width=600,height=500');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();
      win.print();
      setTimeout(() => win.close(), 600);
    }
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  // Give styles and images a moment to settle, then invoke print
  window.setTimeout(() => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } catch (err) {
      console.warn('Iframe print failed, opening popup print window', err);
      const win = window.open('', '_blank', 'width=600,height=500');
      if (win) {
        win.document.open();
        win.document.write(html);
        win.document.close();
        win.focus();
        win.print();
        setTimeout(() => win.close(), 600);
      }
    } finally {
      window.setTimeout(() => frame.remove(), 2000);
    }
  }, 300);
}
