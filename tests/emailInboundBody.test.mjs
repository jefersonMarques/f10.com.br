import test from "node:test";
import assert from "node:assert/strict";
import { selectInboundEmailBody, visibleEmailHtml } from "../src/lib/server/support/emailInboundBody.ts";

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
