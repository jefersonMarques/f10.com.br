# F10 Software — Site (SvelteKit + Tailwind)

Projeto inicial com **tema claro**, tipografia **Plus Jakarta Sans**, duas páginas (Início e Contato), Header/Footer e seções base (Hero, Recursos, Métricas).

## 🔧 Como rodar

```bash
# 1) Instale as dependências
npm install

# 2) Ambiente de desenvolvimento
npm run dev

# 3) Build de produção
npm run build

# 4) Preview do build
npm run preview
```

## 🧰 Stack
- SvelteKit 2 + Vite
- TailwindCSS 3 + @tailwindcss/typography
- SEO básico em cada página via `<svelte:head>`

## 📝 Estrutura
- `src/lib/components/Header.svelte` e `Footer.svelte`
- `src/routes/+layout.svelte` e `+layout.ts`
- `src/routes/+page.svelte` (Home com Hero/Recursos/Métricas)
- `src/routes/contato/+page.svelte` (Formulário simples)

## 🎨 Tema e tipografia
- Tema **claro** por padrão.
- Tipografia **Plus Jakarta Sans** (Google Fonts). Ajuste em `src/app.css`.

## 🔍 Notas de SEO
- Títulos e descrições definidos por página.
- Estrutura semântica com headings e conteúdo renderizado no servidor (SSG/SSR).
- Substitua a imagem de mock no Hero por um screenshot real do produto para melhorar CTR.

---

> Variáveis/funções em inglês e comentários em PT-BR, conforme solicitado.
