/**
 * Превращение конспекта в карточки для повторения.
 *
 * Идентификатор карточки детерминирован (`topicId:term:3`), поэтому повторное
 * добавление той же строки не плодит дубли и не сбрасывает расписание.
 * Карточки, придуманные моделью, получают префикс `ai:` и свой хэш —
 * у них нет позиции в конспекте, по которой их можно было бы узнать.
 */

import { TOPICS, topicTitle } from '../data/content.js';
import { store } from './storage.js';

/** Короткий стабильный хэш строки — только чтобы различать AI-карточки. */
function hash(text) {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) {
    h = (h * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

export const termCard = (topicId, i) => {
  const t = TOPICS[topicId];
  const term = t.terms[i];
  return {
    id: `${topicId}:term:${i}`,
    front: term.en,
    back: [term.ru, term.note].filter(Boolean).join(' — '),
    topicId,
    topicTitle: topicTitle(topicId),
  };
};

export const qaCard = (topicId, i) => {
  const t = TOPICS[topicId];
  const qa = t.qa[i];
  return {
    id: `${topicId}:qa:${i}`,
    front: qa.q,
    back: qa.a,
    topicId,
    topicTitle: topicTitle(topicId),
  };
};

export const aiCard = (topicId, { front, back }) => ({
  id: `${topicId}:ai:${hash(front)}`,
  front,
  back,
  topicId,
  topicTitle: topicTitle(topicId),
});

/** Все карточки темы разом — кнопка «Добавить всю тему». */
export function topicCards(topicId) {
  const t = TOPICS[topicId];
  if (!t) return [];
  return [
    ...(t.terms || []).map((_, i) => termCard(topicId, i)),
    ...(t.qa || []).map((_, i) => qaCard(topicId, i)),
  ];
}

/** Сколько карточек темы уже лежит в колоде — для подписи на странице. */
export async function savedCount(topicId) {
  const ids = new Set((await store.getCards()).map((c) => c.id));
  return topicCards(topicId).filter((c) => ids.has(c.id)).length;
}
