# Criar uma Trilha F10 com IA

Envie este arquivo para a IA junto com o material de origem: procedimentos, manuais, prints, vídeos, transcrições e demais arquivos que devem virar a orientação.

## Tarefa

Transforme o material fornecido em um pacote importável de **Trilha F10**. Gere um `training.json` válido e organize o conteúdo como um **guia operacional passo a passo** para uma pessoa com pouca familiaridade com sistemas e pouca disposição para estudar antes de executar.

A experiência não deve parecer prova, formulário ou treinamento teórico. O participante deve olhar para a orientação, executar uma ação simples no F10 e clicar em **Próximo passo**.

## Regras de experiência

- Use `"formatVersion": 1`.
- Use `"accessMode": "invite_only"` por padrão; use `"public"` somente quando solicitado.
- Escreva em português do Brasil, com frases curtas, palavras simples e sem jargões desnecessários.
- Não suponha que o participante conheça menus, processos, atalhos ou termos técnicos.
- Não faça perguntas ao participante. Não gere campos `question` no JSON novo.
- Cada passo deve começar com um `title` no imperativo ou com uma ação extremamente clara. Exemplos: `Abra o menu Cadastros`, `Clique em Novo usuário`, `Preencha o e-mail`.
- `instruction` deve dizer exatamente o que fazer agora, sem explicar ações futuras.
- `primaryActionLabel` deve ser `Próximo passo`, salvo quando houver uma razão operacional muito clara para outro texto.
- Use `interactionMode: "presentation"` quando a pessoa só precisa ler ou observar.
- Use `interactionMode: "action"` quando a pessoa precisa executar algo.
- `expectedResult` é opcional. Quando usado, escreva apenas uma dica curta que ajude a pessoa a reconhecer a tela ou entender se está no lugar certo. Não transforme o campo em outra pergunta.
- Não crie `failureReasons`. A opção **Preciso de ajuda** é global. O F10 solicita login, coleta o relato em texto livre e permite somente registrar a dificuldade ou registrar e abrir um ticket.
- `successMessage` deve ser curta e não afirmar algo que o sistema não verificou. Exemplo: `Certo. Vamos para o próximo passo.`
- `estimatedSeconds` é somente informação interna e não deve ser mencionada nos textos mostrados ao participante.
- Não informe ao participante quantidade total de passos nem duração total da trilha.
- Referencie somente imagens e vídeos realmente fornecidos. Não invente nomes de arquivos, telas, botões, permissões ou funcionalidades.

## Imagens

Formatos aceitos:

- PNG
- JPG/JPEG
- WEBP
- GIF

Use **no máximo uma imagem por passo**.

A imagem deve mostrar exatamente onde a pessoa precisa olhar ou clicar. Evite sequências de prints, galerias e carrosséis. Se duas imagens forem realmente necessárias para explicar duas ações diferentes, crie dois passos.

Prefira recortes ou prints em que o elemento importante esteja visualmente evidente. Quando possível, destaque no próprio material a região relevante com seta, contorno, círculo ou zoom. Não invente marcações que não correspondam ao print real fornecido.

Use `altText` com uma descrição simples do que está sendo mostrado.

## Vídeos

Vídeo local deve:

- ser MP4;
- ter **no mínimo 30 segundos e no máximo 60 segundos**;
- ter até 25 MB.

Legenda `.vtt` não é obrigatória e não deve ser criada apenas para satisfazer o formato.

O vídeo é uma demonstração auxiliar para quem não conseguiu entender pela instrução e pela imagem. Não use vídeo como única forma de explicar um passo quando houver um print claro disponível.

Essa faixa de duração é obrigatória. Não corte uma demonstração em vídeos de poucos segundos apenas para transformar cada clique em uma etapa.

Se uma demonstração ficar com menos de 30 segundos, agrupe instruções consecutivas que façam parte da mesma ação até formar uma explicação coerente entre 30 e 60 segundos.

Se a demonstração ultrapassar 60 segundos, divida somente quando houver uma mudança real de objetivo ou outra ação independente.

Para vídeo externo, use URL HTTP/HTTPS. Mesmo quando o sistema não puder validar automaticamente sua duração, planeje a demonstração com a mesma faixa recomendada de 30 a 60 segundos.

Não use o mesmo caminho de arquivo como tipos diferentes.

## Exemplo de apresentação

```json
{
  "title": "Veja onde fica o menu principal",
  "interactionMode": "presentation",
  "instruction": "Observe o menu no lado esquerdo da tela. É nele que você vai encontrar as opções usadas nos próximos passos.",
  "primaryActionLabel": "Próximo passo",
  "successMessage": "Certo. Vamos para o próximo passo.",
  "images": [
    {
      "file": "images/menu-principal.png",
      "altText": "Menu principal do F10 no lado esquerdo da tela"
    }
  ]
}
```

## Exemplo de ação

```json
{
  "title": "Abra o cadastro de usuários",
  "interactionMode": "action",
  "instruction": "No menu lateral, clique em Usuários.",
  "expectedResult": "A tela com a lista de usuários deve ficar aberta.",
  "primaryActionLabel": "Próximo passo",
  "successMessage": "Certo. Vamos para o próximo passo.",
  "estimatedSeconds": 45,
  "images": [
    {
      "file": "images/usuarios.png",
      "altText": "Opção Usuários destacada no menu lateral do F10"
    }
  ],
  "video": {
    "file": "videos/usuarios.mp4"
  }
}
```

## Estrutura do ZIP

```text
training.json
images/
  menu-principal.png
  usuarios.png
videos/
  usuarios.mp4
```

A raiz deve conter `training.json` ou `manifest.json`.

## Como responder

Entregue nesta ordem:

1. conteúdo completo do `training.json` em um único bloco JSON válido;
2. árvore de arquivos esperada no ZIP;
3. seção `Pendências` somente quando faltar informação indispensável.

O `training.json` final não deve conter comentários, explicações ou o campo `_aiPrompt`.

Não invente dados quando o material de origem não for suficiente. Preserve a terminologia real encontrada nos arquivos fornecidos, mas reescreva as instruções para que uma pessoa sem conhecimento técnico consiga apenas olhar, executar e avançar.
