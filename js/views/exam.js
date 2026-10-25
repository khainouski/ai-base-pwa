import { DOMAINS, QUESTIONS, questionsFor, domainTitle } from '../../data/exam.js';
import { store } from '../storage.js';
import { ask, NoKeyError } from '../ai.js';
import * as P from '../prompts.js';
import { crumbs, esc, errorBox, loading, rowList, plural } from '../ui.js';
import { icon } from '../icons.js';

const ROOT = { title: 'Главная', href: '#/' };

/** Перемешивание на месте: порядок вопросов и вариантов не должен запоминаться. */
function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Варианты тоже перемешиваются, поэтому индекс правильного пересчитывается
 * вместе с ними — иначе через пару прогонов запоминается позиция, а не ответ.
 */
function prepare(q) {
  const order = shuffle(q.options.map((_, i) => i));
  return {
    ...q,
    options: order.map((i) => q.options[i]),
    answer: order.indexOf(q.answer),
  };
}

export async function renderExam(root, domainId = '') {
  if (!domainId) { renderPicker(root, await store.getExamLog()); return; }
  if (domainId !== 'all' && !DOMAINS.some((d) => d.id === domainId)) {
    root.innerHTML = '<p class="empty">Домен не найден. <a href="#/exam">К выбору</a></p>';
    return;
  }
  runExam(root, domainId);
}

function renderPicker(root, log) {
  const rows = [
    {
      href: '#/exam/all',
      icon: icon('exam'),
      title: 'Все домены',
      sub: 'Полный прогон банка вопросов',
      meta: String(QUESTIONS.length),
    },
    ...DOMAINS.map((d) => ({
      href: `#/exam/${d.id}`,
      icon: icon('module'),
      title: `${d.id} · ${d.title}`,
      sub: `${d.weight}% экзамена`,
      meta: String(questionsFor(d.id).length),
    })),
  ];

  const last = log.slice(0, 5);

  root.innerHTML = `
    ${crumbs([ROOT, { title: 'Мок-экзамен' }])}
    <h1 class="page-title">${icon('exam', 'title-icon')}Мок-экзамен</h1>
    <p class="page-sub">Свои формулировки по тем же ситуациям, что на CCAR-F. Проходной балл — 720 из 1000.</p>
    ${rowList(rows)}
    ${last.length ? `
      <div class="list-label">Последние прогоны</div>
      <div class="runs">
        ${last.map((r) => `
          <div class="run">
            <span class="run-domain">${esc(r.domain === 'all' ? 'Все домены' : `${r.domain} · ${domainTitle(r.domain)}`)}</span>
            <span class="run-score ${r.score >= 720 ? 'ok' : 'no'}">${esc(r.right)} из ${esc(r.total)} · ${esc(r.score)}</span>
          </div>`).join('')}
      </div>` : ''}`;
}

