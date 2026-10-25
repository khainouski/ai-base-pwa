import { SECTIONS, TOPICS, TOPIC_INDEX, findSection, findModule } from '../data/content.js';
import { renderHome } from './views/home.js';
import { renderSection, renderModule } from './views/section.js';
import { renderTopic } from './views/topic.js';
import { renderTerm } from './views/term.js';
import { renderCards } from './views/cards.js';
import { renderReview } from './views/review.js';
import { renderExam } from './views/exam.js';
import { renderSettings } from './views/settings.js';
import { esc } from './ui.js';
import { icon } from './icons.js';

const app = document.getElementById('app');

function parse() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const [, kind, a, b] = hash.split('/');
  return {
    kind: kind || '',
    a: a ? decodeURIComponent(a) : '',
    b: b ? decodeURIComponent(b) : '',
  };
}

async function route() {
  const { kind, a, b } = parse();
  app.innerHTML = '';
  try {
    switch (kind) {
      case '': await renderHome(app); break;
      case 's': await renderSection(app, a); break;
      case 'm': await renderModule(app, a, b); break;
      case 't': await renderTopic(app, a); break;
      case 'term': await renderTerm(app, a, b); break;
      case 'cards': await renderCards(app); break;
      case 'review': await renderReview(app); break;
      case 'exam': await renderExam(app, a); break;
      case 'settings': await renderSettings(app); break;
      default: app.innerHTML = '<p class="empty">Страница не найдена. <a href="#/">На главную</a></p>';
    }
  } catch (e) {
    console.error(e);
    app.innerHTML = `<p class="empty">Ошибка отрисовки: ${esc(e.message)}</p>`;
  }
  window.scrollTo(0, 0);
}

/* ── Кнопка «назад» ────────────────────────────────────────── */
/*
 * С домашнего экрана адресной строки нет, и ссылка назад в crumbs() —
 * единственный выход. Вести она должна туда, откуда пришли, а не к родителю
 * в дереве: родителя пользователь мог вообще не открывать.
 *
 * Поэтому нумеруем свои записи истории. Переход по хэш-ссылке создаёт запись
 * без состояния и получает следующий номер; ходьба вперёд-назад восстанавливает
 * проставленный номер. Позиция 0 — точка входа в приложение: оттуда ссылка
 * идёт по своему href, иначе приложение осталось бы позади.
 */
let position = 0;

function trackPosition({ initial = false } = {}) {
  const stamped = history.state?.aibase;
  if (typeof stamped === 'number') {
    position = stamped;
    return;
  }
  position = initial ? 0 : position + 1;
  history.replaceState({ ...history.state, aibase: position }, '');
}

// Перезагрузка сохраняет номер записи — history.state её переживает.
trackPosition({ initial: true });

const canGoBack = () => position > 0;

app.addEventListener('click', (e) => {
  const back = e.target.closest('a[data-back]');
  // Клик с модификатором принадлежит браузеру: открыть в новой вкладке и т. п.
  if (!back || e.defaultPrevented || !canGoBack()) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  e.preventDefault();
  history.back();
});

/* ── Поиск по темам, терминам и командам ───────────────────── */
const topbar = document.querySelector('.topbar');
const searchWrap = document.querySelector('.search-wrap');
const searchInput = document.getElementById('search');
const searchResults = document.getElementById('search-results');
const searchToggle = document.getElementById('search-toggle');

searchToggle.innerHTML = icon('search');

/** Поле открывается лупой и накрывает панель, пока открыто. */
function openSearch() {
  searchWrap.hidden = false;
  topbar.classList.add('searching');
  searchToggle.setAttribute('aria-expanded', 'true');
  searchInput.focus();
}

function hideResults() {
  searchResults.hidden = true;
  searchResults.innerHTML = '';
  activeIdx = -1;
}

