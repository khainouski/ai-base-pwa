/**
 * Единственный слой хранения: localStorage под префиксом `aibase:`.
 *
 * API асинхронный намеренно — если однажды переедем на IndexedDB или на
 * синхронизацию между устройствами, вызовы во вьюхах менять не придётся.
 */

/**
 * Провайдеры AI. Ключ и модель хранятся отдельно для каждого, так что
 * переключение туда-обратно не стирает уже введённый ключ.
 *
 * `keyHint` и `keyUrl` показываются в настройках — там, где берут ключ.
 */
export const PROVIDERS = [
  {
    id: 'claude',
    label: 'Claude (Anthropic)',
    keyHint: 'sk-ant-…',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    models: [
      { id: 'claude-opus-5-5', label: 'сильнее всех, дороже' },
      { id: 'claude-sonnet-5-5', label: 'баланс цены и качества' },
      { id: 'claude-haiku-5-5', label: 'дешёвая и быстрая' },
    ],
  },
  {
    id: 'gemini',
    label: 'Gemini (Google)',
    keyHint: 'AIza…',
    keyUrl: 'https://aistudio.google.com/apikey',
    models: [
      { id: 'gemini-3.7-flash', label: 'мощнее' },
      { id: 'gemini-3.5-flash-lite', label: 'дешёвая, лимиты выше' },
    ],
  },
];

/** Приложение про Claude — им и спрашиваем по умолчанию. */
const DEFAULT_PROVIDER = 'claude';

export const findProvider = (id) =>
  PROVIDERS.find((p) => p.id === id) || PROVIDERS.find((p) => p.id === DEFAULT_PROVIDER);

/**
 * Чем AI проверяет ответы: уровень собеседника. Влияет только на тон и
 * глубину объяснений, не на правильность.
 */
export const LEVELS = [
  { id: 'novice', label: 'Новичок', en: 'explain from first principles, avoid jargon without unpacking it' },
  { id: 'practitioner', label: 'Практик', en: 'assume working knowledge of LLM apps; be concise and technical' },
  { id: 'exam', label: 'Подготовка к экзамену', en: 'answer in the style of certification questions: name the tradeoff and why other options are worse' },
];

const DEFAULT_LEVEL = 'practitioner';

/** Интервальное повторение по Лейтнеру: дни, а не часы — в этом весь смысл. */
export const INTERVALS_DAYS = [1, 3, 7, 16, 35];

const DAY = 24 * 60 * 60 * 1000;

/** Карточка с ошибкой возвращается в тот же заход. */
const RETRY_MS = 10 * 60 * 1000;

const PREFIX = 'aibase:';
const KEYS = {
  provider: 'provider',
  cards: 'cards',
  level: 'level',
  examLog: 'examLog',
};

const keyFor = (provider) => `key:${provider}`;
const modelFor = (provider) => `model:${provider}`;
const learnKey = (topicId) => `learn:${topicId}`;

/** В приватном режиме Safari запись бросает исключение; приложение продолжает работать. */
function readRaw(key) {
  try { return localStorage.getItem(PREFIX + key); } catch { return null; }
}

function writeRaw(key, value) {
  try { localStorage.setItem(PREFIX + key, value); return true; } catch { return false; }
}

