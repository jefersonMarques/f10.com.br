# F10 Operations — Homologation Test Plan

## Objective

Validate the Operations foundation, structured Knowledge Base, search intelligence and grounded support AI agent before any public cutover of Help Center or native chat.

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

Expected result: migrations, critical tables and `pg_trgm` must report `[OK]`. When `OPENAI_API_KEY` is configured, the doctor reports the selected model. To make the key mandatory in a specific environment, set `OPERATIONS_DOCTOR_REQUIRE_OPENAI=true`.

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
- `/app/help/search` loads;
- `/app/help/insights` loads;
- legacy `/app/help/flows` still loads;
- `/app/team` loads;
- `/app/tasks` loads;
- `/app/tickets` loads;
- `/app/chat` loads;
- `/app/chat/lab` loads;
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

## 6. Support search and telemetry

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

## 7. Grounded support AI lab

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

## 8. Team management

- Invite an employee.
- Reissue an expired/cancelled invitation if applicable.
- Activate the account.
- Change individual permissions.
- Disable the employee.
- Confirm existing employee sessions stop working.
- Reactivate an account that had previously completed activation.
- Confirm an account that never completed activation cannot bypass the activation flow.

## 9. Tasks

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

## 10. Tickets

- Create or load a test ticket.
- Change priority.
- Assign an agent.
- Add an internal note.
- Add a public response.
- Change ticket status through the normal lifecycle.
- Confirm ticket events are recorded.
- Convert a ticket into a linked task and confirm the relation is persisted when that bridge is enabled.
- Test ticket visibility using `own`, `team` and `all` scopes.

## 11. Native chat

Keep Movidesk as the production widget during this validation.

- Confirm existing internal chat routes remain functional.
- Do not expose the native widget publicly yet.
- Validate the AI agent only through `/app/chat/lab` in this cycle.
- The next public-chat milestone must connect the same grounded agent pipeline to a real web-chat session and create/link a ticket when human handoff is required.

## 12. Security regression checks

- Confirm `/app/*` pages include noindex directives.
- Confirm public site analytics do not run inside `/app` or `/login`.
- Confirm session cookies are `HttpOnly` and `Secure` under HTTPS.
- Confirm disabled users cannot keep using an old session.
- Confirm Knowledge Base drafts do not replace the last published snapshot.
- Confirm AI-only knowledge is not present in the `public` portion of publication snapshots.
- Confirm `OPENAI_API_KEY` never appears in HTML or client-side JavaScript.
- Confirm AI runs request provider-side storage disabled by the application adapter.
- Confirm a source containing prompt-like text cannot override the agent's grounding rules.
- Confirm public chat payload limits reject oversized requests.
- Confirm internal POST endpoints reject invalid origins where origin validation is required.

## 13. Go / no-go criteria

The current homologation cycle is approved only when:

- `npm run operations:doctor` passes;
- `npm run operations:smoke` passes;
- `npm run check` passes without errors;
- `npm run build` passes;
- Super Admin login/logout works;
- employee activation and permission boundaries work;
- structured content draft/publish isolation works;
- search telemetry records successful and no-result searches;
- AI lab answers grounded questions with sources;
- AI lab escalates unsupported questions without inventing procedures;
- AI provider failures fail closed to escalation;
- task scope restrictions work;
- ticket scope restrictions work;
- no public Help Center or Movidesk cutover has occurred unintentionally.

Any failure involving authentication, authorization, publication isolation, grounding, private AI knowledge exposure, secret exposure or data visibility is a release blocker.
