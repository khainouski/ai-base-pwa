/**
 * "Install AI Base" banner.
 *
 * Two paths, because Safari has no install API: browsers that fire
 * beforeinstallprompt get the native dialog, iPhone and iPad get a sheet
 * showing the three taps of Share → Add to Home Screen → Add.
 */

import { el, esc } from './ui.js';
import { icon } from './icons.js';

const DISMISS_KEY = 'aibase:installDismissed';

/** Fired when the native prompt becomes available. */
export const INSTALLABLE_EVENT = 'aibase:installable';

/** Deferred native prompt, captured as early as the module loads. */
let deferredPrompt = null;

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

function isIos() {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** Chrome and Firefox on iOS cannot add to the home screen at all. */
const isIosSafari = () => isIos() && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);

function dismissed() {
  try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
}

function rememberDismissal() {
  try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* private mode */ }
}

/** True when there is anything useful to offer on this device. */
export const canOfferInstall = () => !isStandalone() && (!!deferredPrompt || isIosSafari());

const STEPS = [
  { icon: 'share', text: 'Нажми «Поделиться» — внизу экрана в Safari' },
  { icon: 'add-to-home', text: 'Выбери «На экран „Домой“»' },
  { icon: 'check', text: 'Нажми «Добавить» — иконка появится на экране' },
];

/** Sheet with the manual iOS steps. */
function openInstallHelp() {
  document.querySelector('.sheet-backdrop')?.remove();

  const node = el(`
    <div class="sheet-backdrop">
      <div class="sheet" role="dialog" aria-modal="true" aria-label="Установка AI Base">
        <div class="sheet-title">Установить AI Base на iPhone</div>
        <ol class="steps">
          ${STEPS.map((s, i) => `
            <li>
              <span class="step-num">${i + 1}</span>
              <span class="step-icon">${icon(s.icon)}</span>
              <span>${esc(s.text)}</span>
            </li>`).join('')}
        </ol>
        <p class="muted" style="font-size:13.5px;margin:0">
          Приложение откроется без адресной строки и будет работать офлайн.
        </p>
        <button class="btn primary" id="sheet-close">Понятно</button>
      </div>
    </div>`);

  const close = () => node.remove();
  node.querySelector('#sheet-close').addEventListener('click', close);
  node.addEventListener('click', (e) => { if (e.target === node) close(); });
  document.addEventListener('keydown', function onKey(e) {
    if (e.key !== 'Escape') return;
    close();
    document.removeEventListener('keydown', onKey);
  });

  document.body.appendChild(node);
  requestAnimationFrame(() => node.classList.add('show'));
}

/** Native dialog where it exists, the sheet otherwise. */
export async function startInstall() {
  if (!deferredPrompt) { openInstallHelp(); return; }

  const prompt = deferredPrompt;
  deferredPrompt = null;
  prompt.prompt();
  const { outcome } = await prompt.userChoice;
  if (outcome === 'accepted') hideBanner();
}

function hideBanner() {
  document.querySelector('.install-bar')?.remove();
}

function showBanner() {
  if (document.querySelector('.install-bar') || !canOfferInstall() || dismissed()) return;

  const node = el(`
    <div class="install-bar">
      <span class="install-icon">${icon('install')}</span>
      <span class="install-text">
        <b>Установить AI Base</b>
        <span class="muted">Иконка на экране «Домой», работает офлайн</span>
      </span>
      <button class="btn primary small" id="install-go">Установить</button>
      <button class="install-close" aria-label="Скрыть">✕</button>
    </div>`);

  node.querySelector('#install-go').addEventListener('click', startInstall);
  node.querySelector('.install-close').addEventListener('click', () => {
    rememberDismissal();
    hideBanner();
  });

  document.body.appendChild(node);
  requestAnimationFrame(() => node.classList.add('show'));
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showBanner();
  // The event can arrive after a view has rendered; let it re-check.
  window.dispatchEvent(new Event(INSTALLABLE_EVENT));
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  hideBanner();
});

/** Called once on startup; Safari never fires beforeinstallprompt. */
export function mountInstallBanner() {
  if (isStandalone()) return;
  if (isIosSafari()) showBanner();
}
