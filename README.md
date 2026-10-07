# Form-AI

Form-AI is a simple, responsive web form foundation for collecting business decisions before implementing a system.

> **Status:** project in evolution. The current version is a functional MVP used in a real case. Its architecture, interface, and features may change as new tests and needs are identified.

This project was created during the planning of a mini market POS. The client receives a link, answers from a phone, and the responses are stored in a private database. The project owner receives a summarized Telegram notification.

The goal is to turn discovery questions into organized decisions without requiring Google Forms, Notion Forms, or an account for the person answering.

## Demo

Public POS decision form:

<https://mini-mercado-decisions.mynder.workers.dev>

The same Worker can be adapted for other forms and projects.

## Current features

- responsive layout for mobile and desktop;
- required respondent identification;
- multiple-choice questions;
- **Other answer** option for each question;
- follow-up field associated with each question;
- general notes field;
- basic validation before submission;
- visual confirmation after submission;
- private response storage in Cloudflare D1;
- summarized Telegram notification;
- response preservation when notification delivery fails;
- health endpoint for operational checks;
- disabled page caching to prevent stale forms.

## How it works

```text
Person answers the form in a browser
          |
          v
Cloudflare Worker validates and receives the JSON
          |
          +--> Cloudflare D1 stores the response
          |
          +--> Telegram sends a summarized notification
```

The public form does not expose previous responses or the rest of the project's workspace. Responses remain in the D1 database associated with the Worker.

## Architecture

- **HTML, CSS, and JavaScript:** form interface;
- **Cloudflare Worker:** serves the page, validates submissions, and coordinates integrations;
- **Cloudflare D1:** response storage;
- **Telegram Bot API:** optional notification for the project owner.

This version has no frontend framework. The form is small enough to run with native HTML, CSS, and JavaScript, reducing dependencies and maintenance.

## Repository structure

```text
form-ai/
├── migrations/
│   └── 0001_responses.sql
├── src/
│   └── index.js
├── .gitignore
├── README.md
└── wrangler.toml
```

## Data model

Responses are stored in the `responses` table:

| Field | Description |
| --- | --- |
| `id` | Internal identifier |
| `created_at` | Submission date and time in UTC |
| `payload` | Responses as JSON |
| `user_agent` | Browser used for the submission |

The JSON contains the respondent's name, each answer, custom follow-ups, and general notes.

```json
{
  "client_name": "Client name",
  "discounts": "Other answer",
  "discounts_details": "Discounts only above a defined purchase amount",
  "offline": "Yes",
  "notes": "General note"
}
```

## Local development

Prerequisites:

- Node.js;
- Wrangler;
- a Cloudflare account when using remote D1.

Start the Worker locally:

```bash
npx wrangler dev
```

Check the syntax before deployment:

```bash
node --check src/index.js
```

The `wrangler.toml` file points to the D1 database used by the remote environment. Do not include tokens or secrets in the repository.

## Database and migrations

```bash
npx wrangler d1 create mini-mercado-decisions
npx wrangler d1 migrations apply mini-mercado-decisions --remote
```

Query remote responses:

```bash
npx wrangler d1 execute mini-mercado-decisions \
  --remote \
  --command="SELECT id, created_at, payload FROM responses ORDER BY id DESC"
```

## Secrets

Telegram notifications use Worker secrets:

```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHAT_ID
```

Values must not be placed in `wrangler.toml`, source code, or commits.

## Deployment

Validate the package without publishing:

```bash
npx wrangler deploy --dry-run
```

Deploy:

```bash
npx wrangler deploy
```

Check the deployed application:

```bash
curl https://mini-mercado-decisions.mynder.workers.dev/health
```

Expected response:

```json
{"ok":true,"service":"mini-mercado-decisions"}
```

## Endpoints

### `GET /`

Serves the public form.

### `POST /api/responses`

Receives the response JSON, validates the respondent name, stores the record in D1, and attempts to send a Telegram notification.

### `GET /health`

Returns the basic Worker health status.

## Privacy and security

- the public form accepts submissions but does not expose previous responses;
- responses are not displayed on the public page;
- tokens are configured as Cloudflare secrets;
- the endpoint rejects invalid JSON and oversized payloads;
- the response is stored before notification delivery is attempted;
- notes may contain personal data and must be treated as private;
- the database must not be exposed directly to the public;
- the form link should be shared only with the intended respondents.

## Current limitations

- no web administration panel;
- responses are queried through D1/Wrangler;
- Telegram is an optional notification channel, not the primary storage;
- submitted responses cannot currently be edited;
- no administrator authentication in the interface;
- the current form is defined in source code;
- no visual form builder;
- no tax, Stone, or WhatsApp integration in this microproject.

## Planned evolution

The following are planned possibilities, not available features in the current version:

1. private response dashboard;
2. CSV export;
3. controlled response editing or correction;
4. form templates;
5. AI-assisted question builder;
6. API or MCP for creating forms through natural language;
7. authentication and permissions for multiple projects.

## Technical decisions

### Why not use an external platform?

The form needed to be simple, public, and quick for the client to answer. A custom implementation avoids creating accounts on multiple platforms, reduces dependencies, and keeps control over response storage and format.

### Why not use a frontend framework?

The current flow is a single page with limited interactions. Native HTML, CSS, and JavaScript meet the goal with a smaller maintenance surface. A framework can be evaluated if the project gains an administration panel, authentication, or multiple form types.

### Why use Cloudflare Workers and D1?

The Worker serves the page and API in the same project, while D1 provides SQL storage close to the application. This keeps the infrastructure small and allows the form to evolve without introducing a traditional server.

## Author

Personal project by **Rafael Lauri**, created to support the planning of the Mini Market System and serve as a foundation for future AI-oriented forms.
