/**
 * Service worker registration and applying updates.
 *
 * A new worker calls skipWaiting, so it takes over as soon as it installs —
 * but the page is by then already running the previous build's modules against
 * the new HTML, which shows up as half-missing buttons. So the page reloads
 * itself once the new worker takes control, unless that would throw away
 * something the user is typing.
 *
 * Kept out of router.js: the app must also run without a service worker.
 */

import { toast } from './ui.js';
import { mountInstallBanner } from './install.js';

window.addEventListener('load', mountInstallBanner);

/** Something the reload would destroy. */
function isBusy() {
  const el = document.activeElement;
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
    ? el.value.trim().length > 0
    : false;
}

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  // Captured before registering: without a controller this is a first install,
  // and the page is already running the build the new worker just cached.
  const hadController = !!navigator.serviceWorker.controller;
  let applying = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || applying) return;
    applying = true;

    if (isBusy()) {
      toast('Обновление готово — перезагрузи страницу');
      return;
    }
    location.reload();
  });

  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('./sw.js');
    } catch (e) {
      console.warn('SW registration failed', e);
    }
  });
}
