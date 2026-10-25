import { store, INTERVALS_DAYS } from '../storage.js';
import { crumbs, esc, plural } from '../ui.js';
import { icon } from '../icons.js';

const ROOT = { title: 'Главная', href: '#/' };
const DECK = { title: 'Мои карточки', href: '#/cards' };

function nextIn(step) {
  const days = INTERVALS_DAYS[Math.min(step, INTERVALS_DAYS.length) - 1];
  if (!days) return '';
  return `следующий показ через ${days} ${plural(days, 'день', 'дня', 'дней')}`;
}

export async function renderReview(root) {
  /** Очередь берётся один раз: ответы не должны перетасовывать её на ходу. */
  let queue = await store.dueCards();
  let done = 0;

  if (!queue.length) {
    const all = await store.getCards();
    root.innerHTML = `
      ${crumbs([ROOT, DECK, { title: 'Повторение' }])}
      <h1 class="page-title">${icon('repeat', 'title-icon')}Повторение</h1>
      <p class="empty">${all.length
    ? 'На сегодня всё повторено. Возвращайся завтра.'
    : 'Сначала отложи карточки из тем — <a href="#/cards">Мои карточки</a>.'}</p>`;
    return;
  }

  root.innerHTML = `
    ${crumbs([ROOT, DECK, { title: 'Повторение' }])}
    <h1 class="page-title">${icon('repeat', 'title-icon')}Повторение</h1>
    <p class="page-sub" id="rv-progress"></p>
    <div id="rv-card"></div>`;

  const progress = root.querySelector('#rv-progress');
  const slot = root.querySelector('#rv-card');

  function drawCard(card) {
    // Считается вживую: неверный ответ возвращает карточку и удлиняет прогон.
    progress.textContent = `${done + 1} из ${done + queue.length}`;
    slot.innerHTML = `
      <div class="rv-card">
        <div class="rv-front">${esc(card.front)}</div>
        <div class="rv-back" hidden>
          <div class="rv-answer">${esc(card.back)}</div>
          ${card.topicId ? `<a class="rv-source" href="#/t/${esc(card.topicId)}">${esc(card.topicTitle || card.topicId)}</a>` : ''}
        </div>
      </div>
      <div class="rv-actions">
        <button class="btn primary" id="rv-show">Показать ответ</button>
        <button class="btn" id="rv-again" hidden>Не знаю</button>
        <button class="btn primary" id="rv-known" hidden>Знаю</button>
      </div>
      <p class="hint" id="rv-hint"></p>`;

    const back = slot.querySelector('.rv-back');
    const show = slot.querySelector('#rv-show');
    const again = slot.querySelector('#rv-again');
    const known = slot.querySelector('#rv-known');
    const hint = slot.querySelector('#rv-hint');

    show.addEventListener('click', () => {
      back.hidden = false;
      show.hidden = true;
      again.hidden = false;
      known.hidden = false;
      hint.textContent = `Знаю — ${nextIn((card.step ?? 0) + 1)}. Не знаю — вернётся сегодня же.`;
    });

    again.addEventListener('click', () => answer(card, false));
    known.addEventListener('click', () => answer(card, true));
  }

  async function answer(card, known) {
    await store.reviewCard(card.id, known);
    // Карточка с ошибкой задаётся ещё раз в конце того же прогона.
    if (!known) queue.push(card);
    done += 1;
    next();
  }

  function next() {
    queue = queue.slice(1);
    if (!queue.length) {
      progress.textContent = '';
      slot.innerHTML = `
        <div class="rv-card rv-done">
          <div class="rv-front">Готово</div>
          <p class="muted">Повторено карточек: ${done}. Следующие подойдут по расписанию.</p>
          <div class="actions" style="justify-content:center">
            <a class="btn" href="#/cards">К колоде</a>
          </div>
        </div>`;
      return;
    }
    drawCard(queue[0]);
  }

  drawCard(queue[0]);
}
