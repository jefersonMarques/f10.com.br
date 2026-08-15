# F10 Operations — Homologation Test Plan

## Objective

Validate the Operations foundation, structured Knowledge Base, import pipeline, search intelligence, grounded support AI agent and native-chat handoff before any public cutover of Help Center or Movidesk.

This plan intentionally keeps the current public Help Center and Movidesk flow unchanged during the validation cycle.

## 1. Database preparation

Run migrations:

```bash
npm run db:migrate
```

Create or refresh the first Super Admin:

```bash
DATABASE_URL="postgres://..." \
BOOTSTRAP_SUPER_ADMIN_EMAIL="admin@f10.com.br" \
BOOTSTRAP_SUPER_ADMIN_NAME="Administrator" \
BOOTSTRAP_SUPER_ADMIN_PASSWORD="use-a-strong-password" \
npm run admin:bootstrap
```

Validate database readiness:

```bash
npm run operations:doctor
```

Expected result: migrations, critical tables and `pg_trgm` must report `[OK]`. When `OPENAI_API_KEY` is configured, the doctor reports the selected model. When `SUPPORT_AI_CHAT_ENABLED=true`, the doctor must also validate OpenAI and a `SUPPORT_RATE_LIMIT_SECRET` with at least 32 characters.

## 2. Application quality gates

Run:

```bash
npm run check
npm run build
```

Type errors are blockers. Existing non-blocking CSS warnings from unrelated public presentation pages can be reviewed separately.

## 3. Application smoke test

After the application is running in homologation:

```bash
npm run operations:smoke
```

The smoke test validates:

- `/app` requires authentication;
- login creates a valid Operations session;
- `/app` loads;
- `/app/help` loads;
- `/app/help/content` loads;
- `/app/help/content/import` loads;
- `/app/help/search` loads;
- `/app/help/insights` loads;
- legacy `/app/help/flows` still loads;
- `/app/team` loads;
- `/app/tasks` loads;
- `/app/tickets` loads;
- `/app/chat` loads;
- `/app/chat/lab` loads;
- `/app/chat/preview` loads;
- discovered detail pages load;
- logout revokes the temporary session.

The smoke test must not submit a laboratory question or call OpenAI.

## 4. Authentication and authorization

### Super Admin

- Sign in with the bootstrap account.
- Confirm all enabled Operations modules are visible.
- Sign out and confirm `/app` redirects back to `/login`.
- Try an invalid password and confirm no authenticated session is created.

### Employee invitation

- Create an `EMPLOYEE` invitation from `/app/team`.
- Open the activation link in a private browser window.
- Define the employee password.
- Confirm the invitation cannot be reused.
- Sign in as the employee.
- Confirm the employee only sees modules allowed by effective permissions.

### Permission boundaries

- Give an employee a restrictive permission override.
- Confirm the corresponding module/action is blocked server-side.
- Remove the override and confirm inherited access returns.
- Confirm an Admin cannot grant a permission or scope greater than their own.
- Confirm a user without `help.edit` cannot import content.
- Confirm a user without `chat.respond` cannot execute the AI lab.
- Confirm users without global `chat.view` do not receive the global AI run history.

## 5. Structured Knowledge Base

Use `/app/help/content`.

- Create a new content item.
- Confirm `Passo 1` is created automatically.
- Edit title, slug, category and public summary.
- Add general AI-only knowledge.
- Edit `Passo 1` and add step-specific AI knowledge.
- Add a text block.
- Add an image block with URL, alt text and AI summary.
- Add a video block with URL and transcript or AI summary.
- Add another step.
- Confirm the last remaining step cannot be removed.
- Confirm an empty step blocks publication.
- Confirm a step containing only media blocks publication when neither step AI knowledge nor media transcript/AI summary exists.
- Publish a valid content item.
- Edit the published content again.
- Confirm the edit returns to draft while the previous publication snapshot remains available.
- Confirm the public and AI sections of the publication snapshot are separated.

Legacy Help Center routes remain available for comparison, but the flow editor is no longer the primary knowledge authoring path.

Do not switch `/ajuda-f10` to database-backed structured content during this test cycle.

## 6. Movidesk/content import pipeline

Use `/app/help/content/import` and the model `/templates/f10-help-import-v1.example.json`.

