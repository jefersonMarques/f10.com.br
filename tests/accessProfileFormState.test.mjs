import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pagePath = "src/routes/app/settings/access-profiles/+page.svelte";
const repositoryPath = "src/lib/server/users/accessProfileRepository.ts";
const routePath = "src/routes/app/settings/access-profiles/+page.server.ts";

test("the complete access profile editor is recreated when the selected profile changes", () => {
  const source = readFileSync(pagePath, "utf8");
  const selectedProfileStart = source.indexOf("{#if selectedProfile}");
  const editorStart = source.indexOf("{#key selectedProfile}", selectedProfileStart);
  const editorEnd = source.indexOf("{/key}", editorStart);

  assert.ok(selectedProfileStart >= 0);
  assert.ok(editorStart > selectedProfileStart);
  assert.ok(editorEnd > editorStart);

  const editor = source.slice(editorStart, editorEnd);
  assert.match(editor, /action="\?\/update"/);
  assert.match(editor, /name="profileId" value=\{selectedProfile\.id\}/);
  assert.match(editor, /name="restrictTicketAreas" type="checkbox" checked=\{selectedProfile\.restrictTicketAreas\}/);
  assert.match(editor, /name="ticketAreaId" type="checkbox" value=\{area\.id\} checked=\{selectedProfile\.ticketAreaIds\.includes\(area\.id\)\}/);
  assert.match(editor, /name="permissionCode" type="checkbox" value=\{permission\.code\} checked=\{hasGrant\(permission\.code\)\}/);
  assert.match(editor, /value=\{grantScope\(permission\.code\)\}/);
});

test("permission grants are loaded and saved under each profile identifier", () => {
  const repository = readFileSync(repositoryPath, "utf8");
  const route = readFileSync(routePath, "utf8");

  assert.match(repository, /grants: grantsByRole\.get\(profile\.id\) \?\? \[\]/);
  assert.match(repository, /ticketAreaIds: areasByRole\.get\(profile\.id\) \?\? \[\]/);
  assert.match(repository, /await tx\.delete\(rolePermissions\)\.where\(eq\(rolePermissions\.roleId, profileId\)\)/);
  assert.match(route, /await updateAccessProfile\(session\.user\.id, profileId/);
});
