# AI Devs

## Running tasks with OpenRouter

To use OpenRouter instead of OpenAI, set the following environment variables in your `.env` file:

```
OPENROUTER_API_KEY=sk-or-v1-...
AI_PROVIDER=openrouter
```

You can get an OpenRouter API key at https://openrouter.ai/keys.

### Example: tasks/people

```sh
node tasks/people/app.js
```

When `AI_PROVIDER=openrouter`, the task automatically:
- Routes requests to `https://openrouter.ai/api/v1/chat/completions`
- Uses the Chat Completions request/response format
- Prefixes OpenAI model names (e.g. `gpt-4o-mini` → `openai/gpt-4o-mini`)

If `AI_PROVIDER` is not set, the provider is chosen automatically: OpenAI is used when `OPENAI_API_KEY` is present, otherwise OpenRouter is used.
