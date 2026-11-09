import test from "node:test";
import assert from "node:assert/strict";
import { buildAssistantHelpSuggestions, buildRelatedHelpSuggestions } from "../src/lib/support/assistantHelpFallback.ts";

test("shows published article links instead of asking the same question", () => {
  const reply = buildAssistantHelpSuggestions([
    { slug: "matricula-de-alunos", title: "Como matricular alunos" },
    { slug: "rematricula", title: "Rematrícula de alunos" },
  ]);

  assert.match(reply, /\[Como matricular alunos\]\(\/ajuda-f10\/matricula-de-alunos\)/);
  assert.match(reply, /\[Rematrícula de alunos\]\(\/ajuda-f10\/rematricula\)/);
  assert.doesNotMatch(reply, /Qual opção|Você quer saber/);
});

test("shows safe help center fallback when no published result is available", () => {
  const reply = buildAssistantHelpSuggestions([]);
  assert.match(reply, /\/ajuda-f10/);
  assert.match(reply, /atendimento humano/);
});

test("renders only the first three suggestions with encoded slugs", () => {
  const reply = buildAssistantHelpSuggestions([
    { slug: "matrícula de aluno", title: "Matrícula" },
    { slug: "alunos", title: "Alunos" },
    { slug: "portal", title: "Portal" },
    { slug: "extra", title: "Extra" },
  ]);

  assert.match(reply, /matr%C3%ADcula%20de%20aluno/);
  assert.doesNotMatch(reply, /Extra/);
});

test("related published articles do not claim to be a complete procedure", () => {
  const reply = buildRelatedHelpSuggestions([
    { slug: "interface-de-matricula", title: "Interface de matrícula" },
    { slug: "converter-lead-em-matricula", title: "Converter lead em contrato de matrícula" },
  ]);

  assert.match(reply, /Encontrei documentação relacionada/);
  assert.match(reply, /não consegui confirmar o procedimento completo/);
  assert.match(reply, /\[Interface de matrícula\]\(\/ajuda-f10\/interface-de-matricula\)/);
  assert.match(reply, /\[Converter lead em contrato de matrícula\]\(\/ajuda-f10\/converter-lead-em-matricula\)/);
  assert.doesNotMatch(reply, /Não encontrei um procedimento publicado/);
});
