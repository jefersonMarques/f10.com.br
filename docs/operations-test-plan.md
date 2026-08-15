# F10 Operations — Homologation Test Plan

## Objective

Validate the Operations foundation before any public cutover of Help Center or native chat.

This plan intentionally keeps the current public Help Center and Movidesk flow unchanged during the first validation cycle.

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

Expected result: every line must report `[OK]` and the process must exit with status `0`.

## 2. Application smoke test

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
- `/app/help/flows` loads;
- `/app/team` loads;
- `/app/tasks` loads;
- `/app/tickets` loads;
- `/app/chat` loads;
- logout revokes the temporary session.

## 3. Authentication and authorization

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

## 4. Help Center administration

- Import the current Help Center structure.
- Confirm question, destination and training counts are populated.
- Create a draft article.
- Edit the draft.
- Publish it.
- Edit the published article again.
- Confirm the edit returns to draft while the previous publication remains available in the publication snapshot.
- Create a help question with options.
- Try to create a cycle between questions and confirm the server rejects it.
- Publish a valid question flow.

Do not switch `/ajuda-f10` to database-backed content during this test cycle.

## 5. Team management

- Invite an employee.
- Reissue an expired/cancelled invitation if applicable.
- Activate the account.
- Change individual permissions.
- Disable the employee.
- Confirm existing employee sessions stop working.
- Reactivate an account that had previously completed activation.
- Confirm an account that never completed activation cannot bypass the activation flow.

## 6. Tasks

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

## 7. Tickets

- Create or load a test ticket.
- Change priority.
- Assign an agent.
- Add an internal note.
- Add a public response.
- Change ticket status through the normal lifecycle.
- Confirm ticket events are recorded.
- Convert a ticket into a linked task and confirm the relation is persisted.
- Test ticket visibility using `own`, `team` and `all` scopes.

## 8. Native chat preview

Keep Movidesk as the production widget during this validation.

- Start a native web chat in the preview flow.
- Confirm a `web_chat` ticket is created.
- Confirm the conversation appears in `/app/chat`.
- Reply from the Operations interface.
- Confirm the public session receives the reply.
- Send multiple customer messages and confirm rate limiting does not affect normal use.
- Confirm an invalid/expired chat token cannot read or write messages.

## 9. Security regression checks

- Confirm `/app/*` pages include noindex directives.
- Confirm public site analytics do not run inside `/app` or `/login`.
- Confirm session cookies are `HttpOnly` and `Secure` under HTTPS.
- Confirm disabled users cannot keep using an old session.
- Confirm Help Center drafts do not replace the last published snapshot.
- Confirm public chat payload limits reject oversized requests.
- Confirm public chat context URLs cannot inject arbitrary external origins.
- Confirm internal POST endpoints reject invalid origins where origin validation is required.

## 10. Go / no-go criteria

The first homologation cycle is approved only when:

- `npm run operations:doctor` passes;
- `npm run operations:smoke` passes;
- Super Admin login/logout works;
- employee activation and permission boundaries work;
- Help Center draft/publish isolation works;
- task scope restrictions work;
- ticket scope restrictions work;
- native chat works end to end in preview;
- no public cutover has occurred unintentionally.

Any failure involving authentication, authorization, publication isolation or data visibility is a release blocker.