function runExam(root, domainId) {
  const pool = shuffle(questionsFor(domainId === 'all' ? '' : domainId)).map(prepare);
  if (!pool.length) {
    root.innerHTML = '<p class="empty">В этом домене пока нет вопросов.</p>';
    return;
  }

  let i = 0;
  let right = 0;
  const wrong = [];

  const title = domainId === 'all' ? 'Все домены' : `${domainId} · ${domainTitle(domainId)}`;

  root.innerHTML = `
    ${crumbs([ROOT, { title: 'Мок-экзамен', href: '#/exam' }, { title }])}
    <h1 class="page-title">${esc(title)}</h1>
    <p class="page-sub" id="ex-progress"></p>
    <div id="ex-slot"></div>`;

  const progress = root.querySelector('#ex-progress');
  const slot = root.querySelector('#ex-slot');

  function draw() {
    const q = pool[i];
    progress.textContent = `Вопрос ${i + 1} из ${pool.length} · верно ${right}`;
    slot.innerHTML = `
      <div class="result-card quiz-item">
        <div class="quiz-topic">${esc(q.domain)} · ${esc(q.topic)}</div>
        <div class="quiz-q">${esc(q.q)}</div>
        <div class="quiz-options">
          ${q.options.map((o, j) => `<button class="quiz-option" type="button" data-opt="${j}">${esc(o)}</button>`).join('')}
        </div>
        <div class="quiz-why" hidden></div>
        <div class="actions" style="margin-top:14px" hidden id="ex-next-bar">
          <button class="btn primary" id="ex-next">${i + 1 === pool.length ? 'Итог' : 'Дальше'}</button>
          <button class="btn" id="ex-ai" hidden>Разобрать с AI</button>
        </div>
        <div id="ex-ai-out"></div>
      </div>`;

    const why = slot.querySelector('.quiz-why');
    const bar = slot.querySelector('#ex-next-bar');
    const aiBtn = slot.querySelector('#ex-ai');
    const aiOut = slot.querySelector('#ex-ai-out');

    slot.querySelectorAll('.quiz-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (bar.hidden === false) return;
        const chosen = Number(btn.dataset.opt);
        const ok = chosen === q.answer;
        if (ok) right += 1; else wrong.push({ q, chosen });

        slot.querySelectorAll('.quiz-option').forEach((b, j) => {
          b.disabled = true;
          if (j === q.answer) b.classList.add('ok');
          else if (j === chosen) b.classList.add('no');
        });

        why.hidden = false;
        why.innerHTML = `
          <span class="verdict ${ok ? 'ok' : 'no'}">${ok ? '✓ Верно' : '✗ Неверно'}</span>
          <span class="why">${esc(q.why)}</span>`;
        bar.hidden = false;
        // Разбор с AI предлагается только там, где он нужен — после ошибки.
        aiBtn.hidden = ok;

        aiBtn.addEventListener('click', async () => {
          aiBtn.disabled = true;
          aiOut.innerHTML = loading('Разбираю…');
          try {
            const r = await ask(P.reviewMistakePrompt(q, chosen, q.answer), { temperature: 0.4 });
            aiOut.innerHTML = `
              <div class="gen-item"><div class="gen-label">Почему верный вариант верен</div><div class="gen-why">${esc(r.why)}</div></div>
              <div class="gen-item"><div class="gen-label">Ловушка</div><div class="gen-why">${esc(r.trap)}</div></div>
              <div class="gen-item"><div class="gen-label">Запомнить</div><div class="gen-en">${esc(r.remember)}</div></div>`;
          } catch (err) {
            aiOut.innerHTML = errorBox(err.message, err instanceof NoKeyError);
            aiBtn.disabled = false;
          }
        }, { once: true });
      });
    });

    slot.querySelector('#ex-next').addEventListener('click', () => {
      i += 1;
      if (i < pool.length) draw();
      else finish();
    });
  }

  async function finish() {
    // Шкала экзамена — 1000 баллов, проходной 720: так результат сразу сравним.
    const score = Math.round((right / pool.length) * 1000);
    await store.addExamRun({ domain: domainId, right, total: pool.length, score });

    progress.textContent = '';
    slot.innerHTML = `
      <div class="result-card">
        <div class="rv-front">${right} из ${pool.length}</div>
        <p class="exam-score ${score >= 720 ? 'ok' : 'no'}">${score} из 1000 · проходной 720</p>
        ${wrong.length ? `
          <div class="section-title">Ошибки — ${wrong.length} ${plural(wrong.length, 'вопрос', 'вопроса', 'вопросов')}</div>
          ${wrong.map(({ q }) => `
            <div class="gen-item">
              <div class="gen-label">${esc(q.domain)} · ${esc(q.topic)}</div>
              <div class="gen-en">${esc(q.q)}</div>
              <div class="gen-why">${esc(q.options[q.answer])}</div>
            </div>`).join('')}` : '<p class="muted">Ошибок нет.</p>'}
        <div class="actions" style="margin-top:16px">
          <button class="btn primary" id="ex-retry">Ещё раз</button>
          <a class="btn" href="#/exam">К выбору домена</a>
        </div>
      </div>`;

    slot.querySelector('#ex-retry').addEventListener('click', () => runExam(root, domainId));
  }

  draw();
}
