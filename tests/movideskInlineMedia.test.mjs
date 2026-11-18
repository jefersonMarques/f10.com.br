import assert from "node:assert/strict";
import test from "node:test";
import {
  htmlContentImages,
  htmlContentLinks,
  inlineSourceLinks,
  rewriteStoredLinks,
  isImageAttachment,
} from "../scripts/lib/movideskInlineMedia.mjs";

const firstHash = "B5A0387ABD6E8BE28B251B9B0538930F";
const secondHash = "5ADBF0718FCD9AD2B501216E0A43A2A7";
const link = "https://s3.amazonaws.com/movidesk-files/" + firstHash +
  "?AWSAccessKeyId=example&Expires=1&Signature=redacted";

test("extracts signed Movidesk links and their original filenames", () => {
  const body = "Anexos:\nWhatsApp Image 2026-10-06 at 16.48.20.jpeg (303 KB) - " + link;
  const sources = inlineSourceLinks(body);
  assert.equal(sources.length, 1);
  assert.equal(sources[0].hash, firstHash);
  assert.equal(sources[0].name, "WhatsApp Image 2026-10-06 at 16.48.20.jpeg");
});

test("replaces only recovered Movidesk URLs and discards expired signatures", () => {
  const body = "Image - " + link + "\nOther https://example.com/doc";
  const map = new Map([[firstHash, { id: "11111111-1111-4111-8111-111111111111" }]]);
  const result = rewriteStoredLinks(body, map, "22222222-2222-4222-8222-222222222222");
  assert.equal(result.replaced, 1);
  assert.ok(!result.body.includes("AWSAccessKeyId"));
  assert.match(result.body, /\[Abrir arquivo\]\(\/api\/app\/tickets\/22222222-2222-4222-8222-222222222222\/attachments\/11111111-1111-4111-8111-111111111111\)/);
  assert.match(result.body, /https:\/\/example\.com\/doc/);
  assert.equal(rewriteStoredLinks(body, new Map(), "x").body, body);
});

test("ignores photo avatars but finds embedded images in HTML", () => {
  const html = '<img class="picture" src="https://s3.amazonaws.com/movidesk-files/' +
    firstHash + '?X=1"><p><img src="https://s3.amazonaws.com/movidesk-files/' +
    secondHash + '?Y=1" alt="exemplo.png"></p>';
  const images = htmlContentImages(html);
  assert.deepEqual(images, [{ hash: secondHash, name: "exemplo.png" }]);
  assert.equal(isImageAttachment({ mimeType: "image/jpeg" }), true);
  assert.equal(isImageAttachment({ mimeType: "application/pdf" }), false);
});

test("discovers HTML-only anchored media without exposing signed URLs", () => {
  const html = '<p><a href="' + link + '" title="relatorio.pdf">Abrir</a></p>';
  assert.deepEqual(htmlContentLinks(html), [{ hash: firstHash, name: "relatorio.pdf" }]);
});

test("does not treat untrusted URLs as Movidesk files", () => {
  assert.equal(inlineSourceLinks("https://example.net/movidesk-files/" + firstHash).length, 0);
  assert.equal(inlineSourceLinks("http://s3.amazonaws.com/movidesk-files/" + firstHash).length, 0);
});
