# Prompt para criar uma Trilha F10 com IA

Copie todo o conteúdo deste arquivo e envie para a IA junto com o material de origem: manual, procedimento, descrição da rotina, prints, vídeos, transcrições ou arquivos que devem virar treinamento.

---

Você é responsável por transformar o material que eu fornecer em um pacote importável de **Trilha F10**.

## Objetivo

Produza um `training.json` válido no formato F10 e organize o conteúdo em microações curtas, mostrando ao participante somente o que ele precisa fazer agora.

Não invente telas, menus, permissões, mensagens, arquivos, imagens ou vídeos que não estejam no material fornecido. Quando faltar uma informação indispensável, não crie um dado fictício: liste a pendência depois do JSON.

## Regras obrigatórias do `training.json`

- Use `"formatVersion": 1`.
- Use `"accessMode": "invite_only"` por padrão. Use `"public"` somente se eu pedir explicitamente um link público.
- Crie títulos e instruções em português do Brasil, curtos e objetivos.
- Divida o conteúdo em microações. Cada passo deve ensinar ou solicitar somente uma coisa por vez.
- Não informe ao participante a quantidade total de passos nem a duração total da trilha.
- `estimatedSeconds` é apenas uma estimativa interna e pode ser informado por passo quando fizer sentido.
- Use `interactionMode: "presentation"` quando a pessoa só precisa ler, entender ou observar algo.
- Use `interactionMode: "action"` quando a pessoa precisa executar uma ação no sistema.
- Todo passo `action` deve possuir `expectedResult` e pelo menos um item em `failureReasons`.
- `successMessage` deve ser uma microvitória curta, confirmando que a pessoa avançou.
- Use `images` apenas para imagens realmente fornecidas. Não invente nomes de arquivos.
- Para vídeo externo, use uma URL HTTP/HTTPS.
- Para MP4 local, use obrigatoriamente:

```json
"video": {
  "file": "videos/exemplo.mp4",
  "captions": "videos/exemplo.vtt"
}
```

- Todo MP4 local precisa de legenda WebVTT `.vtt` para poder ser publicado.
- Não referencie o mesmo caminho de arquivo como tipos diferentes.
- Não inclua campos extras no `training.json` final, incluindo `_aiPrompt`.

## Modos de interação

### Apresentação

Use quando não existe uma ação que precise ser confirmada.

Exemplo:

```json
{
  "title": "Antes de começar",
  "interactionMode": "presentation",
  "instruction": "Confira as informações desta tela antes de continuar.",
  "successMessage": "Certo. Vamos continuar."
}
```

### Ação

Use quando a pessoa precisa fazer alguma coisa e confirmar que conseguiu.

Exemplo:

```json
{
  "title": "Abra o cadastro de clientes",
  "interactionMode": "action",
  "instruction": "No menu principal, abra Clientes.",
  "expectedResult": "A lista de clientes deve aparecer na tela.",
  "successMessage": "Perfeito. Você chegou à lista de clientes.",
  "estimatedSeconds": 30,
  "failureReasons": [
    {
      "key": "option_not_found",
      "label": "Não encontrei a opção",
      "recoveryMessage": "Confira novamente o menu indicado e compare com a demonstração."
    },
    {
      "key": "permission_missing",
      "label": "Não tenho permissão",
      "recoveryMessage": "Peça ajuda para verificar o perfil liberado para seu usuário."
    }
  ]
}
```

## Arquivos de mídia

Imagens aceitas no pacote:

- PNG
- JPG/JPEG
- WEBP
- GIF

Vídeo local:

- MP4
- máximo de 60 segundos por microvídeo
- até 25 MB
- legenda `.vtt` obrigatória

Não transforme um vídeo longo em uma única etapa. Divida em microvídeos quando houver mais de uma ação independente.

Se eu enviar um vídeo com fala e você conseguir compreender o conteúdo, gere também o texto WebVTT correspondente. Se não houver informação suficiente para produzir uma legenda fiel, informe que o `.vtt` precisa ser criado e não invente falas.

## Estrutura esperada do ZIP

A raiz deve conter `training.json` ou `manifest.json`.

Exemplo:

```text
training.json
images/
  boas-vindas.png
  clientes.png
videos/
  clientes.mp4
  clientes.vtt
```

## Como responder

Entregue sua resposta nesta ordem:

1. O conteúdo completo do `training.json` final, em um único bloco JSON válido.
2. A árvore de arquivos que devem existir dentro do `.zip`.
3. O conteúdo completo de cada arquivo `.vtt` que você conseguir gerar com segurança.
4. Uma seção `Pendências`, somente se faltar algum arquivo ou informação indispensável.

O JSON final deve poder ser salvo diretamente como `training.json`, sem textos, comentários ou marcações dentro do objeto.

## Material de origem

A partir deste ponto, use somente o material que eu fornecer para definir telas, nomes, instruções, resultados e arquivos. Preserve a terminologia real do sistema e não substitua informações do material por suposições genéricas.
