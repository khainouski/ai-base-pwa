/** Строковые помощники, из которых собираются все экраны. Фреймворка нет. */

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Минимальный markdown: модель выделяет главное **жирным**, код — `бэктиками`. */
export function mdLite(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/(^|\W)\*([^*]+)\*(?=\W|$)/g, '$1<i>$2</i>');
}

/**
 * Ссылка назад, как в телефонном приложении: одна крупная цель с именем того,
 * куда она ведёт. Показывается на любой ширине — запущенное с домашнего
 * экрана приложение не имеет адресной строки, и это единственный выход.
 *
 * href указывает на родителя, но router.js превращает клик в history.back(),
 * если пользователь пришёл изнутри приложения.
 *
 * @param {{title: string, href?: string}[]} items корень → текущий экран
 */
export function crumbs(items) {
  const parent = items[items.length - 2];
  if (!parent) return '';

  const path = items.slice(0, -1)
    .map((it) => `<a href="${it.href}">${esc(it.title)}</a>`)
    .join('<span class="sep">›</span>');

  return `
    <div class="crumbs">
      <a class="back" href="${parent.href}" data-back aria-label="Назад: ${esc(parent.title)}">
        <span class="back-chevron" aria-hidden="true">‹</span>${esc(parent.title)}
      </a>
      ${items.length > 2 ? `<span class="crumbs-path">${path}</span>` : ''}
    </div>`;
}

/**
 * Строка-ссылка сгруппированного списка — паттерн настроек iOS:
 * плитка-иконка, заголовок, подпись, шеврон.
 *
 * @param {{href: string, icon?: string, title: string, sub?: string, meta?: string}[]} items
 */
export function rowList(items) {
  return `<div class="list">${items.map((it) => `
    <a class="row" href="${it.href}">
      ${it.icon ? `<span class="row-icon">${it.icon}</span>` : ''}
      <span class="row-text">
        <span class="row-title">${esc(it.title)}</span>
        ${it.sub ? `<span class="row-sub">${esc(it.sub)}</span>` : ''}
      </span>
      ${it.meta ? `<span class="row-meta">${esc(it.meta)}</span>` : ''}
      <span class="row-chevron" aria-hidden="true">›</span>
    </a>`).join('')}</div>`;
}

export function loading(text = 'Думаю…') {
  return `<div class="loading"><span class="spinner"></span>${esc(text)}</div>`;
}

export function errorBox(message, withSettings = false) {
  const link = withSettings ? '<a href="#/settings">Открыть настройки</a>' : '';
  return `<div class="banner"><span>${esc(message)}</span>${link}</div>`;
}

/** Короткое сообщение поверх интерфейса; исчезает само. */
export function toast(message, ms = 3500) {
  document.querySelector('.toast')?.remove();
  const node = el(`<div class="toast" role="status">${esc(message)}</div>`);
  document.body.appendChild(node);
  requestAnimationFrame(() => node.classList.add('show'));
  setTimeout(() => {
    node.classList.remove('show');
    setTimeout(() => node.remove(), 250);
  }, ms);
}

/** Русское склонение после числа: 1 тема, 2 темы, 5 тем. */
export function plural(n, one, few, many) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  const mod10 = n % 10;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

/* ── Блоки страницы темы ──────────────────────────────────── */

const pointsBlock = (points) => `
  <div class="rule-grid">
    ${points.map((p) => `
      <div class="rule-row">
        <div class="rr-en">${esc(p.t)}</div>
        <div class="rr-body"><div class="rr-ru">${esc(p.d)}</div></div>
      </div>`).join('')}
  </div>`;

/*
 * Термин — это карточка: английское слово крупно, перевод рядом, под ними
 * одна строка о том, когда он к месту. Кнопка «+» кладёт термин в колоду;
 * её слушает вид темы, здесь только разметка.
 */
