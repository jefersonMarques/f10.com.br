import test from "node:test";
import assert from "node:assert/strict";
import { canViewHelpInsights } from "../src/lib/auth/accessPolicies.ts";

test("knowledge insights are restricted to administrators", () => {
  assert.equal(canViewHelpInsights(["SUPER_ADMIN"]), true);
  assert.equal(canViewHelpInsights(["ADMIN"]), true);
  assert.equal(canViewHelpInsights(["EMPLOYEE"]), false);
  assert.equal(canViewHelpInsights(["VIEWER"]), false);
  assert.equal(canViewHelpInsights([]), false);
});

test("additional employee roles do not block an administrator", () => {
  assert.equal(canViewHelpInsights(["EMPLOYEE", "ADMIN"]), true);
});
