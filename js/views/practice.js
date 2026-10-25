import { ask, NoKeyError } from '../ai.js';
import * as P from '../prompts.js';
import { errorBox, esc, loading, mdLite } from '../ui.js';

/**
 * Панель вопроса к модели.
 *   ctx = { kind: 'topic',   topicId }           — спросить по этой странице
 *   ctx = { kind: 'section', title, topicIds }   — прогон вопросов по разделу
 *
 * Контекстом уходит сам конспект (js/prompts.js → topicBrief), поэтому ответ
 * опирается на то, что на странице написано, а не на общие знания модели.
 * Всё, что пришло от модели, выводится через esc()/mdLite(): это недоверенный
 * текст, даже когда он про наши же заметки.
 */
export function mountPractice(slot, ctx) {
  if (!slot) return;
  if (ctx.kind === 'section') { mountSectionQuiz(slot, ctx); return; }
  mountAsk(slot, ctx.topicId);
}

/* ── Вопрос по странице ───────────────────────────────────── */

function mountAsk(slot, topicId) {
  slot.innerHTML = `
    <div class="practice">
      <div class="section-title">Спросить по этой странице</div>
      <p class="page-sub practice-sub">
        Вопрос уходит вместе с текстом страницы — отвечает по конспекту, а не вообще.
      </p>
      <div class="result-card">
        <textarea class="input" id="ask-q" rows="2"
                  placeholder="Напр. «почему кириллица стоит дороже?»"></textarea>
        <div class="actions" style="margin-top:12px">
          <button class="btn primary" id="ask-go">Спросить</button>
          <span class="muted" style="font-size:13px">⌘/Ctrl + Enter</span>
        </div>
        <div id="ask-out"></div>
      </div>
    </div>`;

  const field = slot.querySelector('#ask-q');
  const go = slot.querySelector('#ask-go');
  const out = slot.querySelector('#ask-out');

  field.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); go.click(); }
  });

  go.addEventListener('click', async () => {
    const question = field.value.trim();
    if (!question) {
      out.innerHTML = '<div class="verdict no" style="margin-top:14px">Сначала напиши вопрос.</div>';
      field.focus();
      return;
    }

    go.disabled = true;
    go.innerHTML = '<span class="spinner"></span> думаю…';
    out.innerHTML = `<div style="margin-top:14px">${loading('Читаю страницу…')}</div>`;

    try {
      const res = await ask(P.explainPrompt(topicId, question), { temperature: 0.5 });
      out.innerHTML = `
        <div style="margin-top:14px">
          <div class="gen-item"><div class="gen-en">${mdLite(res.answer)}</div></div>
          ${res.example ? `
            <div class="gen-item">
              <div class="gen-label">Пример</div>
              <div class="gen-why">${mdLite(res.example)}</div>
            </div>` : ''}
          ${res.gap ? `
            <div class="gen-item gap">
              <div class="gen-label">За пределами страницы</div>
              <div class="gen-why">${esc(res.gap)}</div>
            </div>` : ''}
        </div>`;
    } catch (err) {
      out.innerHTML = `<div style="margin-top:12px">${errorBox(err.message, err instanceof NoKeyError)}</div>`;
    }

    go.disabled = false;
    go.textContent = 'Спросить';
  });
}

/* ── Прогон вопросов по разделу ───────────────────────────── */

function mountSectionQuiz(slot, ctx) {
  if (!ctx.topicIds?.length) return;

  slot.innerHTML = `
    <div class="practice">
      <div class="section-title">Прогон по разделу</div>
      <p class="page-sub practice-sub">Вопросы по всем страницам раздела сразу — так видно, что не уложилось.</p>
      <div class="actions"><button class="btn primary" id="q-run">Составить вопросы</button></div>
      <div class="result" id="q-result"></div>
    </div>`;

  const result = slot.querySelector('#q-result');

  async function run() {
    result.innerHTML = `<div class="result-card">${loading('Составляю вопросы…')}</div>`;
    try {
      const out = await ask(P.mixPrompt(ctx.topicIds, ctx.title), { temperature: 0.8 });
      draw(out.items || []);
    } catch (err) {
      result.innerHTML = `<div class="result-card">${errorBox(err.message, err instanceof NoKeyError)}</div>`;
    }
  }

  /** Вариант проверяется сразу по клику: на телефоне так понятнее, чем списком в конце. */
  function draw(items) {
    if (!items.length) {
      result.innerHTML = '<div class="result-card"><p class="muted">Пусто. Попробуй ещё раз.</p></div>';
      return;
    }

    result.innerHTML = `
      <div class="result-card">
        ${items.map((it, i) => `
          <div class="quiz-item" data-i="${i}">
            ${it.topic ? `<div class="quiz-topic">${esc(it.topic)}</div>` : ''}
            <div class="quiz-q">${esc(i + 1)}. ${esc(it.q)}</div>
            <div class="quiz-options">
              ${(it.options || []).map((o, j) => `
                <button class="quiz-option" type="button" data-opt="${j}">${esc(o)}</button>`).join('')}
            </div>
            <div class="quiz-why" hidden></div>
          </div>`).join('')}
        <div class="actions" style="margin-top:16px">
          <button class="btn" id="q-again">Ещё вопросы</button>
          <span class="muted" id="q-score"></span>
        </div>
      </div>`;

    let answered = 0;
    let right = 0;
    const score = result.querySelector('#q-score');

    result.querySelectorAll('.quiz-item').forEach((node) => {
      const item = items[Number(node.dataset.i)];
      node.addEventListener('click', (e) => {
        const btn = e.target.closest('.quiz-option');
        if (!btn || node.classList.contains('done')) return;

        const chosen = Number(btn.dataset.opt);
        const correct = Number(item.answer);
        node.classList.add('done');
        node.querySelectorAll('.quiz-option').forEach((b, j) => {
          if (j === correct) b.classList.add('ok');
          else if (j === chosen) b.classList.add('no');
        });

        const why = node.querySelector('.quiz-why');
        why.hidden = false;
        why.innerHTML = `
          <span class="verdict ${chosen === correct ? 'ok' : 'no'}">${chosen === correct ? '✓ Верно' : '✗ Неверно'}</span>
          <span class="why">${esc(item.why || '')}</span>`;

        answered += 1;
        if (chosen === correct) right += 1;
        score.textContent = `${right} из ${answered}`;
      });
    });

    result.querySelector('#q-again').addEventListener('click', run);
  }

  slot.querySelector('#q-run').addEventListener('click', run);
}
