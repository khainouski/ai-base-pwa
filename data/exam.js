/**
 * Банк вопросов для режима «Мок-экзамен» (`#/exam`).
 *
 * Домены и веса сверены с официальным Exam Guide (июль 2026) и с таблицей
 * воспоминаний коллег: 60 вопросов, 120 минут, проходной балл 720 из 1000
 * по шкале 100–1000. Вопросы сценарные: несколько вариантов рабочие, но
 * лучший один.
 *
 * Это не настоящие вопросы экзамена, а свои формулировки по тем же ситуациям —
 * проверяется логика выбора. Текст английский: экзамен сдаётся на английском.
 *
 * Вопрос: { id, domain, topic, q, options: [...], answer: <индекс>, why }
 * Правильный ответ хранится индексом: варианты перемешиваются при показе.
 */

export const DOMAINS = [
  { id: 'D1', title: 'Agentic Architecture & Orchestration', weight: 27 },
  { id: 'D2', title: 'Tool Design & MCP Integration', weight: 18 },
  { id: 'D3', title: 'Claude Code Configuration & Workflows', weight: 20 },
  { id: 'D4', title: 'Prompt Engineering & Structured Output', weight: 20 },
  { id: 'D5', title: 'Context Management & Reliability', weight: 15 },
];

export const QUESTIONS = [
  /* ── D1 · Agentic Architecture & Orchestration (27%) ───── */
  {
    id: 'D1-01', domain: 'D1', topic: 'Agent resilience & recovery',
    q: 'A multi-agent run crashes midway; every agent had completed part of its work. What lets the system resume with the least data loss?',
    options: [
      'Agents persist progress to durable storage, and the coordinator restores state from it after the restart',
      'Each agent remembers where it stopped and recovers on its own at the next launch',
      'The coordinator decides at runtime what has to be redone',
      'Each agent provisions its own database',
    ],
    answer: 0,
    why: 'State has to outlive the process, and the coordinator is the only component that sees the whole picture, so it reassembles the run.',
  },
  {
    id: 'D1-02', domain: 'D1', topic: 'Coordinator-to-agent data passing',
    q: 'The Searcher finishes, but the Synthesizer reports it received no findings. Which data flow is reliable?',
    options: [
      'The coordinator takes the Searcher output and explicitly injects it into the Synthesizer prompt',
      'The Searcher calls the Synthesizer directly and hands the data over',
      'Both agents read a shared transcript and work it out themselves',
      'The Synthesizer repeats the search on its own',
    ],
    answer: 0,
    why: 'Sub-agents do not talk to each other: all coordination, including passing data, goes through the orchestrator.',
  },
  {
    id: 'D1-03', domain: 'D1', topic: 'Tool surface per role',
    q: 'Four agents share 18 tools and keep calling the wrong ones. What is the most effective fix?',
    options: [
      'Restrict each agent to the four or five tools relevant to its role',
      'List every tool with its description in the system prompt',
      'Raise temperature so the agent explores more options',
      'Merge all tools into one general-purpose tool',
    ],
    answer: 0,
    why: 'The wider the tool surface, the higher the chance of a wrong pick; narrowing it per role is the most direct remedy.',
  },
  {
    id: 'D1-04', domain: 'D1', topic: 'Parallel execution',
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
    id: 'D1-05', domain: 'D1', topic: 'Long sub-task parallelism',
    q: 'In a legal-analysis system the document agent needs over two minutes for a case with twelve precedents. How do you mitigate it?',
    options: [
      'Let the document agent spawn its own sub-agents, each handling a subset of precedents',
      'Have the coordinator partition the precedents and spawn several document agents itself',
      'Create a hierarchy that recursively checks each precedent as needed',
      'Raise the step budget and wait',
    ],
    answer: 0,
    why: 'Partitioning precedents is the document agent own responsibility; pushing it to the coordinator overloads the component that should stay thin.',
  },
  {
    id: 'D1-06', domain: 'D1', topic: 'Citation preservation',
    q: 'Document and web sub-agents return findings, but the summarizer strips every source citation. What fixes it?',
    options: [
      'Require all agents to return structured data carrying source metadata',
      'Ask the summarizer to add source links from memory',
      'Increase the context window',
      'Store sources in a separate file and attach it to the report',
    ],
    answer: 0,
    why: 'If the source is part of the response structure, there is nothing to lose during summarization.',
  },
  {
    id: 'D1-07', domain: 'D1', topic: 'Error-handling boundary',
    q: 'A sub-agent receives a 429 from an external API. Where should it be handled?',
    options: [
      'Retry inside the sub-agent and report upward only the result or a final failure with its reason',
      'Fail immediately and surface the error to the user',
      'Pass every error to the orchestrator without retrying',
      'Ignore it and return an empty result',
    ],
    answer: 0,
    why: 'Small retryable errors are absorbed where they happen; what reaches the orchestrator is what changes the plan.',
  },
  {
    id: 'D1-08', domain: 'D1', topic: 'Agent loop termination',
    q: 'How does a well-built agent loop know it is finished?',
    options: [
      'The response comes back with stop_reason end_turn and no tool calls, or the step budget is exhausted',
      'The model says the word done in its text',
      'The loop runs a fixed number of iterations every time',
      'The orchestrator polls the tools until they return empty results',
    ],
    answer: 0,
    why: 'Termination is read from stop_reason, with a step and token budget as the hard stop; parsing the text for a keyword is fragile.',
  },
  {
    id: 'D1-09', domain: 'D1', topic: 'Format normalization',
    q: 'Three tools return order data in vendor-specific shapes and the synthesizer reasons poorly over them. Best approach?',
    options: [
      'Normalize each tool result into one JSON schema right after the call returns',
      'Add few-shot examples for parsing each shape to the system prompt',
      'Introduce another agent that translates between formats',
      'Describe the desired fields in the system prompt and ask the model to reformat',
    ],
    answer: 0,
    why: 'A deterministic transformation belongs in code; normalizing at the tool boundary beats any number of examples.',
  },
  {
    id: 'D1-10', domain: 'D1', topic: 'When not to use agents',
    q: 'A workflow has five steps that are known in advance and never change. What should you build?',
    options: [
      'A pipeline in code that calls the model on the individual steps',
      'An agent that plans the steps each run',
      'A multi-agent system with one agent per step',
      'A single prompt that describes all five steps',
    ],
    answer: 0,
    why: 'Known steps belong in code: reproducible, testable and no tokens spent on re-planning what you already know.',
  },
  {
    id: 'D1-11', domain: 'D1', topic: 'Sub-agent context isolation',
    q: 'Why give a research sub-agent its own context window instead of doing the reading in the main session?',
    options: [
      'It reads a large volume and returns a summary, so the main context stays usable',
      'It makes the model answer faster',
      'It guarantees the sub-agent sees the main conversation',
      'It removes the need for a step budget',
    ],
    answer: 0,
    why: 'Context isolation is the main reason to split work: the heavy reading stays out of the orchestrator window.',
  },
  {
    id: 'D1-12', domain: 'D1', topic: 'Diagnosing aggregate metrics',
    q: 'Overall success rate is 92% but complaints keep arriving. How do you find the problem?',
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
    id: 'D1-13', domain: 'D1', topic: 'Human in the loop',
    q: 'Which step in an autonomous agent flow should require explicit human confirmation?',
    options: [
      'Any irreversible action: sending email, deleting data, payments, publishing',
      'Every tool call, so nothing happens unsupervised',
      'Only calls that previously failed',
      'None, provided the system prompt forbids risky actions',
    ],
    answer: 0,
    why: 'The gate is drawn by reversibility, not by the model confidence or by a prompt instruction that can be talked around.',
  },
  {
    id: 'D1-14', domain: 'D1', topic: 'Sub-agent communication',
    q: 'Two specialist agents need data from each other mid-run. What is the correct design?',
    options: [
      'Route both exchanges through the coordinator, which owns the state',
      'Let them call each other directly to save a hop',
      'Give both agents access to a shared mutable scratch variable',
      'Merge them into one agent with both tool sets',
    ],
    answer: 0,
    why: 'Direct agent-to-agent traffic removes the single place where run state is visible and makes failures hard to diagnose.',
  },

  /* ── D2 · Tool Design & MCP Integration (18%) ──────────── */
  {
    id: 'D2-01', domain: 'D2', topic: 'MCP error reporting',
    q: 'Three MCP tools fail with 400, 404 and 503. How should these be reported back to the model?',
    options: [
      'Return them as tool results marked with isError so the model can react',
      'Raise all three as protocol-level RPC errors',
      'Mark only the 503 as a tool error and swallow the rest',
      'Return empty results and let the model infer that something failed',
    ],
    answer: 0,
    why: 'Tool-level failures belong in the tool result with the error flag: the loop continues and the model can retry or report honestly.',
  },
  {
    id: 'D2-02', domain: 'D2', topic: 'Tool description quality',
    q: 'You added a specialized extract_function tool, but the agent keeps using basic text editing commands instead. Most likely cause?',
    options: [
      'The description does not explain why this tool is safer or more precise than the generic alternative',
      'The tool schema has too many optional fields',
      'The model temperature is too low',
      'The tool was registered after the session started',
    ],
    answer: 0,
    why: 'A minimal description cannot beat the model bias toward familiar generic commands; the description has to state the advantage explicitly.',
  },
  {
    id: 'D2-03', domain: 'D2', topic: 'Tool selection without editing descriptions',
    q: 'Monitoring shows the model calling the wrong tool, and you cannot modify the tool descriptions. What helps most?',
    options: [
      'Add few-shot examples that show the correct choice and explain it',
      'Add a line asking the model to think more carefully',
      'Add a PreToolUse hook that rewrites the call',
      'Set tool_choice to any',
    ],
    answer: 0,
    why: 'When descriptions are fixed, demonstrated choices steer behaviour; a politeness line does not, and forcing a call hides the problem.',
  },
  {
    id: 'D2-04', domain: 'D2', topic: 'Batch API vs regular API',
    q: 'A PR system has a fast blocking check and a slow documentation-compliance review. Where does the Batch API fit?',
    options: [
      'The slow compliance review goes to Batch; the blocking check stays on the regular API',
      'Both go to Batch to halve the cost',
      'Both stay on the regular API for consistency',
      'The blocking check goes to Batch because it runs most often',
    ],
    answer: 0,
    why: 'Batch trades latency for half price, so it suits work nobody is waiting on; anything that blocks a merge needs the synchronous path.',
  },
  {
    id: 'D2-05', domain: 'D2', topic: 'Tool dependency chains',
    q: 'Tool C always calls tool A to resolve an address, even when the caller already has the property id, and A sometimes fails. Best fix?',
    options: [
      'Let tool C accept the property id directly and resolve the address itself when it is missing',
      'Add retries around tool A',
      'Create another address tool as a fallback',
      'Ask the model to call A first and pass the result',
    ],
    answer: 0,
    why: 'Removing the mandatory hop removes both the latency and the failure mode; retries only soften a dependency that should not be there.',
  },
  {
    id: 'D2-06', domain: 'D2', topic: 'Race conditions between tools',
    q: 'get_availability returns slots and book_appointment books one, but 15% of bookings fail because the slot was taken in between. Best design?',
    options: [
      'Combine the two into one atomic operation that selects and books in a single call',
      'Ask the user to retry when booking fails',
      'Have the model call get_availability twice to confirm',
      'Add a longer timeout to book_appointment',
    ],
    answer: 0,
    why: 'The gap between read and write is the bug; closing it atomically removes the race rather than papering over it.',
  },
  {
    id: 'D2-07', domain: 'D2', topic: 'Batch failure recovery',
    q: 'An overnight batch of 10,000 extraction jobs returns 300 failures for exceeding the context length. Preferred recovery?',
    options: [
      'Re-submit only the 300 failures split into chunks and combine the extraction results',
      'Re-submit all 10,000 jobs with a larger max_tokens',
      'Re-submit all 10,000 jobs on a different model',
      'Re-submit the 300 failures unchanged and hope they fit',
    ],
    answer: 0,
    why: 'Only the oversized inputs need work, and the fix for an input that does not fit is splitting it, not retrying it unchanged.',
  },
  {
    id: 'D2-08', domain: 'D2', topic: 'Why MCP',
    q: 'What is the practical advantage of using an existing MCP server over calling the vendor API directly?',
    options: [
      'The tool schemas and their implementations are already written and maintained for you',
      'MCP servers run as compiled binaries, so calls are faster',
      'MCP retries failed calls automatically with no work on your side',
      'MCP removes the need for the model to choose tools',
    ],
    answer: 0,
    why: 'MCP is about who wrote the two halves of each tool — schema and implementation — not about speed or automatic reliability.',
  },
  {
    id: 'D2-09', domain: 'D2', topic: 'MCP context cost',
    q: 'Three MCP servers are connected but rarely used. What is the cost?',
    options: [
      'Their tool definitions occupy the context window on every request',
      'Nothing, until a tool from them is actually called',
      'They add latency to every model response',
      'They override the permissions of local tools',
    ],
    answer: 0,
    why: 'Tool definitions are part of the request, so unused servers quietly shrink the context available for real work.',
  },

  /* ── D3 · Claude Code Configuration & Workflows (20%) ──── */
  {
    id: 'D3-01', domain: 'D3', topic: 'Local vs shared configuration',
    q: 'Three developers say Claude Code works fine for them, but a new joiner reports it does not. Most likely cause?',
    options: [
      'The three shared user-level configuration with each other instead of committing project-level settings to the repository',
      'The new joiner installed an older CLI version',
      'The repository is missing a .gitignore entry',
      'The new joiner has no API key',
    ],
    answer: 0,
    why: 'Team behaviour has to live in project settings that travel with the repository; user-level setup only exists on the machines that have it.',
  },
  {
    id: 'D3-02', domain: 'D3', topic: 'Bulk rename across a codebase',
    q: 'You need to find every usage of load_document across 200+ files before renaming it. Which tool do you reach for first?',
    options: [
      'Grep, to search file contents across the tree',
      'Glob, to list files by name pattern',
      'Read, opening the files one by one',
      'Bash, running an interactive editor',
    ],
    answer: 0,
    why: 'Glob matches paths, Grep matches contents; finding usages is a content search, and reading files one by one burns context for nothing.',
  },
  {
    id: 'D3-03', domain: 'D3', topic: 'Long session consistency',
    q: 'During a long exploration session the agent starts contradicting itself about the code structure. Most effective remedy?',
    options: [
      'Keep a persistent scratchpad file where the agent records source-of-truth findings',
      'Increase the context window size',
      'Ask the agent to re-read every file at each step',
      'Lower the temperature',
    ],
    answer: 0,
    why: 'Findings written to a file survive compaction and context churn; everything held only in the conversation degrades as it grows.',
  },
  {
    id: 'D3-04', domain: 'D3', topic: 'Resuming work days later',
    q: 'You analyzed a module three days ago and now need to explore two options before deciding. How should you proceed?',
    options: [
      'Resume that session and state what changed in the repository since then',
      'Start a fresh session and re-explain the whole module',
      'Resume and assume the agent knows about the commits since then',
      'Start a fresh session for each option and never resume',
    ],
    answer: 0,
    why: 'Resuming keeps the expensive exploration, but the agent has no idea what happened in the repository after the session ended, so you say it.',
  },
  {
    id: 'D3-05', domain: 'D3', topic: 'Coverage analysis on a legacy module',
    q: 'An agent asked to find untested code in a 45-file legacy module reads eight files and starts degrading. Better approach?',
    options: [
      'Spawn sub-agents that each explore a slice and return summaries',
      'Ask it to read all 45 files in one pass',
      'Raise the step budget and let it continue',
      'Switch to a model with a larger context window',
    ],
    answer: 0,
    why: 'The failure is context exhaustion, so the fix is splitting the reading across isolated contexts that return summaries.',
  },
  {
    id: 'D3-06', domain: 'D3', topic: 'Deterministic enforcement',
    q: 'Formatting must run after every file write, without exception. How do you implement it?',
    options: [
      'A PostToolUse hook that runs the formatter',
      'A line in CLAUDE.md asking the agent to format after writing',
      'A skill with a description mentioning formatting',
      'A reminder in the system prompt',
    ],
    answer: 0,
    why: 'Hooks are executed by the harness and always run; instructions are requests the model usually follows, which is not the same as always.',
  },
  {
    id: 'D3-07', domain: 'D3', topic: 'Skill vs CLAUDE.md',
    q: 'A ten-step PR review checklist is needed only when reviewing. Where does it belong?',
    options: [
      'In a skill, whose description names reviewing as the trigger',
      'In CLAUDE.md, so it is always available',
      'In a slash command the reviewer types each time',
      'In the system prompt of every session',
    ],
    answer: 0,
    why: 'CLAUDE.md is loaded into every request; procedure needed occasionally belongs in a skill that loads on demand.',
  },
  {
    id: 'D3-08', domain: 'D3', topic: 'Plan mode',
    q: 'A library migration touches 45 files and there are several valid approaches. How should the session start?',
    options: [
      'In plan mode, so the approach is agreed before any file changes',
      'In accept-edits mode, reviewing the diff afterwards',
      'In bypass mode, to avoid interruptions',
      'With a single prompt describing the desired end state',
    ],
    answer: 0,
    why: 'When several approaches are valid, the decision point comes before the edits, not after; plan mode is exactly that gate.',
  },
  {
    id: 'D3-09', domain: 'D3', topic: 'Subagents and skills',
    q: 'A custom sub-agent must follow the team accessibility skill. What is required?',
    options: [
      'List the skill explicitly in the sub-agent configuration',
      'Nothing — sub-agents inherit all project skills',
      'Move the skill content into CLAUDE.md',
      'Install the skill as a plugin',
    ],
    answer: 0,
    why: 'Sub-agents start with a clean context: built-in ones cannot use skills at all, and custom ones only get what is named for them.',
  },
  {
    id: 'D3-10', domain: 'D3', topic: 'Headless automation',
    q: 'A nightly job must run Claude Code unattended and feed the result into a script. Which setup is right?',
    options: [
      'Headless mode with JSON output, a restricted tool list and a spend cap',
      'An interactive session left running in a terminal',
      'Headless mode with full permissions so nothing blocks',
      'A plan-mode session scheduled by cron',
    ],
    answer: 0,
    why: 'Unattended means nobody can answer a prompt: output must be machine-readable and both tools and budget bounded up front.',
  },

  /* ── D4 · Prompt Engineering & Structured Output (20%) ─── */
  {
    id: 'D4-01', domain: 'D4', topic: 'Schema design for uncertainty',
    q: 'A review-analysis schema has pros, cons and sentiment. The model invents pros and misses sarcasm. Best schema change?',
    options: [
      'Make pros and cons optional and add both neutral and unclear sentiment values',
      'Require at least one pro and one con so the output is always complete',
      'Replace the arrays with free-form text',
      'Add more fields describing tone',
    ],
    answer: 0,
    why: 'A schema with no way to say nothing found forces fabrication; giving the model legal ways to express absence and ambiguity removes the pressure.',
  },
  {
    id: 'D4-02', domain: 'D4', topic: 'Structure vs instruction',
    q: 'The model keeps treating text inside an attached document as instructions. Most reliable fix?',
    options: [
      'Wrap the document in explicit tags and state that tagged content is data, not instructions',
      'Write the instruction in capital letters',
      'Repeat the instruction after the document',
      'Lower the temperature to zero',
    ],
    answer: 0,
    why: 'Explicit boundaries solve the confusion structurally; emphasis and repetition do not survive a determined injection.',
  },
  {
    id: 'D4-03', domain: 'D4', topic: 'Few-shot on ambiguous cases',
    q: 'Classification is correct on clear cases and wrong on ambiguous ones. What helps most?',
    options: [
      'Add few-shot examples that show exactly the ambiguous cases labelled correctly',
      'Add more instructions describing the categories',
      'Raise the effort level',
      'Ask the model to be more careful',
    ],
    answer: 0,
    why: 'Ambiguity is where descriptions run out; labelled borderline examples are the cheapest way to transfer the judgment you want.',
  },
  {
    id: 'D4-04', domain: 'D4', topic: 'Structured output vs parsing',
    q: 'A downstream service parses the model answer with regular expressions and breaks whenever the wording changes. Correct fix?',
    options: [
      'Request structured output against a schema and consume the fields',
      'Pin the model version so the wording stays stable',
      'Add an instruction to always answer in the same format',
      'Post-process the text with a second model call',
    ],
    answer: 0,
    why: 'A schema makes the contract explicit and machine-checked; everything else leaves a text contract that drifts silently.',
  },
  {
    id: 'D4-05', domain: 'D4', topic: 'System vs user content',
    q: 'Which content belongs in the system prompt rather than the user message?',
    options: [
      'The stable role, rules and output conventions that apply to every request',
      'The current question and its attachments',
      'The retrieved documents for this request',
      'The conversation history',
    ],
    answer: 0,
    why: 'Stable content first also keeps the cached prefix intact; per-request material belongs after it.',
  },
  {
    id: 'D4-06', domain: 'D4', topic: 'Negative instructions',
    q: 'Which instruction is more likely to produce the behaviour you want?',
    options: [
      'Answer in one short paragraph',
      'Do not write long answers',
      'Avoid being verbose',
      'Never produce walls of text',
    ],
    answer: 0,
    why: 'A positive instruction gives a target to hit; prohibitions leave the model to guess what acceptable looks like.',
  },
  {
    id: 'D4-07', domain: 'D4', topic: 'Nullable fields',
    q: 'An extraction schema requires an invoice date, but some scanned invoices genuinely have none. What should the schema do?',
    options: [
      'Allow the field to be null and require a reason or confidence alongside it',
      'Keep it required so the output is always complete',
      'Default it to today when missing',
      'Drop the field from the schema',
    ],
    answer: 0,
    why: 'A required field with no legal empty value guarantees invented data; nullability plus a stated reason keeps the record honest.',
  },
  {
    id: 'D4-08', domain: 'D4', topic: 'Prompt iteration',
    q: 'You changed a prompt and the two examples you tried look better. What should happen before shipping?',
    options: [
      'Run the fixed evaluation set and compare the scores before and after',
      'Ship it, since the examples improved',
      'Ask the model whether the new prompt is better',
      'Roll it out to a share of traffic and watch complaints',
    ],
    answer: 0,
    why: 'Two samples cannot separate improvement from variance; a fixed set is what makes the comparison meaningful.',
  },
  {
    id: 'D4-09', domain: 'D4', topic: 'Chain of thought',
    q: 'On multi-step reasoning the model answers too quickly and gets it wrong. First thing to try?',
    options: [
      'Ask it to work through the steps before giving the answer, or raise the effort level',
      'Increase max_tokens',
      'Lower the temperature to zero',
      'Split the request into two separate prompts',
    ],
    answer: 0,
    why: 'The failure is not enough reasoning before the answer, which is exactly what step-by-step prompting and higher effort buy.',
  },
  {
    id: 'D4-10', domain: 'D4', topic: 'Grading criteria',
    q: 'An LLM judge gives nearly every answer a seven out of ten. What is missing?',
    options: [
      'Explicit criteria plus a request for strengths, weaknesses and reasoning behind the score',
      'A larger model for the judge',
      'More test cases',
      'A lower temperature on the judge',
    ],
    answer: 0,
    why: 'Without stated criteria a judge regresses to the middle of the scale; asking for justification forces the score to mean something.',
  },

  /* ── D5 · Context Management & Reliability (15%) ───────── */
  {
    id: 'D5-01', domain: 'D5', topic: 'Cost of long conversations',
    q: 'Why does each turn of a long agent conversation cost more than the last?',
    options: [
      'The whole history is resent with every request and billed as input again',
      'The model slows down as the session ages',
      'The provider charges a session fee per turn',
      'Tool definitions are re-registered on each call',
    ],
    answer: 0,
    why: 'There is no server-side memory: context is resent in full on every request, so growth in history is growth in cost.',
  },
  {
    id: 'D5-02', domain: 'D5', topic: 'Prompt caching invalidation',
    q: 'A system prompt includes the current timestamp and cache hit rate is zero. Why?',
    options: [
      'The changing prefix invalidates everything after it on every request',
      'Caching only applies to tool definitions',
      'The prompt is below the minimum cacheable length',
      'Caching must be enabled per model',
    ],
    answer: 0,
    why: 'Caching matches a prefix byte for byte, so anything volatile placed early destroys reuse for everything that follows.',
  },
  {
    id: 'D5-03', domain: 'D5', topic: 'Compaction vs context editing',
    q: 'A long agent run is approaching the context limit while the early tool results are no longer needed. What fits best?',
    options: [
      'Clear the stale tool results and keep a summary of what they established',
      'Start a new session and lose the state',
      'Raise max_tokens',
      'Switch to a model with a smaller context so it compacts sooner',
    ],
    answer: 0,
    why: 'Reliability over long runs comes from pruning what no longer matters while preserving the conclusions it produced.',
  },
  {
    id: 'D5-04', domain: 'D5', topic: 'Retrieval instead of stuffing',
    q: 'A knowledge base grew past what fits in the prompt. What changes?',
    options: [
      'Chunk it and retrieve only the passages relevant to each question',
      'Summarize the whole base once and send the summary every time',
      'Send the base split across several parallel requests',
      'Upgrade to the largest available context window and keep stuffing',
    ],
    answer: 0,
    why: 'Retrieval is what scales past the window; a global summary loses detail and a bigger window only delays the same wall.',
  },
  {
    id: 'D5-05', domain: 'D5', topic: 'Partial results',
    q: 'One of five sources is unavailable during a research run. What should the system do?',
    options: [
      'Return what it gathered and state explicitly which source is missing',
      'Fail the whole run so nobody acts on partial data',
      'Silently continue with four sources',
      'Retry the failing source until it answers',
    ],
    answer: 0,
    why: 'Degrading gracefully keeps the work useful while naming the gap; silence hides it and total failure throws away good results.',
  },
  {
    id: 'D5-06', domain: 'D5', topic: 'Idempotency under retries',
    q: 'A tool call times out after the downstream order was actually created. The agent retries. What prevents a duplicate order?',
    options: [
      'An idempotency key so the repeated call returns the original order',
      'A longer timeout on the tool',
      'An instruction telling the agent not to retry',
      'A confirmation step before every retry',
    ],
    answer: 0,
    why: 'Retries are inevitable in agent loops, so the downstream operation has to be safe to repeat by design.',
  },
  {
    id: 'D5-07', domain: 'D5', topic: 'Observability of agent runs',
    q: 'An agent produced a wrong answer and the logs contain only the final text. What is missing?',
    options: [
      'A trace of the run: each step, tool call, arguments, result and token usage',
      'A longer retention period for the logs',
      'The system prompt used for that request',
      'The model version',
    ],
    answer: 0,
    why: 'Agents fail along a trajectory; without the step-by-step record you cannot see where it turned the wrong way.',
  },
];

export const questionsFor = (domainId) =>
  (domainId ? QUESTIONS.filter((q) => q.domain === domainId) : QUESTIONS);

export const domainTitle = (id) => DOMAINS.find((d) => d.id === id)?.title || id;
