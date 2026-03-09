# AI_devs

A collection of Node.js examples built for the [AI_devs](https://aidevs.pl) course. Each task demonstrates a different pattern for working with large language model APIs (OpenAI Responses API or OpenRouter).

## Requirements

- **Node.js 24+** (uses the built-in `process.loadEnvFile` API)
- An **OpenAI API key** (`OPENAI_API_KEY`) **or** an **OpenRouter API key** (`OPENROUTER_API_KEY`)

## Setup

1. Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
OPENAI_API_KEY=sk-...            # OpenAI key
OPENROUTER_API_KEY=sk-or-v1-...  # OpenRouter key (alternative)
AI_PROVIDER=                     # optional: "openai" or "openrouter"
AI_DEVS_KEY=                     # your AI_devs hub API key
```

If both keys are present, OpenAI is used by default. Set `AI_PROVIDER` to override.

## Project structure

```
.
├── config.js               # Shared configuration & provider selection
├── utils/
│   └── submit-task.js      # Helper for submitting answers to the AI_devs hub
├── 01_01_interaction/      # Multi-turn conversation with the Responses API
│   ├── app.js
│   └── helpers.js
├── 01_01_structured/       # Structured JSON output (person extraction)
│   ├── app.js
│   └── helpers.js
└── tasks/
    └── people/             # AI_devs "people" task (filter & tag candidates)
        ├── app.js
        ├── filter-candidates.js
        ├── helpers.js
        └── tag-people-by-job.js
```

## Running an example

```bash
node 01_01_interaction/app.js
node 01_01_structured/app.js
node tasks/people/app.js
```

## Dependencies

| Package | Purpose |
|---|---|
| `openai` | OpenAI SDK (types & helpers) |
| `@openrouter/sdk` | OpenRouter SDK |
| `axios` | HTTP client |
| `csv-parser` | CSV file parsing |
| `dotenv` | `.env` file loading (fallback for Node < 24) |
