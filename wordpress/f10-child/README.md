# F10 WordPress Child Theme — Authors

Projeto de evolução do tema filho Astra utilizado no Blog F10, com autoria profissional, páginas públicas de autores e melhorias responsivas.

## Versão alvo

`1.1.1`

## Principais recursos

- perfil editorial próprio para cada usuário do WordPress;
- foto local pela Biblioteca de Mídia e substituição do Gravatar pela API padrão de avatares;
- recuperação segura quando o WordPress mantém referência para um arquivo `cropped-*` removido;
- nome real do autor no cabeçalho de cada post;
- caixa profissional de autor ao final do artigo;
- página individual de autor usando `author.php`;
- página com a lista pública de autores;
- imagens responsivas com `srcset`, `sizes`, dimensões reais e prioridade da imagem destacada;
- ajustes para smartphone, tablet, teclado e redução de movimento;
- sanitização, nonce, validação de permissão e validação de anexos.

## Estrutura

```text
src/
  assets/
    css/
      f10-author.css
      f10-author-admin.css
    js/
      f10-author-profile-admin.js
  inc/
    author-profile.php
  template-parts/
    author-card.php
    post-author-box.php
  author.php
  template-f10-authors.php
patches/
  integration.patch
```

Os arquivos de `src/` são adicionados ao tema filho existente. O arquivo `patches/integration.patch` contém as alterações necessárias em `functions.php`, `single-post.php`, `style.css` e `assets/css/f10-single-post.css`.

## Aplicação sobre o child atual

Na raiz do tema filho:

```bash
cp -R wordpress/f10-child/src/. ./
git apply wordpress/f10-child/patches/integration.patch
```

Antes da aplicação em produção, faça backup do diretório atual e valide a alteração em homologação.

## Configuração de Rodrigo Fonseca

| Campo | Valor |
|---|---|
| Nome de exibição | Rodrigo Fonseca |
| E-mail interno | rodrigo.fonseca@f10.com.br |
| Cargo | Head Comercial da F10 Software |
| Especialidades | Vendas, Captação de alunos, Funil de matrículas, Processos comerciais para escolas |
| LinkedIn | https://www.linkedin.com/in/rfrodrigofonseca/ |
| Biografia curta | Rodrigo Fonseca é Head Comercial da F10 Software e especialista em vendas, captação de alunos e processos de matrículas para instituições de ensino. |

O e-mail não é exibido publicamente pelo tema.

## Lista de autores

Crie uma página no WordPress e selecione o modelo **F10 - Autores**. A página lista usuários com posts publicados e visibilidade pública habilitada.

## Correção de avatar 404

A versão 1.1.1 verifica o arquivo físico antes de renderizar a foto. Quando o banco ainda aponta para um recorte removido, por exemplo `cropped-1708005052642.jpeg`, o tema procura tamanhos existentes, a imagem original e a variante sem o prefixo `cropped-`. Se nenhuma versão existir, exibe as iniciais em vez de gerar uma imagem quebrada.

Depois da atualização, limpe o cache do WordPress, do servidor e da CDN. Caso o arquivo original também tenha sido removido, envie novamente a foto no perfil do autor.

## Validação realizada

- sintaxe PHP validada em todos os templates;
- sintaxe JavaScript validada;
- balanceamento estrutural dos arquivos CSS validado;
- breakpoints revisados para 360, 390, 414, 768, 1024 e 1440 px;
- imagens e mídias protegidas contra estouro horizontal;
- alvos de toque principais com pelo menos 44 px.

A nota final do Lighthouse depende também de hospedagem, cache, plugins, imagens publicadas e scripts de terceiros, portanto deve ser confirmada no ambiente de produção.
