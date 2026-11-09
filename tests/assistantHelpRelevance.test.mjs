import assert from "node:assert/strict";
import test from "node:test";
import {
  hasRelevantHelpTitle,
  rankRelevantHelpCandidates,
} from "../src/lib/support/assistantHelpRelevance.ts";

const articles = [
  {
    contentId: "one",
    slug: "whatsapp",
    title: "Configuração e uso do WhatsApp",
    summary: "Integração com CRM e atendimento",
    categoryText: "Vendas e matrícula",
    rank: 1,
    score: 15,
  },
  {
    contentId: "two",
    slug: "dashboard",
    title: "Conferir indicadores dos dashboards do F10",
    summary: "Indicadores de matrículas nos painéis",
    categoryText: "Gestão",
    rank: 2,
    score: 12,
  },
  {
    contentId: "three",
    slug: "documentos-matricula",
    title: "Definir documentos obrigatórios na matrícula",
    summary: "Quais documentos exigir no cadastro de alunos",
    categoryText: "Acadêmico",
    rank: 3,
    score: 4,
  },
  {
    contentId: "four",
    slug: "interface-matricula",
    title: "Apresentação em vídeo: Interface de Matrícula",
    summary: "Visão geral da interface para matrícula de alunos",
    categoryText: "Acadêmico",
    rank: 4,
    score: 3,
  },
];

test("matrícula ranks subject-matching documentation, not unrelated high-score hits", () => {
  const ranked = rankRelevantHelpCandidates(
    "Como faço uma matrícula?",
    "como fazer matriculas",
    articles,
  );

  assert.deepEqual(ranked.map((article) => article.contentId), ["four", "three"]);
  assert.deepEqual(ranked.map((article) => article.rank), [1, 2]);
  assert.equal(hasRelevantHelpTitle("Como faço uma matrícula?", "matricula", articles), true);
});

test("category-only matching does not qualify a document as a procedure", () => {
  const ranked = rankRelevantHelpCandidates(
    "Como faço uma matrícula?",
    "matricula",
    [articles[0]],
  );

  assert.deepEqual(ranked, []);
  assert.equal(hasRelevantHelpTitle("Como faço uma matrícula?", "matricula", [articles[0]]), false);
});

test("summary-only matches are allowed only when there are no title matches", () => {
  const ranked = rankRelevantHelpCandidates(
    "Como faço uma matrícula?",
    "matricula",
    [articles[1]],
  );

  assert.deepEqual(ranked.map((article) => article.slug), ["dashboard"]);
  assert.equal(hasRelevantHelpTitle("Como faço uma matrícula?", "matricula", [articles[1]]), false);
});

test("inflected topics and accents match relevant article titles", () => {
  const ranked = rankRelevantHelpCandidates(
    "Quero matricular um aluno.",
    "matricula alunos",
    articles,
  );

  assert.ok(ranked.some((article) => article.slug === "documentos-matricula"));
  assert.ok(ranked.some((article) => article.slug === "interface-matricula"));
  assert.ok(!ranked.some((article) => article.slug === "whatsapp"));
});

test("use planned search terms when the follow-up has no explicit topic", () => {
  const ranked = rankRelevantHelpCandidates(
    "E como faço isso?",
    "matricula alunos",
    articles,
  );

  assert.ok(ranked.some((article) => article.slug === "interface-matricula"));
  assert.ok(!ranked.some((article) => article.slug === "whatsapp"));
});
