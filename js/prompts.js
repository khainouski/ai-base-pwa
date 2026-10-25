/**
 * Все промпты приложения. Новый AI-режим добавляется сюда, а не в вид.
 *
 * Каждый промпт встраивает `topicBrief()` — выжимку из собственного конспекта.
 * Это главное правило: модель спрашивает и проверяет по тому, что записано в
 * data/content.js, а не по своим представлениям о предмете. Поэтому формат
 * ожидаемого JSON описывается текстом прямо в промпте: он должен совпадать с
 * тем, как вид потом читает поля.
 */

import { TOPICS, topicTitle } from '../data/content.js';
import { domainTitle } from '../data/exam.js';

/** Конспект темы в виде, пригодном для промпта: без разметки, по строкам. */
export function topicBrief(topicId) {
  const t = TOPICS[topicId];
  if (!t) return '';

  const lines = [`Topic: ${t.title}`];
  if (t.intro) lines.push(`Summary: ${t.intro}`);
  if (t.domain) lines.push(`Exam domain: ${t.domain} — ${domainTitle(t.domain)}`);

  for (const p of t.points || []) lines.push(`Key point: ${p.t} — ${p.d}`);
  for (const term of t.terms || []) lines.push(`Term: ${term.en} = ${term.ru}${term.note ? ` — ${term.note}` : ''}`);
  for (const c of t.commands || []) lines.push(`Command: ${c.cmd} — ${c.what}`);
  for (const qa of t.qa || []) lines.push(`Known Q&A: ${qa.q} → ${qa.a}`);
  if (t.diagram?.caption) lines.push(`Diagram on the page: ${t.diagram.caption}`);
  for (const c of t.code || []) lines.push(`Code example — ${c.title}:\n${c.body}`);
  for (const x of t.outline || []) lines.push(`Planned, not written yet: ${x}`);

  return lines.join('\n');
}

/** Несколько тем сразу — для прогонов по разделу. */
const manyBriefs = (ids) => ids.map(topicBrief).filter(Boolean).join('\n\n---\n\n');

/* ── Разбор одного термина ───────────────────────────────── */

/** Общая часть запросов про термин: сам термин в рамках конспекта. */
const termContext = (topicId, term) => {
  const d = term.detail;
  const notes = Array.isArray(d)
    ? d
    : [d?.what, ...(d?.how || []), d?.example, d?.impl?.body, ...(d?.impl?.notes || []),
      d?.mistake, d?.remember].filter(Boolean);
  return `${topicBrief(topicId)}

The term in question: ${term.en} (${term.ru})${term.note ? ` — ${term.note}` : ''}
${notes.map((x) => `Already written in the notes: ${x}`).join('\n')}`;
};

/**
 * Три режима страницы термина. Формат ответа общий — `main` и `extra`, —
 * поэтому вид рисует их одинаково и меняет только подписи.
 *
 * Все три требуют не повторять написанное: на странице уже лежит разбор,
 * и смысл запроса в том, чтобы добавить к нему, а не пересказать.
 */
const TERM_MODES = {
  explain: `Explain the term again, differently from the notes: another angle, another analogy.
"main": the explanation, 2–3 sentences. "extra": why it matters in practice, one sentence.`,
  implementation: `Show how this is actually written: a complete, working artifact — a file, a config block, a command with its flags, a short function — not a fragment.
"main": the artifact itself, as plain text, with short inline comments where they help. Keep every line under 52 characters: this is read on a phone.
"extra": two or three sentences on why the parts are the way they are — what breaks if each is wrong.
If the notes already contain such an artifact, write a different one: another use case, another shape.`,
  pitfall: `Describe a mistake with this term that is NOT the one already written in the notes.
"main": the mistake and how it shows up. "extra": what to do instead, one sentence.`,
};

export const termPrompt = (topicId, term, mode) => `
The learner is studying one term from the notes below.

${termContext(topicId, term)}

${TERM_MODES[mode] || TERM_MODES.explain}

Stay inside the notes: do not teach a different concept and do not contradict them.
Do not repeat what the notes already say — the learner has just read it.
Keep it short: this is read on a phone.

Return JSON: {"main":"...","extra":"..."}`;

/** Свободный вопрос про тот же термин. */
export const termAskPrompt = (topicId, term, question) => `
The learner is studying one term from the notes below and asks about it.

${termContext(topicId, term)}

Question: ${question}

Answer from the notes. If the answer goes beyond them, say so in "gap" and answer anyway.
"answer" is 2–4 sentences, "example" is one concrete case or an empty string.

Return JSON: {"answer":"...","example":"","gap":""}`;

/* ── Объяснение своими словами ────────────────────────────── */

export const explainPrompt = (topicId, question) => `
The learner asks a question about the topic below. Answer from the notes.

${topicBrief(topicId)}

Question: ${question}

Rules:
- If the notes do not cover it, say so plainly in "gap" and answer anyway, marking what goes beyond them.
- "answer" is 2–5 sentences. "example" is one concrete case (code, command, or a short situation).

Return JSON: {"answer":"...","example":"...","gap":""}`;

/* ── Прогон по разделу ────────────────────────────────────── */

export const mixPrompt = (topicIds, sectionTitle, count = 6) => `
Write ${count} multiple-choice questions spanning the whole section "${sectionTitle}", using ONLY the notes below.

${manyBriefs(topicIds)}

Rules:
- Spread the questions across the topics rather than staying in one.
- Exactly 4 options, exactly one correct.
- Prefer questions that make two topics meet (e.g. when to use one mechanism over another).

Return JSON: {"items":[{"q":"...","topic":"название темы","options":["...","...","...","..."],"answer":0,"why":"..."}]}`;

/* ── Разбор ошибки на экзаменационном вопросе ─────────────── */

export const reviewMistakePrompt = (question, chosen, correct) => `
The learner answered a certification practice question wrongly. Explain the difference.

Question: ${question.q}
Options:
${question.options.map((o, i) => `${i + 1}. ${o}`).join('\n')}
Learner chose: ${chosen + 1}
Correct answer: ${correct + 1}
Author's note: ${question.why}

Return JSON: {"why":"почему правильный вариант верен","trap":"на чём именно ловит выбранный вариант","remember":"одно предложение, которое стоит запомнить"}`;

export const titleOf = topicTitle;
