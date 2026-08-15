# F10 Operations — Homologation Test Plan

## Objective

Validate the Operations foundation and the new structured Knowledge Base before any public cutover of Help Center or native chat.

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
DATABASE_URL="postgres://..." npm run operations:doctor
```

Expected result: every line must report `[OK]`, including migrations, critical tables and `pg_trgm`, and the process must exit with status `0`.

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
OPERATIONS_BASE_URL="https://homolog.example.com" \
OPERATIONS_SMOKE_EMAIL="admin@f10.com.br" \
OPERATIONS_SMOKE_PASSWORD="..." \
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
- discovered detail pages load;
- logout revokes the temporary session.

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
- Confirm future public search code paths must exclude AI-only knowledge.

Use `/app/help/insights`.

- Confirm total searches increase.
- Confirm no-result queries appear under knowledge gaps.
- Confirm repeated equivalent normalized queries aggregate.
- Confirm selected content counts update after opening search results.

## 7. Team management

- Invite an employee.
- Reissue an expired/cancelled invitation if applicable.
- Activate the account.
- Change individual permissions.
- Disable the employee.
- Confirm existing employee sessions stop working.
- Reactivate an account that had previously completed activation.
- Confirm an account that never completed activation cannot bypass the activation flow.

## 8. Tasks

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

## 9. Tickets

- Create or load a test ticket.
- Change priority.
- Assign an agent.
- Add an internal note.
- Add a public response.
- Change ticket status through the normal lifecycle.
- Confirm ticket events are recorded.
- Convert a ticket into a linked task and confirm the relation is persisted when that bridge is enabled.
- Test ticket visibility using `own`, `team` and `all` scopes.

## 10. Native chat

Keep Movidesk as the production widget during this validation.

- Confirm existing internal chat routes remain functional.
- Do not expose the native widget publicly yet.
- The next chat milestone must introduce the AI support agent and `/app/chat/lab` before public cutover.
- The agent must retrieve only published Knowledge Base snapshots.
- When the agent cannot support an answer from the base, it must not invent an F10 procedure and must be able to escalate with conversation/retrieval context.

## 11. Security regression checks

- Confirm `/app/*` pages include noindex directives.
- Confirm public site analytics do not run inside `/app` or `/login`.
- Confirm session cookies are `HttpOnly` and `Secure` under HTTPS.
- Confirm disabled users cannot keep using an old session.
- Confirm Knowledge Base drafts do not replace the last published snapshot.
- Confirm AI-only knowledge is not present in the `public` portion of publication snapshots.
- Confirm public chat payload limits reject oversized requests.
- Confirm internal POST endpoints reject invalid origins where origin validation is required.

## 12. Go / no-go criteria

The current homologation cycle is approved only when:

- `npm run operations:doctor` passes;
- `npm run operations:smoke` passes;
- `npm run check` passes without errors;
- `npm run build` passes;
- Super Admin login/logout works;
- employee activation and permission boundaries work;
- structured content draft/publish isolation works;
- search telemetry records successful and no-result searches;
- task scope restrictions work;
- ticket scope restrictions work;
- no public Help Center or Movidesk cutover has occurred unintentionally.

Any failure involving authentication, authorization, publication isolation, private AI knowledge exposure or data visibility is a release blocker.
