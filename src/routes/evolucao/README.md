# Rota temporaria de evolucao

Esta pasta contem arquivos HTML, CSS, JS e midia copiados de paginas antigas de evolucao.
Eles foram mantidos praticamente como estao porque esta publicacao e temporaria.

## Como a rota funciona

O SvelteKit nao cria rotas diretamente a partir de `index.html` dentro de `src/routes`.
Por isso foram adicionados endpoints em:

- `src/routes/evolucao/+server.ts`
- `src/routes/evolucao/[...path]/+server.ts`

Esses endpoints usam `src/lib/server/evolucaoStatic.ts` para ler os arquivos desta pasta no servidor e devolver a resposta com o `content-type` correto.
Quando o arquivo servido e HTML, o helper injeta um `<base>` apontando para a pasta da pagina para que referencias relativas como `style.css`, `script.js`, imagens e videos continuem funcionando.

## Links antigos

Tambem foram adicionados redirects 301 para manter compatibilidade com URLs antigas:

- `/evolucao_f10/cebrac.html` -> `/evolucao/evolucao_f10/cebrac.html`
- `/evolucao_f10/` -> `/evolucao/evolucao_f10`
- `/evolucao_microcamp` -> `/evolucao/evolucao_microcamp`
- `/evolucao_iah` -> `/evolucao/evolucao_iah`

As URLs publicas nao precisam usar `.html`. O endpoint tenta encontrar o arquivo `.html` correspondente quando a URL nao tem extensao.
Exemplo: `/evolucao/evolucao_f10/cebrac` serve o arquivo `evolucao_f10/cebrac.html`.

Quando alguem acessa uma URL com `.html`, o endpoint redireciona para a versao limpa:

- `/evolucao/evolucao_f10/cebrac.html` -> `/evolucao/evolucao_f10/cebrac`
- `/evolucao_f10/cebrac.html` -> `/evolucao/evolucao_f10/cebrac`

O redirect de `/evolucao_f10/*` preserva o restante do caminho, remove `.html` quando existir, e aponta para o local novo equivalente.

## Remocao futura

Quando essas paginas forem substituidas por paginas Svelte definitivas ou movidas para um local estatico oficial, remova:

- esta pasta temporaria de arquivos copiados;
- `src/lib/server/evolucaoStatic.ts`;
- `src/lib/server/evolucaoLegacyRedirect.ts`;
- os endpoints em `src/routes/evolucao*`.
