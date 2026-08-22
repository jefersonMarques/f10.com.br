# F10 Help Import v2 — instruções para IA

Converta os materiais fornecidos para o formato **F10 Help Import v2**. Preserve o conteúdo original e produza documentação operacional clara, pesquisável e útil tanto para o usuário final quanto para o agente de suporte com IA.

## Modos de entrega

### A. JSON simples
Use quando imagens e documentos já possuem URL `http/https` permanente. Imagens locais sem URL pública devem ser omitidas e adicionadas depois pelo editor ou por um pacote ZIP.

### B. Pacote ZIP
Use quando existirem imagens ou documentos locais que precisam ser migrados.

Estrutura recomendada:

```text
pacote.zip
├── manifest.json
└── assets/
    ├── tela-01.png
    └── documento.pdf
```

O importador também aceita um único `.json` no ZIP quando não existir `manifest.json`, mas prefira sempre `manifest.json` na raiz.

## Contrato raiz obrigatório

```json
{
  "format": "f10-help-import",
  "version": 2,
  "source": "movidesk",
  "contents": []
}
```

- `format` deve ser exatamente `f10-help-import`.
- `version` deve ser `2`.
- `source` deve identificar de forma curta e estável a origem real do material, por exemplo `movidesk`, `manual` ou `legacy-help`. Não invente uma origem diferente entre importações da mesma fonte.
- A importação sempre entra como **rascunho**. Nunca adicione campo de publicação.

## Estrutura de cada conteúdo

Cada artigo, tutorial ou material original deve virar um item de `contents` com:

- `externalId`: identificador estável do material original. Reutilize o ID da fonte quando existir.
- `title`: título claro e fiel.
- `slug`: endereço legível e estável.
- `summary`: resumo público curto.
- `category`: categoria textual existente no material ou confirmada pelo responsável.
- `aiGeneralKnowledge`: contexto interno útil ao agente de suporte.
- `featuredVideo`: opcional; no máximo **um vídeo principal por conteúdo**.
- `steps`: passos públicos em ordem cronológica.

## Vídeo principal

No v2, vídeo **não é bloco de passo**.

Quando houver vídeo, use exclusivamente `featuredVideo` no nível do conteúdo:

```json
{
  "featuredVideo": {
    "url": "https://www.youtube.com/watch?v=abc123XYZ78",
    "altText": "Demonstração completa do procedimento no F10",
    "transcript": "Transcrição fiel do vídeo, quando disponível.",
    "aiSummary": "Resumo operacional preciso do que o vídeo demonstra."
  }
}
```

Regras:

1. Use no máximo um `featuredVideo` por conteúdo.
2. Para reprodução incorporada na Central de Ajuda, prefira URL válida do YouTube (`youtube.com` ou `youtu.be`).
3. Se o vídeo estiver em outra plataforma e precisar apenas ser referenciado, prefira um bloco `link` em vez de fingir que será incorporado.
4. Nunca coloque arquivo de vídeo dentro de `assets/`.
5. Nunca use `{ "type": "video" }` dentro de `steps[].blocks` no v2.
6. Se informação importante existir apenas no vídeo, `transcript` e/ou `aiSummary` devem conter contexto suficiente para a IA responder sem assistir ao vídeo.
7. Não invente transcrição. Se não houver transcrição disponível, deixe o campo vazio ou omita.

O vídeo principal será exibido **antes de todos os passos**, no topo do artigo.

## Passos

Organize procedimentos em passos independentes e cronológicos.

Cada passo deve possuir:

- `title`: específico e compreensível isoladamente. Evite títulos genéricos como `Continuar`, `Próximo` ou `Passo seguinte`.
- `description`: orientação pública opcional.
- `aiKnowledge`: conhecimento interno específico daquele passo.
- `blocks`: ao menos um bloco público.

Os títulos precisam ser específicos porque a Central de Ajuda poderá levar o usuário diretamente ao passo correspondente a uma pergunta feita à IA.

Não crie um único passo gigante quando houver ações claramente separáveis.

## Blocos suportados no v2

Somente:

- `text`
- `image`
- `notice`
- `link`
- `file`

### text

```json
{
  "type": "text",
  "text": "No menu Cadastros, abra Funcionários."
}
```

### notice

`variant` só pode ser `info`, `warning`, `success` ou `danger`.

```json
{
  "type": "notice",
  "variant": "warning",
  "text": "Confirme a unidade antes de salvar."
}
```

