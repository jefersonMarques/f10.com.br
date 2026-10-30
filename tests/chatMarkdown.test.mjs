import test from "node:test";
import assert from "node:assert/strict";
import {
  parseChatMarkdown,
  safeChatHref,
  tokenizeChatMarkdown,
} from "../src/lib/support/chatMarkdown.ts";

test("customer chat formats numbered support instructions", () => {
  const blocks = parseChatMarkdown(
    "Passo a passo:\n\n1. Vá em \x60Secretaria\x60 e abra \x60Pauta de Chamada\x60.\n" +
    "2. Veja https://f10.com.br/ajuda-f10/pauta-de-chamada.",
  );

  assert.equal(blocks[0]?.kind, "paragraph");
  assert.equal(blocks[2]?.kind, "ordered");
  assert.equal(blocks[2]?.marker, "1.");
  assert.equal(blocks[3]?.marker, "2.");
  assert.deepEqual(
    blocks[2]?.tokens?.filter((token) => token.kind === "code").map((token) => token.text),
    ["Secretaria", "Pauta de Chamada"],
  );
  assert.equal(blocks[3]?.tokens?.find((token) => token.kind === "link")?.href,
    "https://f10.com.br/ajuda-f10/pauta-de-chamada");
});

test("chat supports headings, emphasis, fenced code and quote blocks", () => {
  const blocks = parseChatMarkdown(
    "# Instruções\n**Importante** e *urgente*\n> Aviso\n\x60\x60\x60\nconst valid = true;\n\x60\x60\x60",
  );

  assert.deepEqual(blocks.map((block) => block.kind), [
    "heading", "paragraph", "quote", "code",
  ]);
  assert.equal(blocks[0]?.level, 1);
  assert.equal(blocks[1]?.tokens?.[0]?.kind, "strong");
  assert.equal(blocks[1]?.tokens?.[2]?.kind, "emphasis");
  assert.equal(blocks[3]?.code, "const valid = true;");
});

test("chat links use only safe protocols and do not execute HTML", () => {
  assert.equal(safeChatHref("javascript:alert(1)"), null);
  assert.equal(safeChatHref("//untrusted.example"), null);
  assert.equal(safeChatHref("data:text/html,hello"), null);
  assert.equal(safeChatHref("https://user:password@example.com"), null);
  assert.equal(safeChatHref("https://example.com/" + "a".repeat(2050)), null);
  assert.equal(safeChatHref("/ajuda-f10/guia"), "/ajuda-f10/guia");

  const tokens = tokenizeChatMarkdown(
    '[site](javascript:alert) <script>alert("x")</script> [Ajuda](/ajuda-f10)',
  );
  assert.equal(tokens.filter((token) => token.kind === "link").length, 1);
  assert.equal(tokens.find((token) => token.kind === "link")?.href, "/ajuda-f10");
  assert.ok(tokens.some((token) => token.kind === "text" && token.text.includes("<script>")));
  assert.equal(
    tokenizeChatMarkdown("Veja /ajuda-f10/pauta-de-chamada#help-block-1.").find((token) => token.kind === "link")?.href,
    "/ajuda-f10/pauta-de-chamada#help-block-1",
  );
});

test("URLs do not absorb trailing punctuation", () => {
  const tokens = tokenizeChatMarkdown(
    "Confira (https://f10.com.br/ajuda-f10/guia), depois continue.",
  );
  const url = tokens.find((token) => token.kind === "link");
  assert.equal(url?.href, "https://f10.com.br/ajuda-f10/guia");
  assert.ok(tokens.some((token) => token.kind === "text" && token.text.includes("),")));
});
