import { TOPICS, TOPIC_INDEX, findSection, findModule, hasCards } from '../../data/content.js';
import { ask, NoKeyError } from '../ai.js';
import * as P from '../prompts.js';
import { store } from '../storage.js';
import { termCard } from '../cards.js';
import { crumbs, esc, errorBox, loading, mdLite, toast } from '../ui.js';

/**
 * Страница одного термина: что записано в конспекте, разбор от модели и
 * свободный вопрос про тот же термин.
 *
 * Сначала читается написанное: короткая строка из списка и `detail` —
 * несколько абзацев, которых должно хватить, чтобы понять самому.
 * Кнопка «Разобрать» нужна, когда не хватило.
 *
 * Разбор приходит одним ответом — суть, пример, типичная ошибка. Отдельные
 * кнопки под каждую часть заставляли бы выбирать род непонимания до того, как
 * что-то показано, а термин открывают как раз потому, что не поняли.
 *
 * Контекстом уходит весь конспект страницы, поэтому разбор опирается на твои
 * заметки. Ответы не кэшируются: каждый тап — свежий запрос.
 */

/*
 * Три вопроса к модели — после того, как прочитано написанное на странице.
 * Каждый просит не пересказ конспекта, а добавление к нему: другой угол,
 * другой пример, другая ошибка.
 */
const MODES = [
  { id: 'explain', label: 'Разобрать', loading: 'Разбираю…', main: 'Другими словами', extra: 'Почему это важно' },
  { id: 'implementation', label: 'Реализация', loading: 'Пишу пример…', main: 'Как это пишется', extra: 'Почему так' },
  { id: 'pitfall', label: 'Где ошибаются', loading: 'Ищу ловушку…', main: 'Ошибка', extra: 'Как правильно' },
];

/**
 * Описание термина из конспекта. Старый формат — массив абзацев, новый —
 * объект с разделами: что это, как устроено, пример, ошибка, запомнить.
 * Поддерживаются оба: страницы переводятся на новый формат по очереди.
 */