### image no JSON simples

Use `url` somente quando houver URL `http/https` real e permanente.

```json
{
  "type": "image",
  "url": "https://exemplo.com/tela.png",
  "altText": "Tela de cadastro de funcionários",
  "aiSummary": "A imagem destaca o botão de inclusão no cadastro de funcionários."
}
```

Se não houver URL pública real, omita o bloco no JSON simples.

### image no ZIP

Prefira caminho explícito:

```json
{
  "type": "image",
  "file": "assets/cadastro-funcionario.png",
  "altText": "Tela de cadastro de funcionários",
  "aiSummary": "A imagem destaca o botão de inclusão."
}
```

O importador consegue localizar apenas pelo nome quando ele é único no ZIP, mas o caminho completo é preferível.

### file no JSON simples

```json
{
  "type": "file",
  "url": "https://exemplo.com/modelo.xlsx",
  "label": "Baixar modelo de importação",
  "aiSummary": "Planilha modelo usada pelo procedimento."
}
```

### file no ZIP

```json
{
  "type": "file",
  "file": "assets/modelo-importacao.xlsx",
  "label": "Baixar modelo de importação",
  "aiSummary": "Planilha modelo usada pelo procedimento."
}
```

Nunca informe simultaneamente `url` e `file` no mesmo bloco `image` ou `file`.

### link

```json
{
  "type": "link",
  "url": "https://f10.com.br",
  "label": "Abrir referência relacionada"
}
```

## Arquivos locais permitidos no ZIP

- `png`
- `jpg` / `jpeg`
- `webp`
- `gif`
- `pdf`
- `docx`
- `xlsx`
- `xls`
- `csv`
- `txt`

Use nomes simples e seguros. Não use caminhos absolutos, `../`, executáveis ou arquivos desnecessários.

## Conhecimento para IA

### aiGeneralKnowledge
Use para contexto geral do conteúdo:

- pré-requisitos;
- permissões;
- exceções;
- regras de negócio;
- nomenclaturas antigas;
- erros comuns;
- condições especiais;
- formas seguras de diagnóstico.

### aiKnowledge
Use somente para conhecimento específico daquele passo.

### aiSummary de mídia/arquivo
Explique o que a mídia comprova ou demonstra e por que ela é útil para responder dúvidas.

Evite repetir a mesma informação em `aiGeneralKnowledge`, `aiKnowledge` e `aiSummary`.

Conhecimento interno não deve ser escrito como mensagem ao usuário. Não inclua senhas, tokens, dados pessoais, segredos ou informações que não deveriam entrar na Base de Conhecimento.

## Fidelidade

- Não invente telas, menus, botões, regras, permissões ou resultados.
- Não transforme inferência em fato.
- Quando o material estiver incompleto, preserve apenas o que ele realmente sustenta.
- Não altere o significado do conteúdo original para deixá-lo “mais completo”.
- Texto público deve ser adequado ao usuário final.
- Conhecimento interno deve ajudar o agente sem revelar informação imprópria.

## Checklist obrigatório antes de entregar

Valide que:

1. `format` é `f10-help-import`.
2. `version` é `2`.
3. `source` é estável e não está vazio.
4. Todo `content` possui `externalId`, `title` e ao menos um `step`.
5. Não há `externalId` duplicado.
6. Não há `slug` duplicado.
7. Todo passo possui `title` específico e ao menos um bloco.
8. Existe no máximo um `featuredVideo` por conteúdo.
9. Não existe bloco `type: "video"` dentro de passos.
10. `featuredVideo.url`, links e URLs de mídia usam `http` ou `https`.
11. No JSON simples, imagens sem URL pública são omitidas.
12. No ZIP, cada `file` informado existe no pacote.
13. `image` e `file` nunca usam `url` e `file` simultaneamente.
14. O JSON final é parseável.
15. Nenhum conteúdo é marcado como publicado.

## Objetivo

O material importado será usado para:

- montar a Central de Ajuda visual;
- levar o usuário diretamente ao passo relevante;
- indexar pesquisa e respostas assistidas por IA;
- alimentar o suporte com conhecimento público e interno devidamente separado;
- disponibilizar imagens e documentos pela biblioteca de assets;
- identificar lacunas de conhecimento.

Priorize fidelidade, clareza e estrutura. O objetivo não é criar um curso ou uma trilha obrigatória, e sim uma **Base de Conhecimento navegável e assistida por IA**.
