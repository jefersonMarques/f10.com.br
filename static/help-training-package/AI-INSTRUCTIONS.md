# Criar uma Trilha F10 com IA

Envie este arquivo para a IA junto com o material de origem: procedimentos, manuais, prints, vídeos, transcrições e demais arquivos que devem virar a orientação.

## Tarefa

Transforme o material fornecido em um pacote importável de **Trilha F10**. Gere um `training.json` válido e organize o conteúdo para uma pessoa com pouca familiaridade com sistemas conseguir seguir sem ajuda prévia.

A experiência deve ser extremamente clara: uma pergunta principal por etapa, uma explicação curta, uma demonstração quando existir e um botão que diga exatamente o que a pessoa deve confirmar ou fazer.

## Regras de experiência

- Use `"formatVersion": 1`.
- Use `"accessMode": "invite_only"` por padrão; use `"public"` somente quando solicitado.
- Escreva em português do Brasil, com frases curtas, palavras simples e sem jargões desnecessários.
- Não suponha que o participante conheça menus, processos ou termos técnicos.
- Cada etapa deve tratar de uma ação ou confirmação coerente. Não fragmente o processo em cliques insignificantes.
- Não informe ao participante quantidade total de etapas nem duração total da trilha.
- Todo passo deve possuir `question`: uma pergunta principal que a pessoa consiga responder olhando para o que acabou de fazer ou para o que aparece na tela.
- Todo passo deve possuir `primaryActionLabel`: o texto do botão principal deve responder diretamente à pergunta ou indicar claramente a ação. Exemplos: `Sim, apareceu`, `Sim, criei`, `Entendi, continuar`, `Começar matrícula`.
- Use `interactionMode: "presentation"` quando a pessoa só precisa ler, compreender ou observar.
- Use `interactionMode: "action"` quando a pessoa precisa executar algo.
- Todo passo `action` deve possuir `expectedResult`, descrevendo de forma simples o que deve aparecer ou acontecer quando a ação der certo.
- Não crie `failureReasons`. A opção **Não consegui** é global. O F10 solicita login, coleta o relato em texto livre e permite somente salvar a dificuldade ou abrir um ticket.
- `successMessage` deve ser curta e não afirmar algo que o sistema não verificou. Exemplo: `Certo. Próxima orientação.`
- `estimatedSeconds` é somente informação interna e não deve ser mencionada nos textos mostrados ao participante.
- Referencie somente imagens e vídeos realmente fornecidos. Não invente nomes de arquivos, telas, botões, permissões ou funcionalidades.

## Imagens

Formatos aceitos:

- PNG
- JPG/JPEG
- WEBP
- GIF

A imagem deve ajudar a pessoa a reconhecer visualmente a tela. Quando possível, use no `altText` uma descrição simples do que está sendo mostrado.

## Microvídeos

Vídeo local deve:

- ser MP4;
- ter **no mínimo 30 segundos e no máximo 60 segundos**;
- ter até 25 MB;
- possuir legenda WebVTT `.vtt`.

Essa faixa de duração é obrigatória. Não corte uma demonstração em vídeos de poucos segundos apenas para transformar cada clique em uma etapa.

Se uma demonstração ficar com menos de 30 segundos, agrupe instruções consecutivas que façam parte da mesma ação até formar uma explicação coerente entre 30 e 60 segundos.

Se a demonstração ultrapassar 60 segundos, divida somente quando houver uma mudança real de objetivo ou outra ação independente. O segundo vídeo também deve formar uma demonstração coerente, e não apenas a continuação arbitrária de uma frase ou clique.

Para vídeo externo, use URL HTTP/HTTPS. Mesmo quando o sistema não puder validar automaticamente sua duração, planeje a demonstração com a mesma faixa recomendada de 30 a 60 segundos.

Não use o mesmo caminho de arquivo como tipos diferentes.

## Exemplo de apresentação

```json
{
  "title": "Antes de começar",
  "question": "Pronto para começar?",
  "interactionMode": "presentation",
  "instruction": "Você verá uma orientação de cada vez. Faça somente o que está sendo pedido agora.",
  "primaryActionLabel": "Sim, começar",
  "successMessage": "Certo. Vamos começar."
}
```

## Exemplo de ação

```json
{
  "title": "Primeiro acesso",
  "question": "A tela para criar sua senha apareceu?",
  "interactionMode": "action",
  "instruction": "Entre com o login e a senha provisória recebidos por e-mail.",
  "expectedResult": "Uma janela para definir sua nova senha deve aparecer.",
  "primaryActionLabel": "Sim, apareceu",
  "successMessage": "Certo. Próxima orientação.",
  "estimatedSeconds": 45,
  "images": [
    {
      "file": "images/primeiro-acesso.png",
      "altText": "Tela de primeiro acesso do F10"
    }
  ],
  "video": {
    "file": "videos/primeiro-acesso.mp4",
    "captions": "videos/primeiro-acesso.vtt"
  }
}
```

## Estrutura do ZIP

```text
training.json
images/
  primeiro-acesso.png
videos/
  primeiro-acesso.mp4
  primeiro-acesso.vtt
```

A raiz deve conter `training.json` ou `manifest.json`.

## Como responder

Entregue nesta ordem:

1. conteúdo completo do `training.json` em um único bloco JSON válido;
2. árvore de arquivos esperada no ZIP;
3. conteúdo completo dos arquivos `.vtt` que puder gerar com fidelidade;
4. seção `Pendências` somente quando faltar informação indispensável.

O `training.json` final não deve conter comentários, explicações ou o campo `_aiPrompt`.

Não invente dados quando o material de origem não for suficiente. Preserve a terminologia real encontrada nos arquivos fornecidos, mas reescreva as instruções de forma clara para uma pessoa sem conhecimento técnico.
