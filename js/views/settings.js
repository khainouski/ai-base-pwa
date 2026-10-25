import { store, PROVIDERS, LEVELS, findProvider } from '../storage.js';
import { testKey } from '../ai.js';
import { crumbs, esc, toast } from '../ui.js';
import { icon } from '../icons.js';
import { canOfferInstall, startInstall, INSTALLABLE_EVENT } from '../install.js';

const FILE_NAME = 'ai-base-cards.json';

/** Открыто, пока ключа нет: без него AI-часть приложения не работает. */
const keyHelp = (provider, hasKey) => `
  <details class="help"${hasKey ? '' : ' open'}>
    <summary>Где взять ключ</summary>
    <ol class="help-steps">
      <li>Открой <a href="${esc(provider.keyUrl)}" target="_blank" rel="noreferrer">консоль ${esc(provider.label)}</a> и войди в аккаунт.</li>
      <li>Создай ключ и скопируй его — он начинается с <code>${esc(provider.keyHint)}</code>.</li>
      <li>Вставь сюда и нажми «Сохранить», затем «Проверить».</li>
    </ol>
    <p class="muted">Ключ хранится только в этом браузере и уходит напрямую в API провайдера.
      Приложение без собственного бэкенда, поэтому вводи сюда свой личный ключ, не рабочий.</p>
  </details>`;

export async function renderSettings(root) {
  const providerId = await store.getProvider();
  const provider = findProvider(providerId);
  const key = await store.getApiKey(providerId);
  const model = await store.getModel(providerId);
  const level = await store.getLevel();
  const cards = await store.getCards();

  const installBlock = canOfferInstall() ? `
    <div class="result-card stack" style="margin-top:16px">
      <div>
        <div style="font-weight:550">Установить приложение</div>
        <p class="muted" style="font-size:13.5px;margin:6px 0 0">
          Иконка на экране «Домой», запуск без адресной строки, работа офлайн.
        </p>
      </div>
      <div class="actions"><button id="install" class="btn primary">Установить</button></div>
    </div>` : '';

  root.innerHTML = `
    ${crumbs([{ title: 'Главная', href: '#/' }, { title: 'Настройки' }])}
    <h1 class="page-title">${icon('settings', 'title-icon')}Настройки</h1>
    <p class="page-sub">Ключ и карточки хранятся только в этом браузере.</p>

    <div class="result-card stack">
      <div>
        <label for="provider" style="display:block;margin-bottom:6px;font-weight:550">Провайдер</label>
        <select id="provider" class="input">
          ${PROVIDERS.map((p) => `<option value="${esc(p.id)}"${p.id === providerId ? ' selected' : ''}>${esc(p.label)}</option>`).join('')}
        </select>
      </div>

      <div>
        <label for="key" style="display:block;margin-bottom:6px;font-weight:550">API-ключ</label>
        <input id="key" class="input" type="password" placeholder="${esc(provider.keyHint)}" value="${esc(key)}"
               autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false">
        ${keyHelp(provider, !!key)}
      </div>

      <div>
        <label for="model" style="display:block;margin-bottom:6px;font-weight:550">Модель</label>
        <select id="model" class="input">
          ${provider.models.map((m) => `<option value="${esc(m.id)}"${m.id === model ? ' selected' : ''}>${esc(`${m.id} — ${m.label}`)}</option>`).join('')}
        </select>
      </div>

      <div>
        <label for="level" style="display:block;margin-bottom:6px;font-weight:550">Как объяснять</label>
        <select id="level" class="input">
          ${LEVELS.map((l) => `<option value="${esc(l.id)}"${l.id === level ? ' selected' : ''}>${esc(l.label)}</option>`).join('')}
        </select>
      </div>

      <div class="actions">
        <button id="save" class="btn primary">Сохранить</button>
        <button id="test" class="btn">Проверить</button>
        <span id="status" class="muted"></span>
      </div>
    </div>

    <div class="result-card stack" style="margin-top:16px">
      <div>
        <div style="font-weight:550">Карточки</div>
        <p class="muted" style="font-size:13.5px;margin:6px 0 0">
          Сохранено: ${cards.length}. Экспорт — обычный JSON, его можно править руками.
        </p>
      </div>
      <div class="actions">
        <button id="export" class="btn">Экспорт в файл</button>
        <button id="import" class="btn">Импорт из файла</button>
        <input id="import-file" type="file" accept="application/json,.json" hidden>
      </div>
    </div>

    ${installBlock}`;

  const install = root.querySelector('#install');
  if (install) install.addEventListener('click', startInstall);
  else window.addEventListener(INSTALLABLE_EVENT, () => renderSettings(root), { once: true });

  const providerSelect = root.querySelector('#provider');
  const keyInput = root.querySelector('#key');
  const modelSelect = root.querySelector('#model');
  const levelSelect = root.querySelector('#level');
  const status = root.querySelector('#status');

  // Смена провайдера перерисовывает экран: у него свой ключ и свой список моделей.
  providerSelect.addEventListener('change', async () => {
    await store.setApiKey(providerId, keyInput.value);
    await store.setModel(providerId, modelSelect.value);
    await store.setProvider(providerSelect.value);
    renderSettings(root);
  });

  const save = async () => {
    await store.setProvider(providerSelect.value);
    await store.setApiKey(providerSelect.value, keyInput.value);
    await store.setModel(providerSelect.value, modelSelect.value);
    await store.setLevel(levelSelect.value);
  };

  root.querySelector('#save').addEventListener('click', async () => {
    await save();
    status.textContent = '✓ Сохранено';
    status.style.color = 'var(--good)';
  });

  root.querySelector('#test').addEventListener('click', async () => {
    await save();
    status.innerHTML = '<span class="spinner"></span> проверяю…';
    status.style.color = '';
    try {
      await testKey();
      status.textContent = '✓ Ключ и модель работают';
      status.style.color = 'var(--good)';
    } catch (e) {
      status.textContent = `✗ ${e.message}`;
      status.style.color = 'var(--bad)';
    }
  });

  keyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') root.querySelector('#save').click();
  });

  root.querySelector('#export').addEventListener('click', async () => {
    const list = await store.getCards();
    if (!list.length) { toast('Пока нечего экспортировать.'); return; }

    const url = URL.createObjectURL(new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = FILE_NAME;
    a.click();
    // Отзываем на следующем тике: браузеру нужен URL, пока начинается скачивание.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  });

  const file = root.querySelector('#import-file');
  root.querySelector('#import').addEventListener('click', () => file.click());
  file.addEventListener('change', async () => {
    const f = file.files?.[0];
    if (!f) return;
    try {
      const incoming = JSON.parse(await f.text());
      if (!Array.isArray(incoming)) throw new Error('Ожидался массив карточек.');
      const clean = incoming.filter((c) => c && typeof c.id === 'string' && c.front && c.back);
      if (!clean.length) { toast('В файле не нашлось карточек.'); file.value = ''; return; }
      const { added } = await store.addCards(clean);
      toast(`Импортировано ${clean.length}: новых ${added}`);
      renderSettings(root);
    } catch (e) {
      toast(`Не удалось прочитать файл: ${e.message}`);
    }
    file.value = '';
  });
}
