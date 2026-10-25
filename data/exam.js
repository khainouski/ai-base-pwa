/**
 * Банк вопросов для режима «Мок-экзамен» (`#/exam`).
 *
 * Вопросы и ответы — по-английски: экзамен сдаётся на английском, и привыкать
 * надо к его формулировкам. Интерфейс вокруг них остаётся русским.
 *
 * Это не настоящие вопросы CCAR-F, а свои формулировки по тем же ситуациям:
 * проверяется логика выбора, а не память.
 *
 * Вопрос: { id, domain, topic, q, options: [...], answer: <индекс>, why }
 * Правильный ответ хранится индексом: варианты перемешиваются при показе.
 */

export const DOMAINS = [
  { id: 'D1', title: 'Agentic Architecture & Orchestration', weight: 27 },
  { id: 'D2', title: 'Claude & Model Capabilities', weight: 18 },
  { id: 'D3', title: 'Integration & MCP', weight: 18 },
  { id: 'D4', title: 'Prompt Engineering', weight: 20 },
  { id: 'D5', title: 'Evaluation, Safety & Operations', weight: 17 },
];

export const QUESTIONS = [
  {
    id: 'D1-01',
    domain: 'D1',
    topic: 'Agent resilience & recovery',
    q: 'A multi-agent system crashes mid-run; every agent had completed part of its work. What lets the system resume with the least data loss?',
    options: [
      'Agents persist their progress to durable storage, and the coordinator restores state from it after the restart',
      'Each agent remembers where it stopped and recovers on its own at the next launch',
      'The coordinator decides at runtime what has to be redone',
      'Each agent spins up its own database',
    ],
    answer: 0,
    why: 'State has to outlive the process. The coordinator is the only component that sees the whole picture, so it is the one that reassembles it.',
  },
  {
    id: 'D1-02',
    domain: 'D1',
    topic: 'Coordinator-to-agent data passing',
    q: 'The Searcher finishes, but the Synthesizer reports that it received no findings. Which data flow is reliable?',
    options: [
      'The coordinator receives the Searcher output and explicitly injects it into the Synthesizer prompt',
      'The Searcher calls the Synthesizer directly and hands the data over',
      'Both agents read a shared transcript and work it out themselves',
      'The Synthesizer repeats the search on its own',
    ],
    answer: 0,
    why: 'Sub-agents do not talk to each other: all coordination, including passing data, goes through the orchestrator.',
  },
  {
    id: 'D1-03',
    domain: 'D1',
    topic: 'Tool selection',
    q: 'Four agents share 18 tools and keep calling the wrong ones. What is the most effective fix?',
    options: [
      'Restrict each agent to the 4–5 tools relevant to its role',
      'List every tool with its description in the system prompt',
      'Raise temperature so the agent explores more options',
      'Merge all tools into one general-purpose tool',
    ],
    answer: 0,
    why: 'The wider the tool surface, the higher the chance of a wrong pick. Narrowing it per role is the most direct remedy.',
  },
  {
    id: 'D1-04',
    domain: 'D1',
    topic: 'Parallel execution',
    q: 'A coordinator invokes three independent sub-agents sequentially and the run takes too long. What should change?',
    options: [
      'Invoke the independent sub-agents in parallel and combine their results',
      'Merge the three sub-agents into a single agent',
      'Raise max_tokens so each agent answers faster',
      'Switch to a cheaper model',
    ],
    answer: 0,
    why: 'When the work is independent, sequencing is pure wasted latency.',
  },
  {
    id: 'D1-05',
    domain: 'D1',
    topic: 'Format normalization',
    q: 'Three tools return order data in vendor-specific formats and the synthesizer reasons poorly over them. What is the best approach?',
    options: [
      'Normalize each tool result to one JSON schema right after the call returns',
      'Add few-shot examples for parsing each format to the system prompt',
      'Introduce another agent that translates between formats',
      'Describe the desired fields in the system prompt and ask the model to reformat',
    ],
    answer: 0,
    why: 'A deterministic transformation belongs in code, not in a probabilistic model. Normalizing at the tool boundary beats any amount of examples.',
  },
  {
    id: 'D1-06',
    domain: 'D1',
    topic: 'Citation preservation',
    q: 'Document and web sub-agents return findings, but the summarizer strips every source citation from the final report. What fixes it?',
    options: [
      'Require all agents to return structured data carrying source metadata',
      'Ask the summarizer to add source links from memory',
      'Increase the context window',
      'Store sources in a separate file and attach it to the report',
    ],
    answer: 0,
    why: 'If the source is part of the response structure, there is nothing to lose along the way.',
  },
  {
    id: 'D3-01',
    domain: 'D3',
    topic: 'Why MCP',
    q: 'Why adopt MCP when tools can simply be declared in each request?',
    options: [
      'M clients and N data sources each integrate once instead of building M×N connectors',
      'MCP makes the model more capable on the same data',
      'MCP replaces RAG',
      'MCP is only needed for local files',
    ],
    answer: 0,
    why: 'It is a compatibility protocol: every side implements it once.',
  },
  {
    id: 'D3-02',
    domain: 'D3',
    topic: 'MCP server surfaces',
    q: 'What does an MCP server expose to a client?',
    options: [
      'Tools, resources and prompts',
      'Callable functions only',
      'The model and its weights',
      'Canned answers to frequent questions',
    ],
    answer: 0,
    why: 'Three surfaces: callable tools, data addressed by URI, and ready-made prompts.',
  },
  {
    id: 'D4-01',
    domain: 'D4',
    topic: 'Prompt structure',
    q: 'The model keeps confusing your instructions with user-supplied data. What helps most reliably?',
    options: [
      'Separate the blocks with XML tags: instruction, context, data',
      'Write the instruction in capital letters',
      'Repeat the instruction once more at the end',
      'Set temperature to zero',
    ],
    answer: 0,
    why: 'Explicit block boundaries solve it structurally instead of by persuasion.',
  },
  {
    id: 'D4-02',
    domain: 'D4',
    topic: 'Few-shot examples',
    q: 'Answers are factually fine but the style and format vary on every run. What do you try first?',
    options: [
      'Put one or two input → output examples directly in the prompt',
      'Raise max_tokens',
      'Switch to a larger model',
      'Add "answer with high quality" to the prompt',
    ],
    answer: 0,
    why: 'Examples pin down the format far more precisely than describing it in words.',
  },
  {
    id: 'D5-01',
    domain: 'D5',
    topic: 'Diagnosing from metrics',
    q: 'The overall success rate looks high, yet complaints keep coming. How do you find the problem?',
    options: [
      'Group the metric by request category and look for the failing sub-group',
      'Raise the success threshold and measure again',
      'Double the size of the test set',
      'Compare only the averages before and after',
    ],
    answer: 0,
    why: 'An average hides a failure concentrated in one narrow category; grouping exposes it.',
  },
  {
    id: 'D5-02',
    domain: 'D5',
    topic: 'Error-handling boundary',
    q: 'A sub-agent gets a 429 from an external API. Where should it be handled?',
    options: [
      'Retry inside the sub-agent, and report upward only the result or a final failure with its reason',
      'Fail immediately and surface the error to the user',
      'Pass every error to the orchestrator without retrying',
      'Ignore it and return an empty result',
    ],
    answer: 0,
    why: 'Small retryable errors are absorbed where they happen; what reaches the orchestrator is what changes the plan.',
  },
];

export const questionsFor = (domainId) =>
  (domainId ? QUESTIONS.filter((q) => q.domain === domainId) : QUESTIONS);

export const domainTitle = (id) => DOMAINS.find((d) => d.id === id)?.title || id;