function closeSearch() {
  hideResults();
  searchInput.value = '';
  searchWrap.hidden = true;
  topbar.classList.remove('searching');
  searchToggle.setAttribute('aria-expanded', 'false');
}

const searchOpen = () => !searchWrap.hidden;

/**
 * Индекс строится один раз при загрузке: контент статический, а искать нужно
 * не только по заголовкам — термин и команда чаще всего и есть то, что ищут.
 */
const INDEX = (() => {
  const items = [];
  for (const id of Object.keys(TOPICS)) {
    const t = TOPICS[id];
    const loc = TOPIC_INDEX[id] || {};
    const s = loc.sectionId ? findSection(loc.sectionId) : null;
    const m = loc.moduleId ? findModule(loc.sectionId, loc.moduleId) : null;
    const path = [s?.title, m?.title].filter(Boolean).join(' › ');

    const haystack = [
      t.title, t.intro,
      ...(t.outline || []),
      ...(t.points || []).flatMap((p) => [p.t, p.d]),
      ...(t.terms || []).flatMap((x) => [x.en, x.ru, x.note]),
      ...(t.commands || []).flatMap((c) => [c.cmd, c.what]),
      ...(t.qa || []).flatMap((x) => [x.q, x.a]),
    ].filter(Boolean).join(' ').toLowerCase();

    items.push({ id, title: t.title, path: path || 'Темы', haystack });
  }
  for (const s of SECTIONS) {
    if (s.page) continue; // раздел-страница уже попал в индекс как тема
    items.push({
      id: `s/${s.id}`,
      title: s.title,
      path: 'Раздел',
      haystack: [s.title, s.subtitle].filter(Boolean).join(' ').toLowerCase(),
    });
  }
  return items;
})();

let activeIdx = -1;

function runSearch(q) {
  const query = q.trim().toLowerCase();
  if (query.length < 2) { hideResults(); return; }

  const hits = INDEX
    .map((it) => {
      let score = 0;
      if (it.title.toLowerCase().includes(query)) score += 10;
      if (it.haystack.includes(query)) score += 1;
      return { it, score };
    })
    .filter((r) => r.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, 12);

  activeIdx = -1;
  searchResults.hidden = false;
  searchResults.innerHTML = hits.length
    ? hits.map((r) => `
      <a href="#/${r.it.id.includes('/') ? r.it.id : `t/${r.it.id}`}">
        <div>${esc(r.it.title)}</div>
        <div class="sr-path">${esc(r.it.path)}</div>
      </a>`).join('')
    : '<div class="sr-empty">Ничего не найдено</div>';
}

searchToggle.addEventListener('click', () => (searchOpen() ? closeSearch() : openSearch()));
document.getElementById('search-close').addEventListener('click', closeSearch);

searchInput.addEventListener('input', (e) => runSearch(e.target.value));
searchInput.addEventListener('keydown', (e) => {
  const links = [...searchResults.querySelectorAll('a')];
  if (e.key === 'Escape') { closeSearch(); searchInput.blur(); return; }
  if (!links.length) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    activeIdx = (activeIdx + (e.key === 'ArrowDown' ? 1 : links.length - 1)) % links.length;
    links.forEach((l, i) => l.classList.toggle('active', i === activeIdx));
    links[activeIdx].scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') {
    e.preventDefault();
    (links[activeIdx] || links[0]).click();
  }
});

searchResults.addEventListener('click', (e) => {
  if (e.target.closest('a')) closeSearch();
});

document.addEventListener('click', (e) => {
  if (searchOpen() && !e.target.closest('.search-wrap') && !e.target.closest('#search-toggle')) {
    closeSearch();
  }
});

document.addEventListener('keydown', (e) => {
  const typing = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
  if (e.key === '/' && !typing) { e.preventDefault(); openSearch(); }
  if (e.key === 'Escape' && !typing && canGoBack()) history.back();
});

window.addEventListener('hashchange', async () => {
  trackPosition();
  await route();
});

route();