- Import a valid file with `source=movidesk`.
- Include text, image, video with transcript, video AI summary, notice and link blocks.
- Confirm every imported content item is `draft`.
- Confirm steps and blocks preserve file order.
- Confirm `aiGeneralKnowledge`, `aiKnowledge`, transcript and AI summary are stored in the correct private fields.
- Confirm `import_source` and `import_external_id` are populated.
- Confirm imported content is not present in search before publication.
- Review and publish one imported item, then confirm it enters search and becomes available to the AI agent.
- Re-import the same `source + externalId` and confirm the whole batch is rejected.
- Import a file containing a slug that already exists and confirm the whole batch is rejected.
- Import malformed JSON and confirm no partial content is created.
- Import a structurally invalid item in a multi-item file and confirm no items from that batch are created.
- Confirm files larger than the current 5 MB interface limit are rejected.
- Confirm image/video URLs are referenced and no remote media is silently downloaded during import.

## 7. Support search and telemetry

Use `/app/help/search`.

- Search for terms contained in a published content item.
- Confirm the content appears.
- Open a result and confirm the selection is recorded.
- Search for a phrase with no matching content.
- Confirm the no-result search is recorded instead of silently discarded.
- Confirm drafts do not enter search until publication.
- Publish an edited content item and confirm the search document updates automatically.
- Confirm internal search can use AI-only knowledge.
- Confirm future public search code paths exclude AI-only knowledge.

Use `/app/help/insights`.

- Confirm total searches increase.
- Confirm no-result queries appear under knowledge gaps.
- Confirm repeated equivalent normalized queries aggregate.
- Confirm selected content counts update after opening search results.
- Confirm successful AI answers increase the `respondidas pela IA` counter.
- Confirm unsupported/failed AI attempts increase the human escalation counter.

## 8. Grounded support AI lab

Configure a real test key in `.env`:

```bash
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5-mini
OPENAI_TIMEOUT_MS=25000
```

Use `/app/chat/lab`.

### Supported question

- Publish a content item containing a distinctive procedure.
- Ask a question that clearly matches that procedure.
- Confirm the answer is marked `Respondido pela IA`.
- Confirm at least one source is shown.
- Confirm every shown source links to the corresponding content editor.
- Confirm a `support_ai_runs` row is created with `resolution=answered`.
- Confirm the linked `help_search_events` row has `ai_answered=true` and `escalated=false`.
- Confirm model, provider response ID, input/output tokens and latency are recorded when returned by the provider.

### Unsupported question

- Ask something unrelated to every published content item.
- Confirm OpenAI is not needed when zero sources are retrieved.
- Confirm the result is escalated instead of inventing a procedure.
- Confirm `support_ai_runs.resolution=escalate` and `help_search_events.escalated=true`.

### Weak or ambiguous grounding

- Ask a question for which the retrieved documents are incomplete or conflicting.
- Confirm the agent can return `resolved=false`.
- Confirm a model response without a valid cited source index is forced to escalation by the application.

### Provider failure

- Temporarily remove or invalidate `OPENAI_API_KEY` in a non-production test environment.
- Ask a question that does retrieve sources.
- Confirm the user receives a human-escalation response rather than an unhandled error.
- Confirm the run records `resolution=failed` and a technical failure code.

### Draft isolation

- Edit a published procedure without republishing it.
- Ask the agent about the changed detail.
- Confirm the agent still receives only the previous published snapshot.
- Republish and confirm the new detail becomes available.

## 9. Native chat + AI handoff

Keep Movidesk as the production widget during this validation.

For the automated chat test, configure:

```bash
SUPPORT_AI_CHAT_ENABLED=true
SUPPORT_RATE_LIMIT_SECRET=use-a-random-secret-with-at-least-32-characters
```

Use `/app/chat/preview`.

### AI answers a known question

- Start a new preview chat with a question supported by published content.
- Confirm a `web_chat` ticket is created.
- Confirm the first customer message is persisted.
- Confirm the AI reply appears as a system/AI message.
- Confirm the session remains `active`.
- Confirm the ticket changes to `waiting_customer` after an AI response.
- Send a follow-up question and confirm recent conversation history can maintain context while factual claims remain grounded in published sources.
- Confirm `support_ai_runs.ticket_id` and `help_search_events.ticket_id` point to the chat ticket.

