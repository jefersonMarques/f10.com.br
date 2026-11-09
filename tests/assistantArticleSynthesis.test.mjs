import assert from "node:assert/strict";
import test from "node:test";
import { composeHelpEvidence } from "../src/lib/support/assistantArticleSynthesis.ts";

test("combines evidence from distinct help articles without losing source references", () => {
  const composed = composeHelpEvidence([
    {
      title: "Converter lead em matrícula",
      fragments: [{
        contentId: "article-lead",
        url: "/ajuda-f10/converter-lead#step-1",
        text: "Localize o lead no módulo Comercial.",
      }],
    },
    {
      title: "Documentos da matrícula",
      fragments: [{
        contentId: "article-docs",
        url: "/ajuda-f10/documentos#step-2",
        text: "Configure os documentos do curso.",
      }],
    },
  ], 4, 2000);

  assert.equal(composed.fragments.length, 2);
  assert.deepEqual(composed.fragments.map((fragment) => fragment.contentId), [
    "article-lead",
    "article-docs",
  ]);
  assert.deepEqual(composed.fragments.map((fragment) => fragment.url), [
    "/ajuda-f10/converter-lead#step-1",
    "/ajuda-f10/documentos#step-2",
  ]);
});

test("limits source count and distributes context budget fairly", () => {
  const articles = ["A", "B", "C"].map((title) => ({
    title,
    fragments: [{ title, text: title.repeat(800) }],
  }));
  const composed = composeHelpEvidence(articles, 2, 800);

  assert.equal(composed.title, "A | B");
  assert.deepEqual(composed.fragments.map((fragment) => fragment.text.length), [400, 400]);
  assert.equal(composed.fragments.some((fragment) => fragment.title === "C"), false);
});

test("handles empty input without invented evidence", () => {
  assert.deepEqual(composeHelpEvidence([], 4, 1000), {
    title: "",
    fragments: [],
  });
});
