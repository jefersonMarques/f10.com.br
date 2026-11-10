import test from "node:test";
import assert from "node:assert/strict";
import { serializeTicketRichText } from "../src/lib/support/ticketRichTextSerialization.ts";
import { normalizeTicketMessageMarkdown } from "../src/lib/support/ticketMarkdown.ts";
import { parseChatMarkdown } from "../src/lib/support/chatMarkdown.ts";

function createTextNode(text) {
  return { nodeType: 3, textContent: text };
}

function createElement(tag, ...children) {
  return { nodeType: 1, tagName: tag.toUpperCase(), childNodes: children };
}

test("formatted ticket replies serialize bold, italic and code as valid Markdown", () => {
  const editor = createElement("div",
    createElement("div", createTextNode("Testando "), createElement("strong", createTextNode("o teste"))),
    createElement("div", createElement("em", createTextNode("imagem abaixo"))),
    createElement("div", createElement("code", createTextNode("status ok"))),
  );

  const body = serializeTicketRichText(editor);
  assert.equal(body, "Testando **o teste**\n*imagem abaixo*\n`status ok`");

  const blocks = parseChatMarkdown(body);
  assert.equal(blocks[0]?.tokens?.[1]?.kind, "strong");
  assert.equal(blocks[1]?.tokens?.[0]?.kind, "emphasis");
  assert.equal(blocks[2]?.tokens?.[0]?.kind, "code");
});

test("bold spanning multiple paragraphs closes its markers on every line", () => {
  const editor = createElement("div",
    createElement("strong",
      createElement("div", createTextNode("Primeira linha")),
      createElement("div", createTextNode("Segunda linha")),
    ),
  );

  const body = serializeTicketRichText(editor);
  assert.equal(body, "**Primeira linha**\n**Segunda linha**");
  assert.deepEqual(parseChatMarkdown(body).map((block) => block.tokens?.[0]?.kind), ["strong", "strong"]);
});

test("image placement separates surrounding text without adding stray bold markers", () => {
  const editor = createElement("div",
    createTextNode("Texto anterior"),
    createElement("img"),
    createElement("strong", createTextNode("Texto posterior")),
  );

  assert.equal(serializeTicketRichText(editor), "Texto anterior\n\n**Texto posterior**");
});

test("existing malformed multiline bold renders without visible markup", () => {
  const archivedBody = "Testando **o teste\n\n*imagem abaixo\n\n**";
  const repaired = normalizeTicketMessageMarkdown(archivedBody);
  assert.equal(repaired.trim(), "Testando **o teste**\n\n**imagem abaixo**");

  const blocks = parseChatMarkdown(repaired);
  assert.equal(blocks[0]?.tokens?.[1]?.kind, "strong");
  assert.equal(blocks[2]?.tokens?.[0]?.kind, "strong");
  assert.ok(!blocks.some((block) => block.tokens?.some((token) => token.kind === "text" && token.text.includes("**"))));
});

test("legacy formatter leaves fenced code untouched", () => {
  const body = "```\n**A\nB**\n```\n\nTexto **formatado**";
  assert.equal(normalizeTicketMessageMarkdown(body), body);
});

test("chat replies preserve rich formatting and line breaks in the public renderer", () => {
  const editor = createElement("div",
    createElement("div",
      createTextNode("Olá, "),
      createElement("strong", createTextNode("cliente")),
      createTextNode("!"),
    ),
    createElement("div",
      createTextNode("Próximo passo: "),
      createElement("em", createTextNode("acessar painel")),
    ),
  );

  const savedBody = serializeTicketRichText(editor);
  assert.equal(savedBody, "Olá, **cliente**!\nPróximo passo: *acessar painel*");

  const parsed = parseChatMarkdown(savedBody);
  assert.equal(parsed.length, 2);
  assert.ok(parsed[0].tokens.some((token) => token.kind === "strong" && token.text === "cliente"));
  assert.ok(parsed[1].tokens.some((token) => token.kind === "emphasis" && token.text === "acessar painel"));
});
