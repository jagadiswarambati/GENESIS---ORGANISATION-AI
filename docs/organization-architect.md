# Organization Architect API

The Organization Architect is Genesis's first AI-backed capability. The browser
only communicates with the FastAPI endpoint; the backend is the sole holder of
the configured provider credential.

```text
Frontend → POST /api/v1/architect → OrganizationArchitectService
         → OpenAI Responses API or Gemini API → Pydantic validation → structured JSON
```

`POST /api/v1/architect` accepts a mission and returns a typed organization
blueprint. The active provider is selected with `GENESIS_AI_PROVIDER`. OpenAI uses
`GENESIS_OPENAI_MODEL` (default `gpt-5.6`) and `OPENAI_API_KEY`; Gemini uses
`GENESIS_GEMINI_MODEL` (default `gemini-2.5-flash`) and `GEMINI_API_KEY`. Provider
credentials are read only by the backend process.

The API uses strict JSON Schema output and validates the returned text again
with Pydantic before responding. Known provider, timeout, rate-limit,
configuration, and malformed-output failures become typed error payloads.

The frontend adapts the API blueprint into the existing Organization Brief
presentation contract. This intentionally separates API evolution from UI
composition.
