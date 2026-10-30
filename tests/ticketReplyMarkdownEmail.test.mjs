import test from "node:test";
import assert from "node:assert/strict";
import { buildEmailHtml, renderSafeEmailMarkdown } from "../src/lib/server/email/emailTemplate.ts";

test("ticket email shows formatted text instead of literal Markdown markers", () => {
  const html = buildEmailHtml({
    title: "Teste",
    body: ["**Texto forte** e *itálico* com `código`"],
    markdownBody: true,
  });
  assert.match(html, /<strong>Texto forte<\/strong>/);
  assert.match(html, /<em>itálico<\/em>/);
  assert.match(html, /<code>código<\/code>/);
  assert.doesNotMatch(html, /\*\*Texto forte\*\*/);
});

test("ticket email escapes HTML even inside formatted spans", () => {
  const html = renderSafeEmailMarkdown("**<img src=x onerror=alert(1)>**");
  assert.match(html, /<strong>&lt;img src=x onerror=alert\(1\)&gt;<\/strong>/);
  assert.doesNotMatch(html, /<img/);
});

test("other email templates retain plain text rendering by default", () => {
  const html = buildEmailHtml({ title: "Teste", body: ["**Texto simples**"] });
  assert.match(html, /\*\*Texto simples\*\*/);
  assert.doesNotMatch(html, /<strong>Texto simples<\/strong>/);
});
