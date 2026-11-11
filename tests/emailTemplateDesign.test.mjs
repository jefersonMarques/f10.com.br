import assert from "node:assert/strict";
import test from "node:test";
import { buildEmailHtml } from "../src/lib/server/email/emailTemplate.ts";

test("all F10 emails use the approved logo, brand and external footer", () => {
  const html = buildEmailHtml({ title: "Recebemos sua solicitação", body: [] });
  const logo = '<img src="https://f10.com.br/logo_f10.png"';

  assert.ok(html.includes(logo));
  assert.match(html, /Software Escolar/);
  assert.match(html, /border-radius:6px/);
  assert.match(html, /Equipe F10/);
  assert.match(html, /https:\/\/f10.com.br"/);
  assert.ok(html.indexOf("https://f10.com.br", html.indexOf("</table>")) >= 0);
  assert.doesNotMatch(html, /Software e atendimento/);
});

test("confirmation ticket shows a prominent protocol and safely quoted original message", () => {
  const html = buildEmailHtml({
    title: "Recebemos sua solicitação",
    greeting: "Olá, Rafael.",
    body: ["Sua mensagem foi recebida."],
    ticket: { number: 43217, subject: "Problema <urgente>", status: "Solicitação recebida" },
    quote: { label: "Mensagem recebida", text: "<script>alert(1)</script>" },
    action: { label: "Acompanhar chamado", href: "https://f10.com.br/cliente/chamados/123" },
  });

  assert.match(html, /#43217/);
  assert.match(html, /Problema &lt;urgente&gt;/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /Acompanhar chamado/);
});

test("five large separate rating links correspond to scores 1 through 5", () => {
  const html = buildEmailHtml({
    title: "Como foi seu atendimento?",
    body: [],
    ratingLinks: [5, 2, 1, 4, 3].map((score) => ({
      score,
      href: `https://f10.com.br/avaliar/token?score=${score}`,
    })),
  });
  const links = [...html.matchAll(/<a href="([^"]+\?score=([1-5]))"[^>]*>(★)<\/a>/g)];

  assert.equal(links.length, 5);
  assert.deepEqual(links.map(([, , score]) => Number(score)), [1, 2, 3, 4, 5]);
  assert.match(html, /font-size:38px/);
  assert.doesNotMatch(html, /"★"\.repeat/);
  assert.doesNotMatch(html, /border:1px solid #E2E5ED/);
});

test("invalid rating maps cannot generate misleading star links", () => {
  const html = buildEmailHtml({
    title: "Avalie",
    body: [],
    ratingLinks: [1, 2, 2, 4, 5].map((score) => ({
      score,
      href: `https://f10.com.br/avaliar/token?score=${score}`,
    })),
  });
  assert.doesNotMatch(html, /Avalie sua experiência/);
});