### Automatic escalation

- Start a new preview chat with an unsupported question.
- Confirm the session changes to `escalated`.
- Confirm the user receives a safe handoff message.
- Confirm the ticket remains/open becomes `open` for the support team.
- Send another customer message and confirm the AI does not resume automatically after escalation.

### Human takeover

- Open the escalated or active conversation under `/app/chat`.
- Reply as an employee.
- Confirm the session changes to `human`.
- Send another customer message from `/app/chat/preview` and confirm no AI response is generated.
- Repeat by assigning a web-chat ticket to an employee from the ticket page and confirm the same `human` state.
- Repeat by sending a public response from the ticket page and confirm the AI remains stopped.

### Race condition

- With an AI request processing, have an employee take over the conversation before the model returns.
- Confirm a late model result is not inserted into the public conversation after human takeover.

### Feature flag

- Set `SUPPORT_AI_CHAT_ENABLED=false` and restart the app.
- Confirm new chats start with AI disabled.
- Confirm a previously active session does not execute the AI on the next customer message and transitions out of automated processing.

Do not install or expose the new widget publicly during this validation.

## 10. Team management

- Invite an employee.
- Reissue an expired/cancelled invitation if applicable.
- Activate the account.
- Change individual permissions.
- Disable the employee.
- Confirm existing employee sessions stop working.
- Reactivate an account that had previously completed activation.
- Confirm an account that never completed activation cannot bypass the activation flow.

## 11. Tasks

- Create a project.
- Add project members.
- Create tasks with each priority.
- Set a due date.
- Assign a task to a project member.
- Move the task through the Kanban statuses.
- Open the task detail.
- Edit title/description/priority/due date.
- Add a comment.
- Confirm activity history records the relevant changes.
- Test `own`, `team` and `all` scopes with different users.

## 12. Tickets

- Create or load a test ticket.
- Change priority.
- Assign an agent.
- Add an internal note.
- Add a public response.
- Change ticket status through the normal lifecycle.
- Confirm ticket events are recorded.
- Convert a ticket into a linked task and confirm the relation is persisted when that bridge is enabled.
- Test ticket visibility using `own`, `team` and `all` scopes.

## 13. Security regression checks

- Confirm `/app/*` pages include noindex directives.
- Confirm public site analytics do not run inside `/app` or `/login`.
- Confirm session cookies are `HttpOnly` and `Secure` under HTTPS.
- Confirm disabled users cannot keep using an old session.
- Confirm Knowledge Base drafts do not replace the last published snapshot.
- Confirm imported content never bypasses draft/review.
- Confirm AI-only knowledge is not present in the `public` portion of publication snapshots.
- Confirm `OPENAI_API_KEY` and `SUPPORT_RATE_LIMIT_SECRET` never appear in HTML or client-side JavaScript.
- Confirm AI runs request provider-side storage disabled by the application adapter.
- Confirm a source containing prompt-like text cannot override the agent's grounding rules.
- Confirm the chat AI feature flag fails closed when OpenAI is unavailable.
- Confirm public chat payload limits reject oversized requests.
- Confirm internal POST endpoints reject invalid origins where origin validation is required.

## 14. Go / no-go criteria

The current homologation cycle is approved only when:

- `npm run operations:doctor` passes;
- `npm run operations:smoke` passes;
- `npm run check` passes without errors;
- `npm run build` passes;
- Super Admin login/logout works;
- employee activation and permission boundaries work;
- structured content draft/publish isolation works;
- import is atomic, deduplicated and always creates drafts;
- search telemetry records successful and no-result searches;
- AI lab answers grounded questions with sources;
- AI lab escalates unsupported questions without inventing procedures;
- native chat AI answers grounded questions and persists ticket links;
- native chat escalates unsupported questions and stops after human takeover;
- AI provider failures fail closed to escalation;
- task scope restrictions work;
- ticket scope restrictions work;
- no public Help Center or Movidesk cutover has occurred unintentionally.

Any failure involving authentication, authorization, publication isolation, import atomicity, grounding, handoff, private AI knowledge exposure, secret exposure or data visibility is a release blocker.
