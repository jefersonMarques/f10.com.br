# F10 Site

Site institucional/marketing do **F10** feito com **SvelteKit + Vite + Tailwind**.

Aqui é simples: página rápida, SEO limpo, e leads caindo no WhatsApp/contato.

---

## O que tem aqui

- Páginas institucionais (home, preço, soluções, sobre, etc.)
- Formulários de captação (WhatsApp/contato/modal)
- Sitemap automático (`/sitemap.xml`)
- Redirecionamentos 301 do site antigo para o novo (para não virar um cemitério de 404)

---

## Stack

- **SvelteKit** `^2.47.3`
- **Svelte** `^5.1.9`
- **Vite** `^6.0.7`
- **TailwindCSS** `^3.4.14`
- **Lucide Svelte** `^0.554.0`
- **Node.js** recomendado: `22.x` (servidor atual usa `22.19.0`)

---

## Scripts

```bash
# desenvolvimento
npm run dev

# dev no WSL com polling (quando o watch dá ruim)
npm run dev:wsl

# build de produção (gera dist/)
npm run build

# preview do build (produção “de mentirinha”, mas útil)
npm run preview

# checagem (types + svelte-check)
npm run check
```

---

## Rotas importantes

- `/` (home)
- `/preco`
- `/contato`
- `/sobre`
- `/politica-de-privacidade`
- `/termos-de-uso`
- `/solucoes`
  - `/solucoes/marketing`
  - `/solucoes/comercial`
  - `/solucoes/financeiro`
  - `/solucoes/pedagogico`
  - `/solucoes/indicadores-e-bi`
  - `/solucoes/aplicativo-smart-aluno`
  - `/solucoes/ambiente-virtual-de-aprendizado-ava`
- `/inovacao-na-escola`
  - `/inovacao-na-escola/marketing-educacional`
- `/sitemap.xml`

---

## Redirecionamentos (site antigo → site novo)

Oh taturana, com cuidado aqui.

Os 301 ficam centralizados em:

- `src/hooks.server.ts`

Objetivo:
- Evitar 404 das URLs antigas
- Transferir relevância/SEO pro caminho novo
- Direcionar usuário para uma página equivalente

### Regra de ouro (pra não dar loop)
Se vai mexer aqui meu maninho vê primeiro se manja do negócio: **não crie redirect para a própria URL**.  
Ex.: `/` → `/` (isso vira loop e o navegador entra em pânico).

### Teste rápido de redirects

```bash
# deve retornar 301 e um Location correto
curl -I http://127.0.0.1:5179/inovacao-digital

# segue a cadeia (o ideal é ser curta: 1 redirect e acabou)
curl -I -L --max-redirs 10 http://127.0.0.1:5179/inovacao-digital
```

---

## Sitemap

Gerado automaticamente em:

- `src/routes/sitemap.xml/+server.ts`

Acesse em produção:

- `https://f10.com.br/sitemap.xml`

---

## PM2 (o que está rodando no servidor)

Atualmente existem dois processos típicos:

### `f10-dev` (dev server)
- Roda `npm run dev` (Vite) no diretório do projeto.
- Útil para testar rápido.
- **Não é o “modo produção ideal”** (é dev server).

### `f10` (produção estática antiga)
- Está servindo um `dist/` (ex.: `/opt/F10/dist`) via `pm2 serve`.

Se você mexer no projeto e “não aparecer no site público”, geralmente é porque o domínio está apontando para o processo/porta do `f10`, não do `f10-dev`.

Cê é DEV memo? então vai lá… mas não faça cagada: confirme no Nginx/Proxy qual porta/domínio está servindo o quê.

---

## Deploy recomendado (sem drama)

### Opção A: estático (geralmente perfeito para site institucional)
1) Build:

```bash
npm run build
```

2) Servir a pasta `dist/` com Nginx (recomendado) ou `pm2 serve`.

### Opção B: SSR (só se você realmente precisar de server-side)
Aí entra adapter-node e um processo `node build`.  
Se você não tem um motivo claro pra SSR, provavelmente **não precisa**.

---

## Core Web Vitals (CWV) — por que isso importa

CWV é um conjunto de métricas do Google que mede experiência real do usuário:
- **LCP**: quando o maior conteúdo visível “aparece de verdade”
- **INP**: o quão rápido o site responde a cliques/toques
- **CLS**: quanto a página “pula” durante o carregamento

Checklist rápido (impacto grande e barato):
- Definir dimensões para imagens e vídeos (reduz CLS)
- Evitar JS pesado no primeiro carregamento (melhora LCP/INP)
- Fontes com `font-display: swap` (evita atraso e layout pulando)

---

## Troubleshooting

### “ERR_TOO_MANY_REDIRECTS”
- Tem redirect apontando para ele mesmo, ou regras brigando no proxy (http↔https / www↔non-www).
- Teste com `curl -I -L` e olhe a sequência de `Location`.

### “O redirect não funciona”
- Confirme que o arquivo é `src/hooks.server.ts` (não é em `src/routes/`).
- Reinicie o processo do servidor.

### “Mudei no repo e não refletiu no site”
- Verifique se o domínio aponta para o build antigo (`pm2 serve` do `/opt/F10/dist`) ou para o serviço do projeto atual.
- Cheque `proxy_pass` / porta no Nginx Proxy Manager/Nginx.

---

## Antes de mexer (aviso sincero e carinhoso)

Meu guri, seguinte: pra mexer aqui direito você precisa ter noção de **produto + performance + rastreio + SEO**.  
Isso aqui **não é WordPress** e não é só chegar jogando código sem pensar no efeito colateral.

Se você não domina pelo menos o básico disso, vai com calma:

- **SEO on-page** (títulos, headings, conteúdo, canonical, sitemap, robots, redirects)
- **Google Search Console** (indexação, cobertura, sitemaps, inspeção de URL)
- **Google Analytics (GA4)** (eventos, conversões, funis)
- **Google Tag Manager (GTM)** (tags sem quebrar o site, versionamento de container)
- **Meta Pixel** (conversões e eventos — sem duplicar disparos)
- **JSON-LD / Schema.org** (Organization, FAQ, SoftwareApplication, Review, etc.)
- **Hotjar / Microsoft Clarity** (mapa de calor, gravações, privacidade)
- **Core Web Vitals (CWV)** (LCP, INP, CLS — performance que vira conversão)
- **Acessibilidade** (labels, contraste, navegação por teclado — ajuda usuário e SEO)
- **Privacidade / LGPD** (cookies/consentimento, anonimização, política de privacidade)
- **Cache/CDN e headers** (evitar conteúdo desatualizado ou rastreio quebrado)
- **SSR/SPA/estático** (entender o que renderiza onde, e o impacto em rastreio/SEO)

Cê é DEV memo? então beleza. Só lembra: mexeu em uma coisinha, pode derrubar **conversão** e **indexação** do site inteiro.  
Oh taturana… cuidado aqui.


## 🔒 Licença (projeto privado)

Este repositório é **privado** e o código é **proprietário**.  
Não é open-source, não é gratuito e **não é para redistribuir**.

- ✅ Você pode usar/modificar **somente** com autorização explícita do dono do projeto.
- ❌ Proibido copiar, publicar, revender, sublicenciar ou reaproveitar em outro produto sem permissão.

Se vai mexer aqui meu maninho, vê primeiro se manja do negócio — e se manjar, beleza… **mas não faça cagada** 😄