async function get(key, fallback) {
  const raw = readRaw(key);
  if (raw === null) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

async function set(key, value) {
  writeRaw(key, JSON.stringify(value));
}

export const store = {
  /* ── Провайдер, ключ, модель ── */

  async getProvider() {
    const id = await get(KEYS.provider, '');
    return PROVIDERS.some((p) => p.id === id) ? id : DEFAULT_PROVIDER;
  },
  setProvider: (v) => set(KEYS.provider, String(v || '').trim()),

  async getApiKey(provider) {
    const id = provider || (await store.getProvider());
    return get(keyFor(id), '');
  },
  async setApiKey(provider, value) {
    await set(keyFor(provider), String(value || '').trim());
  },

  /** Модель, выпавшая из списка провайдера, откатывается к первой — не к 404. */
  async getModel(provider) {
    const id = provider || (await store.getProvider());
    const p = findProvider(id);
    const chosen = await get(modelFor(id), '');
    return p.models.some((m) => m.id === chosen) ? chosen : p.models[0].id;
  },
  async setModel(provider, value) {
    await set(modelFor(provider), String(value || '').trim());
  },

  async getLevel() {
    const id = await get(KEYS.level, '');
    return LEVELS.some((l) => l.id === id) ? id : DEFAULT_LEVEL;
  },
  setLevel: (v) => set(KEYS.level, String(v || '').trim()),

  /* ── Прогон темы: что уже отмечено «знаю» ── */

  async getLearned(topicId) {
    const list = await get(learnKey(topicId), []);
    return Array.isArray(list) ? list : [];
  },

  async markLearned(topicId, itemId) {
    const list = await store.getLearned(topicId);
    if (!list.includes(itemId)) list.push(itemId);
    await set(learnKey(topicId), list);
    return list;
  },

  resetLearned: (topicId) => set(learnKey(topicId), []),

  /* ── Колода карточек ── */

  getCards: () => get(KEYS.cards, []),

  async findCard(id) {
    return (await store.getCards()).find((c) => c.id === id) || null;
  },

  /**
   * Добавляет карточку или обновляет уже лежащую с тем же id.
   * Расписание (`step`, `due`) при обновлении сохраняется: текст уточнили,
   * а прогресс повторений терять незачем.
   */
  async saveCard(card) {
    const cards = await store.getCards();
    const i = cards.findIndex((c) => c.id === card.id);
    if (i >= 0) cards[i] = { ...cards[i], ...card };
    else cards.unshift({ addedAt: Date.now(), step: 0, due: Date.now(), ...card });
    await set(KEYS.cards, cards);
    return cards;
  },

  /** Добавить пачку и сказать, сколько из них новых. */
  async addCards(list) {
    const cards = await store.getCards();
    const known = new Set(cards.map((c) => c.id));
    const fresh = list.filter((c) => !known.has(c.id));
    const merged = [...fresh.map((c) => ({ addedAt: Date.now(), step: 0, due: Date.now(), ...c })), ...cards];
    await set(KEYS.cards, merged);
    return { added: fresh.length, total: merged.length };
  },

  async removeCard(id) {
    const cards = (await store.getCards()).filter((c) => c.id !== id);
    await set(KEYS.cards, cards);
    return cards;
  },

  /** Карточки к повторению. Сохранённые до появления расписания считаются готовыми. */
  async dueCards(at = Date.now()) {
    return (await store.getCards())
      .filter((c) => (c.due ?? 0) <= at)
      .sort((a, b) => (a.due ?? 0) - (b.due ?? 0));
  },

  /**
   * @param {string} id
   * @param {boolean} known ответил верно
   */
  async reviewCard(id, known) {
    const cards = await store.getCards();
    const c = cards.find((x) => x.id === id);
    if (!c) return cards;

    const step = known ? Math.min((c.step ?? 0) + 1, INTERVALS_DAYS.length) : 0;
    c.step = step;
    c.due = known
      ? Date.now() + INTERVALS_DAYS[Math.min(step, INTERVALS_DAYS.length) - 1] * DAY
      : Date.now() + RETRY_MS;
    c.reviewedAt = Date.now();

    await set(KEYS.cards, cards);
    return cards;
  },

  /* ── Результаты прогонов экзамена ── */

  getExamLog: () => get(KEYS.examLog, []),

  /** Хранится последние 50 прогонов: этого хватает, чтобы видеть динамику. */
  async addExamRun(run) {
    const log = await store.getExamLog();
    const next = [{ at: Date.now(), ...run }, ...log].slice(0, 50);
    await set(KEYS.examLog, next);
    return next;
  },
};