function detailBlock(detail) {
  if (!detail) return '';
  if (Array.isArray(detail)) return detail.map((x) => `<p class="term-page-detail">${esc(x)}</p>`).join('');

  const part = (label, body) => (body ? `
    <div class="td-part">
      <div class="td-label">${esc(label)}</div>
      ${body}
    </div>` : '');

  return `
    <div class="term-detail">
      ${part('Что это', detail.what ? `<p class="td-what">${esc(detail.what)}</p>` : '')}
      ${part('Как устроено', detail.how?.length
    ? `<ul class="td-list">${detail.how.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '')}
      ${part('Как это пишется', detail.impl ? `
        ${detail.impl.file ? `<div class="td-file">${esc(detail.impl.file)}</div>` : ''}
        <pre class="td-example">${esc(detail.impl.body)}</pre>
        ${detail.impl.notes?.length
    ? `<ul class="td-list td-notes">${detail.impl.notes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}` : '')}
      ${/* Короткий пример показывается, только когда нет полной реализации:
            иначе они пересказывают друг друга. */''}
      ${part('Пример', !detail.impl && detail.example ? `<pre class="td-example">${esc(detail.example)}</pre>` : '')}
      ${part('Частая ошибка', detail.mistake ? `<p class="td-text">${esc(detail.mistake)}</p>` : '')}
      ${detail.remember ? `<p class="td-remember">${esc(detail.remember)}</p>` : ''}
    </div>`;
}

export async function renderTerm(root, topicId, rawIndex) {
  const t = TOPICS[topicId];
  const i = Number(rawIndex);
  const term = t?.terms?.[i];

  if (!term) {
    root.innerHTML = '<p class="empty">Термин не найден. <a href="#/">На главную</a></p>';
    return;
  }

  const loc = TOPIC_INDEX[topicId] || {};
  const s = loc.sectionId ? findSection(loc.sectionId) : null;
  const m = loc.moduleId ? findModule(loc.sectionId, loc.moduleId) : null;

  const trail = [{ title: 'Главная', href: '#/' }];
  if (s && s.page !== topicId) trail.push({ title: s.title, href: `#/s/${s.id}` });
  if (m && m.page !== topicId) trail.push({ title: m.title, href: `#/m/${s.id}/${m.id}` });
  trail.push({ title: t.title, href: `#/t/${topicId}` });
  trail.push({ title: term.en });

  const cards = hasCards(topicId);
  const saved = cards ? !!(await store.findCard(`${topicId}:term:${i}`)) : false;

  root.innerHTML = `
    ${crumbs(trail)}

    <div class="term-page">
      <h1 class="page-title">${esc(term.en)}</h1>
      <p class="term-page-ru">${esc(term.ru)}</p>
      ${term.note ? `<p class="term-page-note">${esc(term.note)}</p>` : ''}
      ${detailBlock(term.detail)}
      <div class="actions">
        ${cards ? `
          <button class="btn" id="term-save"${saved ? ' disabled' : ''}>
            ${saved ? 'Уже в колоде' : 'Отложить для повторения'}
          </button>` : ''}
      </div>
    </div>

    <div class="section-title">Спросить про термин</div>
    <div class="modes">
      ${MODES.map((mode) => `<button class="btn" data-mode="${mode.id}">${mode.label}</button>`).join('')}
    </div>
    <div class="result" id="term-result"></div>

    <div class="practice">
      <div class="section-title">Спросить своё</div>
      <div class="result-card">
        <textarea class="input" id="term-q" rows="2"
                  placeholder="Напр. «как это связано с окном контекста?»"></textarea>
        <div class="actions" style="margin-top:12px">
          <button class="btn primary" id="term-ask">Спросить</button>
          <span class="muted" style="font-size:13px">⌘/Ctrl + Enter</span>
        </div>
        <div id="term-ask-out"></div>
      </div>
    </div>`;

  const result = root.querySelector('#term-result');

  root.querySelector('#term-save')?.addEventListener('click', async (e) => {
    await store.saveCard(termCard(topicId, i));
    e.target.disabled = true;
    e.target.textContent = 'Уже в колоде';
    toast('Термин отложен для повторения');
  });

  /* ── Три вопроса к модели ───────────────────────────── */

  async function run(mode) {
    result.innerHTML = `<div class="result-card">${loading(mode.loading)}</div>`;
    try {
      const out = await ask(P.termPrompt(topicId, term, mode.id), { temperature: 0.6 });
      result.innerHTML = `
        <div class="result-card">
          <div class="gen-item">
            <div class="gen-label">${esc(mode.main)}</div>
            <div class="gen-en">${mdLite(out.main)}</div>
          </div>
          ${out.extra ? `
            <div class="gen-item">
              <div class="gen-label">${esc(mode.extra)}</div>
              <div class="gen-why">${mdLite(out.extra)}</div>
            </div>` : ''}
          <div class="actions" style="margin-top:14px">
            <button class="btn small" id="term-again">Ещё раз</button>
          </div>
        </div>`;
      result.querySelector('#term-again').addEventListener('click', () => run(mode));
    } catch (err) {
      const noKey = err instanceof NoKeyError;
      result.innerHTML = `
        <div class="result-card">
          ${errorBox(noKey ? 'Добавь API-ключ в настройках.' : err.message, noKey)}
          ${noKey ? '' : '<div class="actions" style="margin-top:12px"><button class="btn" id="term-retry">Повторить</button></div>'}
        </div>`;
      result.querySelector('#term-retry')?.addEventListener('click', () => run(mode));
    }
  }

  root.querySelectorAll('[data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('active', b === btn));
      run(MODES.find((mode) => mode.id === btn.dataset.mode));
    });
  });

  /* ── Свой вопрос ─────────────────────────────────────── */

  const field = root.querySelector('#term-q');
  const askBtn = root.querySelector('#term-ask');
  const out = root.querySelector('#term-ask-out');

  field.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); askBtn.click(); }
  });

  askBtn.addEventListener('click', async () => {
    const question = field.value.trim();
    if (!question) {
      out.innerHTML = '<div class="verdict no" style="margin-top:14px">Сначала напиши вопрос.</div>';
      field.focus();
      return;
    }

    askBtn.disabled = true;
    askBtn.innerHTML = '<span class="spinner"></span> думаю…';
    out.innerHTML = '';

    try {
      const res = await ask(P.termAskPrompt(topicId, term, question), { temperature: 0.5 });
      out.innerHTML = `
        <div style="margin-top:14px">
          <div class="gen-item"><div class="gen-en">${mdLite(res.answer)}</div></div>
          ${res.example ? `
            <div class="gen-item">
              <div class="gen-label">Пример</div>
              <div class="gen-why">${mdLite(res.example)}</div>
            </div>` : ''}
          ${res.gap ? `
            <div class="gen-item gap">
              <div class="gen-label">За пределами конспекта</div>
              <div class="gen-why">${esc(res.gap)}</div>
            </div>` : ''}
        </div>`;
    } catch (err) {
      out.innerHTML = `<div style="margin-top:12px">${errorBox(err.message, err instanceof NoKeyError)}</div>`;
    }

    askBtn.disabled = false;
    askBtn.textContent = 'Спросить';
  });
}
