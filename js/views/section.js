import { TOPICS, findSection, findModule, sectionTopics, isStub } from '../../data/content.js';
import { crumbs, rowList, plural } from '../ui.js';
import { icon } from '../icons.js';
import { mountPractice } from './practice.js';
import { renderTopic } from './topic.js';

const ROOT = { title: 'Главная', href: '#/' };

const topicRow = (id) => ({
  href: `#/t/${id}`,
  icon: icon('topic'),
  title: TOPICS[id]?.title || id,
  sub: TOPICS[id]?.intro || '',
});

const notFound = (root) => {
  root.innerHTML = '<p class="empty">Раздел не найден. <a href="#/">На главную</a></p>';
};

export async function renderSection(root, sectionId) {
  const s = findSection(sectionId);
  if (!s) { notFound(root); return; }

  // Раздел «Области AI» — это одна страница: промежуточного списка нет.
  if (s.page) { await renderTopic(root, s.page); return; }

  // Раздел с модулями — это оглавление; плоский раздел сразу показывает темы.
  const body = s.modules
    ? rowList(s.modules.map((m) => ({
      // Модуль из одной страницы ведёт прямо на неё: список из одной строки лишний.
      href: m.page ? `#/t/${m.page}` : `#/m/${s.id}/${m.id}`,
      icon: icon(m.id) || icon('module'),
      title: m.title,
      sub: m.subtitle || '',
      meta: m.page ? '' : String(m.topics?.length || 0),
    })))
    : rowList((s.topics || []).filter((id) => TOPICS[id]).map(topicRow));

  const ids = sectionTopics(s).filter((id) => TOPICS[id]);
  const ready = ids.filter((id) => !isStub(TOPICS[id]));

  root.innerHTML = `
    ${crumbs([ROOT, { title: s.title }])}
    <h1 class="page-title">${icon(s.id, 'title-icon')}${s.title}</h1>
    ${s.subtitle ? `<p class="page-sub">${s.subtitle}</p>` : ''}
    ${body}
    <p class="hint">${ids.length} ${plural(ids.length, 'тема', 'темы', 'тем')} в разделе</p>
    <div id="practice-slot"></div>`;

  mountPractice(root.querySelector('#practice-slot'), {
    kind: 'section',
    title: s.title,
    topicIds: ready,
  });
}

export async function renderModule(root, sectionId, moduleId) {
  const s = findSection(sectionId);
  const m = findModule(sectionId, moduleId);
  if (!s || !m) { notFound(root); return; }

  if (m.page) { await renderTopic(root, m.page); return; }

  const ids = (m.topics || []).filter((id) => TOPICS[id]);
  const ready = ids.filter((id) => !isStub(TOPICS[id]));

  root.innerHTML = `
    ${crumbs([ROOT, { title: s.title, href: `#/s/${s.id}` }, { title: m.title }])}
    <h1 class="page-title">${m.title}</h1>
    ${m.subtitle ? `<p class="page-sub">${m.subtitle}</p>` : ''}
    ${rowList(ids.map(topicRow))}
    <div id="practice-slot"></div>`;

  mountPractice(root.querySelector('#practice-slot'), {
    kind: 'section',
    title: m.title,
    topicIds: ready,
  });
}
