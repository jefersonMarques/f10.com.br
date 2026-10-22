import { createECDH } from "node:crypto";
import { readFile, writeFile, chmod } from "node:fs/promises";
import { resolve } from "node:path";

// One-time setup on the production host. Never logs or commits private keys.
// Run: node scripts/enable-device-push.mjs
const envPath = resolve(process.env.F10_PUSH_ENV_PATH || ".env.production");
let config;
try { config = await readFile(envPath, "utf8"); }
catch { throw new Error(".env.production nao encontrado. Execute na pasta da aplicacao."); }

if (/^F10_PUSH_VAPID_PRIVATE_KEY=\S+/m.test(config)) {
  console.log("Chave VAPID ja configurada. Nenhuma alteracao realizada.");
  process.exit(0);
}
if (/^F10_PUSH_VAPID_PUBLIC_KEY=/m.test(config) ||
    /^F10_PUSH_VAPID_PRIVATE_KEY=/m.test(config)) {
  throw new Error("Variaveis de push incompletas. Revise o arquivo manualmente.");
}

const ecdh = createECDH("prime256v1");
ecdh.generateKeys();
const keys = [
  ["F10_PUSH_VAPID_PRIVATE_KEY", ecdh.getPrivateKey().toString("base64url")],
  ["F10_PUSH_VAPID_PUBLIC_KEY", ecdh.getPublicKey(undefined, "uncompressed").toString("base64url")],
  ["F10_PUSH_CONTACT_EMAIL", "suporte@f10.com.br"],
];
config = config.trimEnd() + "\n" + keys.map(([k,v])=>k+"="+v).join("\n") + "\n";
await writeFile(envPath, config, { mode: 0o600 });
await chmod(envPath, 0o600);
console.log("Chaves Web Push configuradas com permissoes restritas (600).");
console.log("Reinicie a aplicacao com npm run prod, depois ative os avisos no dispositivo.");
