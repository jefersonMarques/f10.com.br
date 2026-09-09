import { execFileSync, spawnSync } from "node:child_process";
import { resolve } from "node:path";

const productionRoot = resolve(
  process.env.F10_PRODUCTION_ROOT?.trim() || "/opt/f10.com.br",
);
const productionBranch =
  process.env.F10_PRODUCTION_BRANCH?.trim() || "agent/service-request-foundation";
const currentRoot = resolve(process.cwd());

function fail(message) {
  process.stderr.write(`\n[FAIL] ${message}\n`);
  process.exit(1);
}

function output(command, args) {
  return execFileSync(command, args, {
    cwd: currentRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }).trim();
}

function run(label, command, args, env = process.env) {
  process.stdout.write(`\n==> ${label}\n`);
  const result = spawnSync(command, args, {
    cwd: currentRoot,
    env,
    stdio: "inherit",
  });
  if (result.error) fail(`${label}: ${result.error.message}`);
  if (result.status !== 0) fail(`${label} retornou código ${result.status ?? "desconhecido"}.`);
}

if (currentRoot !== productionRoot) {
  fail(`Execute em ${productionRoot}. Diretório atual: ${currentRoot}`);
}

const dirtyFiles = output("git", ["status", "--porcelain"]);
if (dirtyFiles) {
  const entries = dirtyFiles.split("\n").filter(Boolean);
  const untracked = entries.filter((entry) => entry.startsWith("?? "));
  const tracked = entries.filter((entry) => !entry.startsWith("?? "));

  if (tracked.length > 0) {
    process.stderr.write("\nAlterações versionadas locais:\n");
    process.stderr.write(`${tracked.join("\n")}\n`);
  }

  if (untracked.length > 0) {
    process.stderr.write("\nArquivos não versionados:\n");
    process.stderr.write(`${untracked.join("\n")}\n`);
    process.stderr.write(
      "\nRevise com: git clean -nd\n" +
      "Se forem resíduos, remova somente os caminhos confirmados com: git clean -fd -- <caminhos>\n",
    );
  }

  fail("O diretório de produção precisa estar limpo antes do deploy.");
}

run("Atualizando referências", "git", ["fetch", "origin", productionBranch]);

const currentBranch = output("git", ["branch", "--show-current"]);
if (currentBranch !== productionBranch) {
  run("Selecionando branch de produção", "git", ["switch", productionBranch]);
}

run("Atualizando código", "git", [
  "pull",
  "--ff-only",
  "origin",
  productionBranch,
]);

const deployedSha = output("git", ["rev-parse", "--short=12", "HEAD"]);
process.stdout.write(`\nCommit: ${deployedSha}\n`);

run("Instalando dependências", "npm", ["ci"]);
run("Validando aplicação", "npm", ["run", "check"]);
run("Gerando build", "npm", ["run", "build"]);
run("Aplicando migrations", "node", [
  "--env-file-if-exists=.env.production",
  "scripts/migrate.mjs",
]);
run("Atualizando PM2", "pm2", [
  "startOrReload",
  "ecosystem.config.cjs",
  "--env",
  "production",
]);
run("Salvando PM2", "pm2", ["save"]);
run("Status", "pm2", ["status"]);

process.stdout.write(`\n[OK] Produção atualizada em ${deployedSha}.\n`);
