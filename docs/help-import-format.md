# F10 Help Import v1

O formato `f10-help-import` permite migrar conteúdos existentes para a Base de Conhecimento estruturada sem recriar manualmente artigos, passos, imagens, vídeos e conhecimento destinado à IA.

A importação nunca publica automaticamente. Todo item entra como `draft` e precisa ser revisado antes de uma publicação.

## Arquivo de referência

Use como base:

```text
/templates/f10-help-import-v1.example.json
```

## Estrutura raiz

```json
{
  "format": "f10-help-import",
  "version": 1,
  "source": "movidesk",
  "contents": []
}
```

Campos:

- `format`: obrigatório e fixo em `f10-help-import`.
- `version`: obrigatório e atualmente igual a `1`.
- `source`: origem estável da migração, por exemplo `movidesk`.
- `contents`: lista de conteúdos estruturados.

## Conteúdo

```json
{
  "externalId": "movidesk-article-123",
  "title": "Como cadastrar uma turma",
  "slug": "como-cadastrar-uma-turma",
  "summary": "Resumo público.",
  "category": "Acadêmico",
  "aiGeneralKnowledge": "Conhecimento interno útil para o agente.",
  "steps": []
}
```

`externalId` deve ser estável e único dentro da mesma `source`. Ele impede que o mesmo conteúdo seja importado duas vezes acidentalmente.

## Passos

Cada conteúdo precisa possuir pelo menos um passo.

```json
{
  "title": "Abra o cadastro de turmas",
  "description": "Descrição pública opcional.",
  "aiKnowledge": "Contexto exclusivo para a IA neste passo.",
  "blocks": []
}
```

A ordem no array é a ordem apresentada ao usuário final.

## Blocos

### Texto

```json
{
  "type": "text",
  "text": "No menu principal, acesse Acadêmico e depois Turmas."
}
```

### Imagem

```json
{
  "type": "image",
  "url": "https://example.com/imagem.png",
  "altText": "Tela do cadastro de turmas",
  "aiSummary": "A imagem mostra a opção Turmas no menu Acadêmico."
}
```

### Vídeo

```json
{
  "type": "video",
  "url": "https://example.com/video.mp4",
  "altText": "Vídeo demonstrando o cadastro",
  "transcript": "Transcrição integral do áudio do vídeo.",
  "aiSummary": "Resumo objetivo do procedimento demonstrado."
}
```

A transcrição é especialmente importante quando a informação necessária para responder ao usuário existe apenas no vídeo.

### Aviso

```json
{
  "type": "notice",
  "variant": "warning",
  "text": "Revise os dados antes de salvar."
}
```

Valores aceitos para `variant`: `info`, `warning`, `success` e `danger`.

### Link

```json
{
  "type": "link",
  "url": "https://example.com/referencia",
  "label": "Abrir referência"
}
```

## Regras importantes

- O JSON precisa ser UTF-8 e válido.
- Máximo de 5 MB por upload na interface atual.
- Máximo de 250 conteúdos por arquivo.
- Máximo de 80 passos por conteúdo.
- Máximo de 80 blocos por passo.
- Máximo de 8.000 blocos no arquivo inteiro.
- URLs de imagem, vídeo e link precisam usar `http` ou `https`.
- Slugs repetidos são rejeitados.
- `externalId` repetido para a mesma origem é rejeitado.
- A importação é transacional: qualquer conflito ou erro impede a criação parcial do lote.
- Imagens e vídeos não são copiados fisicamente durante a importação; a URL fornecida é registrada como origem da mídia.

## Prompt sugerido para outra IA

O texto abaixo pode ser entregue junto com o arquivo de exemplo:

```text
Converta os materiais fornecidos para o formato F10 Help Import v1.

Regras:
1. Retorne somente JSON válido, sem markdown e sem explicações fora do JSON.
2. Use exatamente:
   "format": "f10-help-import"
   "version": 1
   "source": "movidesk"
3. Cada artigo/material original deve virar um item de "contents".
4. Preserve um identificador estável do material original em "externalId". Se houver ID do Movidesk, use-o.
5. Organize cada procedimento em passos independentes e em ordem cronológica.
6. Não crie um único passo gigante quando houver ações claramente separáveis.
7. Em "description" e blocos "text", escreva somente informação adequada para o usuário final.
8. Em "aiGeneralKnowledge" e "aiKnowledge", coloque contexto útil ao agente de suporte que não precisa ser exibido ao usuário, como pré-requisitos, permissões, exceções, erros comuns, nomenclaturas antigas e condições especiais.
9. Para vídeos, preencha "transcript" com a transcrição fornecida e "aiSummary" com um resumo operacional preciso do que o vídeo ensina.
10. Não invente informação ausente no material original. Quando algo não estiver disponível, deixe o campo opcional ausente ou vazio.
11. Para imagens, descreva em "altText" o que o usuário precisa identificar visualmente e, quando útil, use "aiSummary" para explicar o que a imagem demonstra ao agente.
12. Use blocos somente dos tipos: text, image, video, notice e link.
13. Mantenha URLs originais válidas para imagens, vídeos e links.
14. Gere títulos e slugs claros, mas não altere o significado do conteúdo original.
15. Não marque nenhum conteúdo como publicado; o sistema F10 sempre importará como rascunho.

Valide mentalmente a estrutura contra o arquivo de exemplo antes de responder.
```
