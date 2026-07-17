# Genesis Backend

The FastAPI service for Genesis organization design and execution capabilities.

## Execution provider configuration

- `GENESIS_AI_PROVIDER=mock` selects the local deterministic execution provider.
- `GENESIS_AI_PROVIDER=openai` selects the OpenAI Responses API provider.
- `GENESIS_AI_PROVIDER=gemini` selects the Google Gemini API provider.
- `OPENAI_API_KEY` is required only for the OpenAI provider.
- `GENESIS_OPENAI_MODEL` defaults to `gpt-5.6` and selects the Responses API model.
- `GEMINI_API_KEY` is required only for the Gemini provider.
- `GENESIS_GEMINI_MODEL` defaults to `gemini-3.5-flash`.