const termsBlock = (terms, learned, cards, topicId) => `
  <div class="terms">
    ${terms.map((t, i) => `
      <div class="term${learned.includes(`term:${i}`) ? ' known' : ''}" data-term="${i}">
        <div class="term-head">
          <a class="term-link" href="#/term/${esc(topicId)}/${i}">
            <code>${esc(t.en)}</code>
            <span class="term-ru">${esc(t.ru)}</span>
          </a>
          ${cards ? `<button class="icon-btn term-add" type="button" data-add-term="${i}"
                  aria-label="Отложить для повторения: ${esc(t.en)}">+</button>` : ''}
        </div>
        ${t.note ? `<div class="term-note">${esc(t.note)}</div>` : ''}
      </div>`).join('')}
  </div>`;

/* Команда копируется по клику: на телефоне выделять текст пальцем — мучение. */
const commandsBlock = (commands) => `
  <div class="commands">
    ${commands.map((c) => `
      <button class="cmd" type="button" data-copy="${esc(c.cmd)}">
        <code>${esc(c.cmd)}</code>
        <span class="cmd-what">${esc(c.what)}</span>
      </button>`).join('')}
  </div>`;

const codeBlock = (code) => code.map((c) => `
  <div class="code">
    ${c.title ? `<div class="code-title">${esc(c.title)}</div>` : ''}
    <pre><code>${esc(c.body)}</code></pre>
  </div>`).join('');

const linksBlock = (links) => `
  <ul class="links">
    ${links.map((l) => `<li><a href="${esc(l.href)}" target="_blank" rel="noopener noreferrer">${esc(l.title)}</a></li>`).join('')}
  </ul>`;

/*
 * Схема идёт сразу под вступлением: если страницу можно понять картинкой,
 * она должна встретиться раньше текста, а не в конце.
 *
 * SVG берётся из data/content.js — это наш собственный файл, не ответ модели,
 * поэтому вставляется как есть. Цвета внутри заданы currentColor и var(--accent),
 * так что схема живёт и в светлой теме, и в тёмной.
 */
const diagramBlock = (d) => `
  <figure class="diagram">
    ${d.svg}
    ${d.caption || d.read?.length ? `
      <figcaption>
        ${d.caption ? `<span class="dg-caption">${esc(d.caption)}</span>` : ''}
        ${d.read?.length ? `<ul class="dg-read">${d.read.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      </figcaption>` : ''}
  </figure>`;

/*
 * План страницы — для тем, которые ещё не написаны: видно, что здесь будет,
 * и в каком порядке. По мере наполнения пункты превращаются в блоки выше.
 */
const outlineBlock = (outline) => `
  <ul class="outline">
    ${outline.map((x) => `<li>${esc(x)}</li>`).join('')}
  </ul>`;

const section = (title, body, count = '') => (body ? `
  <div class="section-title">${esc(title)}${count ? ` <span class="sec-count">${esc(count)}</span>` : ''}</div>
  ${body}` : '');

/**
 * Страница темы целиком. Рисуется только то, что в конспекте есть:
 * пустые блоки не оставляют после себя заголовков.
 *
 * @param {object} t      тема из data/content.js
 * @param {string[]} learned идентификаторы уже отмеченных элементов
 */
export function topicBody(t, { learned = [], cards = false, topicId = '' } = {}) {
  return `
    ${t.intro ? `<p class="page-sub">${esc(t.intro)}</p>` : ''}
    ${t.source ? `<p class="source">Источник: ${esc(t.source)}</p>` : ''}
    ${t.diagram ? diagramBlock(t.diagram) : ''}
    ${section('Главное', t.points?.length ? pointsBlock(t.points) : '')}
    ${section('Термины', t.terms?.length ? termsBlock(t.terms, learned, cards, topicId) : '', String(t.terms?.length || ''))}
    ${section('Команды', t.commands?.length ? commandsBlock(t.commands) : '')}
    ${section('Код', t.code?.length ? codeBlock(t.code) : '')}
    ${section('Ссылки', t.links?.length ? linksBlock(t.links) : '')}
    ${section('Что будет на странице', t.outline?.length ? outlineBlock(t.outline) : '')}`;
}

/** Копирование по клику с подтверждением тостом. Clipboard может быть запрещён. */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Скопировано');
  } catch {
    toast('Не удалось скопировать');
  }
}
