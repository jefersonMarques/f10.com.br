import test from "node:test";
import assert from "node:assert/strict";
import { selectInboundEmailBody, visibleEmailHtml } from "../src/lib/server/support/emailInboundBody.ts";
import { normalizeEmailBodyText, normalizeEmailMarkdown, splitEmailConversation } from "../src/lib/support/emailBodyText.ts";
import { parseChatMarkdown } from "../src/lib/support/chatMarkdown.ts";

test("rich Brevo email keeps text omitted by extracted Markdown", () => {
  const selected = selectInboundEmailBody({
    markdown: "Mensagem com anexo\n\n**NEGRITO**",
    plain: "Mensagem com anexo\n\nNEGRITO\nITALICO\nCOLORIDO",
    html: "<div>Mensagem com anexo</div><div><b>NEGRITO</b></div><div><i>ITALICO</i></div><div><span style='background:yellow'>COLORIDO</span></div>",
  });
  assert.match(selected.text, /NEGRITO/);
  assert.match(selected.text, /ITALICO/);
  assert.match(selected.text, /COLORIDO/);
  assert.notEqual(selected.source, "markdown");
});

test("complete Markdown remains preferred over equal plain text", () => {
  const selected = selectInboundEmailBody({
    markdown: "Mensagem com anexo\n\n**NEGRITO**",
    plain: "Mensagem com anexo\n\nNEGRITO",
  });
  assert.equal(selected.source, "markdown");
  assert.match(selected.text, /\*\*NEGRITO\*\*/);
});

test("HTML-only messages retain visible text without executing markup", () => {
  const selected = selectInboundEmailBody({
    html: "<head><style>.secret{display:none}</style></head><div>Ol&aacute;, Jo&atilde;o!</div><script>stealSecrets()</script><p><strong>Contrato</strong> <em>assinado</em></p>",
  });
  assert.equal(selected.source, "html");
  assert.match(selected.text, /Olá, João!/);
  assert.match(selected.text, /\*\*Contrato\*\*/);
  assert.match(selected.text, /\*assinado\*/);
  assert.doesNotMatch(selected.text, /stealSecrets|secret|<script/i);
});

test("fallback is used only for empty bodies", () => {
  assert.equal(selectInboundEmailBody({}).source, "fallback");
  assert.equal(selectInboundEmailBody({ plain: "Resposta completa" }).text, "Resposta completa");
});

test("entities and HTML layout are converted to inert visible text", () => {
  const text = visibleEmailHtml("<p>Primeiro</p><p>Segundo &#x2014; terceiro&nbsp;texto</p><img src='https://example.com/pixel'>");
  assert.match(text, /Primeiro\nSegundo — terceiro texto/);
  assert.doesNotMatch(text, /<img|https:\/\/example/);
});

test("HTML complete formatting wins when it covers the text body", () => {
  const selected = selectInboundEmailBody({
    markdown: "Mensagem com anexo\nNEGRITO",
    plain: "Mensagem com anexo\nNEGRITO\nITALICO\nCOLORIDO",
    html: "<p>Mensagem com anexo</p><b>NEGRITO</b><br><i>ITALICO</i><br>COLORIDO",
  });
  assert.equal(selected.source, "html");
  assert.match(selected.text, /\*\*NEGRITO\*\*/);
  assert.match(selected.text, /\*ITALICO\*/);
});

test("escaped HTML in Brevo Markdown is normalized instead of being shown literally", () => {
  const selected = selectInboundEmailBody({
    markdown: "&lt;html&gt;&lt;meta http-equiv=&quot;Content-Type&quot; content=&quot;text/html; charset=UTF-8&quot;&gt;&lt;body&gt;&lt;p&gt;Contrato recebido.&lt;/p&gt;&lt;/body&gt;&lt;/html&gt;",
  });

  assert.match(selected.text, /Contrato recebido/);
  assert.doesNotMatch(selected.text, /&lt;|<html|<meta|Content-Type/i);
});

test("archived HTML and encoded line breaks render as readable text", () => {
  const cleaned = normalizeEmailBodyText("Olá, cliente&lt;br&gt;Ticket atualizado.&lt;br&gt;Obrigado.");
  assert.equal(cleaned, "Olá, cliente\nTicket atualizado.\nObrigado.");
});

test("email addresses inside angle brackets are preserved", () => {
  const visible = visibleEmailHtml("<p>Para: <atendimento@f10.com.br></p>");
  assert.match(visible, /<atendimento@f10\.com\.br>/);
});

test("quoted email thread is folded without deleting the archived messages", () => {
  const body = "Olá, sua solicitação foi concluída.\n\n## - Não escreva abaixo dessa linha - ##\n\n| Nome | Resposta |\n| --- | --- |\n| Rafael | Atendimento anterior |";
  const conversation = splitEmailConversation(body);
  assert.equal(conversation.main, "Olá, sua solicitação foi concluída.");
  assert.match(conversation.quoted, /Rafael/);
  assert.match(conversation.quoted, /Atendimento anterior/);
});

test("old malformed quoted tables are placed in the history section", () => {
  const body = "Solicitação concluída.\n\n| | |\n| --- | --- |\n| Rafael | Mensagem anterior |";
  const conversation = splitEmailConversation(body);
  assert.equal(conversation.main, "Solicitação concluída.");
  assert.match(conversation.quoted, /Rafael/);
});

test("sent and received emails render emphasis with the same safe chat Markdown parser", () => {
  const incoming = String.raw`\\*\\*Importante\\*\\* e \\*urgente\\*

\\- Abra o menu
\\- Confirme o acesso`;
  const outgoing = "**Importante** e *urgente*\n\n- Abra o menu\n- Confirme o acesso";

  for (const message of [incoming, outgoing]) {
    const blocks = parseChatMarkdown(normalizeEmailMarkdown(message));
    assert.deepEqual(blocks.map((block) => block.kind), [
      "paragraph", "space", "bullet", "bullet",
    ]);
    assert.equal(blocks[0]?.tokens?.[0]?.kind, "strong");
    assert.equal(blocks[0]?.tokens?.[2]?.kind, "emphasis");
  }
});

test("Markdown images in email are displayed only as safe text, never as remote loads", () => {
  const parsed = normalizeEmailMarkdown("Imagem: ![Comprovante](https://example.com/remote.png)");
  assert.equal(parsed, "Imagem: Comprovante");
  assert.equal(parseChatMarkdown(parsed)[0]?.tokens?.filter((token) => token.kind === "link").length, 0);

  const escapedImage = String.raw`!\\[Comprovante\\]\\(https://example.com/remote.png\\)`;
  assert.equal(normalizeEmailMarkdown(escapedImage), "Comprovante");
});

test("unsafe links and HTML are not promoted into actionable markup", () => {
  const text = normalizeEmailMarkdown(
    '[Abrir](javascript:alert) <script>alert("x")</script> **Atenção**',
  );
  const tokens = parseChatMarkdown(text)[0]?.tokens ?? [];
  assert.equal(tokens.filter((token) => token.kind === "link").length, 0);
  assert.ok(tokens.some((token) => token.kind === "text" && token.text.includes("<script>")));
  assert.ok(tokens.some((token) => token.kind === "strong" && token.text === "Atenção"));
});
