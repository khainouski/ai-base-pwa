import { TOPICS, TOPIC_INDEX, findSection, findModule, isStub, hasCards } from '../../data/content.js';
import { domainTitle } from '../../data/exam.js';
import { crumbs, topicBody, copyText, toast, esc } from '../ui.js';
import { store } from '../storage.js';
import { termCard, topicCards, savedCount } from '../cards.js';
import { mountPractice } from './practice.js';

export async function renderTopic(root, topicId) {
  const t = TOPICS[topicId];
  if (!t) {
    root.innerHTML = '<p class="empty">Тема не найдена. <a href="#/">На главную</a></p>';
    return;
  }

  const loc = TOPIC_INDEX[topicId] || {};
  const s = loc.sectionId ? findSection(loc.sectionId) : null;
  const m = loc.moduleId ? findModule(loc.sectionId, loc.moduleId) : null;

  const trail = [{ title: 'Главная', href: '#/' }];
  // У раздела-страницы крошка повторяла бы заголовок темы — она не нужна.
  if (s && s.page !== topicId) trail.push({ title: s.title, href: `#/s/${s.id}` });
  if (m && m.page !== topicId) trail.push({ title: m.title, href: `#/m/${s.id}/${m.id}` });
  trail.push({ title: t.title });

  const cards = hasCards(topicId);
  const learned = cards ? await store.getLearned(topicId) : [];
  const total = cards ? topicCards(topicId).length : 0;
  const saved = cards ? await savedCount(topicId) : 0;

  root.innerHTML = `
    ${crumbs(trail)}
    <div class="topic">
    <h1 class="page-title">${esc(t.title)}</h1>
    ${t.domain ? `<p class="domain-tag">${esc(t.domain)} · ${esc(domainTitle(t.domain))}</p>` : ''}

    ${topicBody(t, { learned, cards, topicId })}
    ${isStub(t) ? '<p class="empty stub">Конспект ещё не написан.</p>' : ''}

    ${total ? `
      <div class="actions deck-bar">
        <button class="btn primary" id="add-all">Отложить термины для повторения</button>
        <span class="muted" id="deck-state">${saved} из ${total} уже в колоде</span>
      </div>` : ''}

    </div>
    <div id="practice-slot"></div>`;

  const deckState = root.querySelector('#deck-state');
  const refreshDeckState = async () => {
    if (deckState) deckState.textContent = `${await savedCount(topicId)} из ${total} уже в колоде`;
  };

  /*
   * Делегирование вешается на обёртку этой страницы, а не на #app: роутер
   * переиспользует #app между экранами, и слушатели копились бы с каждым
   * заходом в тему — один клик добавлял бы карточку дважды.
   */
  root.querySelector('.topic').addEventListener('click', async (e) => {
    const copy = e.target.closest('[data-copy]');
    if (copy) { copyText(copy.dataset.copy); return; }

    const term = e.target.closest('[data-add-term]');
    if (term) {
      await store.saveCard(termCard(topicId, Number(term.dataset.addTerm)));
      await store.markLearned(topicId, `term:${term.dataset.addTerm}`);
      term.closest('.term')?.classList.add('known');
      toast('Термин в карточках');
      refreshDeckState();
      return;
    }

  });

  root.querySelector('#add-all')?.addEventListener('click', async () => {
    const { added } = await store.addCards(topicCards(topicId));
    toast(added ? `Добавлено карточек: ${added}` : 'Все карточки темы уже в колоде');
    refreshDeckState();
  });

  // Спрашивать по пустому конспекту нечего — панель появляется вместе с текстом.
  if (!isStub(t)) mountPractice(root.querySelector('#practice-slot'), { kind: 'topic', topicId });
}
