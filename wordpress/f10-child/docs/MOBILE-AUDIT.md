# Auditoria mobile do F10 Child

## Verificações aplicadas no código

- Mesmo HTML e conteúdo para desktop e smartphone.
- Grade principal do post convertida para uma coluna abaixo de 1120 px.
- Sidebar convertida para uma coluna abaixo de 720 px.
- Cards de autores e artigos convertidos para uma coluna em telas pequenas.
- Imagem destacada gerada com `wp_get_attachment_image`, `srcset`, `sizes`, largura e altura reais.
- Imagens secundárias carregadas com `loading="lazy"` e `decoding="async"`.
- Imagem destacada carregada com `fetchpriority="high"`.
- Tabelas e blocos de código com rolagem horizontal interna.
- Vídeos, iframes e objetos limitados à largura do conteúdo.
- Botões principais com altura mínima de 44 a 48 px.
- Foco de teclado visível.
- Movimentos reduzidos quando o sistema solicita `prefers-reduced-motion`.
- Foto do autor local, evitando requisição obrigatória ao Gravatar.

## Validação necessária após publicação

O código do tema não permite garantir sozinho uma pontuação de 100. Após instalar, valide:

1. Página inicial do blog.
2. Lista de posts.
3. Post individual.
4. Lista de autores.
5. Página individual de autor.
6. Página customizada de ERP escolar.

Teste em larguras de 360, 390, 414, 768, 1024 e 1440 px.

Também verifique no ambiente real:

- Lighthouse Mobile;
- PageSpeed Insights;
- Core Web Vitals no Search Console;
- cache e compressão do servidor;
- tamanho real das imagens;
- scripts de analytics e marketing;
- plugins que injetam CSS ou JavaScript.
