# F10 Website

Site institucional/marketing do **F10**, construído com **SvelteKit + Vite + Tailwind CSS**.

Foco do projeto: **alta performance**, **SEO consistente** e **conversão** (leads via WhatsApp/contato).

---

## Visão geral

Este repositório contém:

- Páginas institucionais (home, preços, soluções, sobre, etc.)
- Componentes e formulários de captação (WhatsApp/contato/modal)
- Sitemap automático (`/sitemap.xml`)
- Redirecionamentos **301** do site antigo para o novo (reduzindo 404 e preservando SEO)

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

# dev no WSL com polling (quando o watch falha)
npm run dev:wsl

# build de produção (gera dist/)
npm run build

# preview local do build
npm run preview

# checagens (types + svelte-check)
npm run check
```

---

## Rotas principais

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

## Redirecionamentos 301 (site antigo → site novo)

Os redirects ficam centralizados em:

- `src/hooks.server.ts`

Objetivos:
- Eliminar 404 de URLs legadas
- Preservar autoridade/SEO (transferência de relevância)
- Direcionar o usuário para páginas equivalentes

### Boas práticas (evitar loops)

- Nunca crie redirect para a própria URL.  
  Ex.: `/` → `/` gera loop e quebra a navegação.
- Atenção a conflitos com proxy (http↔https e www↔non-www).

### Teste rápido de redirects

```bash
# deve retornar 301 + header Location correto
curl -I http://127.0.0.1:5179/inovacao-digital

# segue a cadeia (ideal: 1 redirect e destino final)
curl -I -L --max-redirs 10 http://127.0.0.1:5179/inovacao-digital
```

---

## Sitemap

Gerado automaticamente em:

- `src/routes/sitemap.xml/+server.ts`

Em produção:

- `https://f10.com.br/sitemap.xml`

---

## PM2 (processos no servidor)

Geralmente existem dois processos:

### `f10-dev` (ambiente de desenvolvimento)

- Executa `npm run dev` (Vite) no diretório do projeto.
- Útil para validações rápidas.
- Não é o modo recomendado para produção.

### `f10` (produção estática)

- Serve a pasta `dist/` via `pm2 serve`.

Se você atualizou o código e não refletiu no site público, normalmente o domínio está apontando para o **processo/porta do `f10`**, não do `f10-dev`. Verifique o proxy/Nginx para confirmar.

---

## Deploy recomendado

### Opção A: Estático (recomendado para site institucional)

1) Build:

```bash
npm run build
```

2) Servir `dist/` via **Nginx** (recomendado) ou `pm2 serve`.

### Opção B: SSR (somente se necessário)

Requer `adapter-node` e execução via `node build`.  
Se não houver um motivo claro (personalização server-side, autenticação SSR, etc.), **provavelmente não precisa**.

---

## Performance e Core Web Vitals (CWV)

CWV mede a experiência real do usuário:

- **LCP**: tempo para o maior conteúdo visível carregar
- **INP**: responsividade a interações (cliques/toques)
- **CLS**: estabilidade visual (evitar “pulos” de layout)

Checklist de alto impacto:
- Definir dimensões em imagens/vídeos (reduz CLS)
- Evitar JS pesado no carregamento inicial (melhora LCP/INP)
- Fontes com `font-display: swap` (melhora percepção e reduz layout shift)

---

## Troubleshooting

### `ERR_TOO_MANY_REDIRECTS`

- Redirect apontando para ele mesmo ou conflito no proxy (http↔https / www↔non-www).
- Diagnóstico:

```bash
curl -I -L --max-redirs 10 http://127.0.0.1:5179/inovacao-digital
```

### “Redirect não funciona”

- Confirme que está em `src/hooks.server.ts` (não em `src/routes/`).
- Reinicie o processo no servidor.

### “Atualizei o repo e não mudou no site”

- Verifique se o domínio aponta para o build antigo (`pm2 serve` do `dist/`) ou para outro serviço.
- Confirme `proxy_pass`/porta no Nginx/Nginx Proxy Manager.

---

## Requisitos para manutenção (SEO e rastreio)

Para mexer com segurança, é importante ter domínio básico de:

- SEO on-page (titles, headings, canonical, sitemap, redirects)
- Search Console (indexação, cobertura, inspeção de URL)
- GA4 / GTM (eventos e conversões sem duplicidade)
- Meta Pixel (eventos e deduplicação)
- Schema.org / JSON-LD (Organization, FAQ, SoftwareApplication etc.)
- Privacidade/LGPD (consentimento, cookies, política)
- Performance (CWV: LCP/INP/CLS)
- Cache/CDN/headers (evitar conteúdo desatualizado e rastreio inconsistente)

---

## Licença (projeto privado)

Este repositório é **privado** e o código é **proprietário**.

- ✅ Uso e modificação apenas com autorização explícita do proprietário
- ❌ Proibido copiar, publicar, redistribuir, revender, sublicenciar ou reutilizar em outro produto sem permissão
