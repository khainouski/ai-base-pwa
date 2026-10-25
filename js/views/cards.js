import { store, INTERVALS_DAYS } from '../storage.js';
import { crumbs, esc, rowList, toast, plural } from '../ui.js';
import { icon } from '../icons.js';

const ROOT = { title: 'Главная', href: '#/' };

/** «через 3 дня» здесь полезнее даты: важен интервал, а не календарь. */
function dueLabel(card) {
  const left = (card.due ?? 0) - Date.now();
  if (left <= 0) return 'к повторению';
  const days = Math.ceil(left / (24 * 60 * 60 * 1000));
  if (days <= 1) return 'завтра';
  return `через ${days} ${plural(days, 'день', 'дня', 'дней')}`;
}

export async function renderCards(root) {
  const cards = await store.getCards();
  const due = await store.dueCards();

  if (!cards.length) {
    root.innerHTML = `
      ${crumbs([ROOT, { title: 'Мои карточки' }])}
      <h1 class="page-title">${icon('cards', 'title-icon')}Мои карточки</h1>
      <p class="empty">Пока пусто. Открой любую тему и отложи термины кнопкой «+».</p>`;
    return;
  }

  root.innerHTML = `
    ${crumbs([ROOT, { title: 'Мои карточки' }])}
    <h1 class="page-title">${icon('cards', 'title-icon')}Мои карточки</h1>
    <p class="page-sub">${cards.length} ${plural(cards.length, 'карточка', 'карточки', 'карточек')},
      ${due.length} к повторению. Шаги расписания: ${INTERVALS_DAYS.join(', ')} дней.</p>

    ${due.length ? rowList([{
    href: '#/review',
    icon: icon('repeat'),
    title: 'Повторить сейчас',
    sub: 'Карточки, подошедшие по расписанию',
    meta: String(due.length),
  }]) : ''}

    <div class="deck" id="deck">
      ${cards.map((c) => `
        <div class="deck-card" data-id="${esc(c.id)}">
          <div class="deck-front">${esc(c.front)}</div>
          <div class="deck-back">${esc(c.back)}</div>
          <div class="deck-meta">
            ${c.topicId ? `<a href="#/t/${esc(c.topicId)}">${esc(c.topicTitle || c.topicId)}</a>` : ''}
            <span class="deck-due">${esc(dueLabel(c))}</span>
            <button class="icon-btn" type="button" data-remove="${esc(c.id)}" aria-label="Удалить карточку">✕</button>
          </div>
        </div>`).join('')}
    </div>`;

  // Слушатель — на самой колоде: #app живёт дольше экрана, см. topic.js.
  root.querySelector('#deck').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-remove]');
    if (!btn) return;
    await store.removeCard(btn.dataset.remove);
    btn.closest('.deck-card')?.remove();
    toast('Карточка удалена');
  });
}
