import { TOPICS, sectionsOf, sectionSize } from '../../data/content.js';
import { QUESTIONS } from '../../data/exam.js';
import { rowList, plural } from '../ui.js';
import { icon } from '../icons.js';

/**
 * Раздел-страница ведёт прямо на свой конспект: промежуточный список из
 * одной строки только мешал бы. Раздел со списком или модулями — на себя.
 */
const href = (s) => (s.page ? `#/t/${s.page}` : `#/s/${s.id}`);

/** Номер в заголовке: разделы «Области AI» учатся по очереди, сверху вниз. */
const aiRow = (s, i) => ({
  href: href(s),
  icon: icon(s.id) || icon('topic'),
  title: `${i + 1}. ${s.title}`,
  sub: s.subtitle || '',
});

const row = (s) => ({
  href: href(s),
  icon: icon(s.id) || icon('topic'),
  title: s.title,
  sub: s.subtitle || '',
  meta: s.page ? '' : String(sectionSize(s)),
});

export async function renderHome(root) {
  const count = Object.keys(TOPICS).length;

  root.innerHTML = `
    <h1 class="page-title">AI Base</h1>
    <p class="page-sub">Конспект по AI и подготовка к сертификации — на телефоне.</p>

    <div class="list-label">Области AI — по очереди</div>
    ${rowList(sectionsOf('ai').map(aiRow))}

    <div class="list-label">Claude</div>
    ${rowList(sectionsOf('claude').map(row))}

    <div class="list-label">Spec-Driven Development</div>
    ${rowList(sectionsOf('sdd').map(row))}

    <div class="list-label">Практика</div>
    ${rowList([{
    href: '#/exam',
    icon: icon('exam'),
    title: 'Мок-экзамен',
    sub: 'Вопросы по доменам CCAR-F, на английском',
    meta: String(QUESTIONS.length),
  }])}

    <p class="hint">${count} ${plural(count, 'страница', 'страницы', 'страниц')} · поиск по <kbd>/</kbd></p>`;
}
