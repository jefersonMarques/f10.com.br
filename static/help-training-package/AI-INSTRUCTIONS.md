# Criar uma Trilha F10 com IA

Envie este arquivo para a IA junto com o material de origem: procedimentos, manuais, prints, vídeos, transcrições e demais arquivos que devem virar a orientação.

## Tarefa

Transforme o material fornecido em um pacote importável de **Trilha F10**. Gere um `training.json` válido e organize o conteúdo como um **guia operacional passo a passo** para uma pessoa com pouca familiaridade com sistemas e pouca disposição para estudar antes de executar.

A experiência não é um curso para assistir. O participante precisa estar com o F10 aberto, executar uma ação curta e depois confirmar um resultado observável na tela antes que o próximo passo seja liberado.

O fluxo de cada passo é:

```text
FAZER A AÇÃO
→ Já fiz esta etapa
→ CONFIRMAR O RESULTADO
   → Sim: avança
   → Não: bloqueia o avanço e mostra recuperação
```

Quando o navegador suportar o guia flutuante, o participante poderá manter uma pequena janela por cima do F10. **Essa janela não mostra a imagem do passo**, portanto `title`, `instruction`, `question` e `expectedResult` precisam ser compreensíveis sozinhos.

## Regras de experiência

- Use `"formatVersion": 1`.
- Use `"accessMode": "invite_only"` por padrão; use `"public"` somente quando solicitado.
- Escreva em português do Brasil, com frases curtas, palavras simples e sem jargões desnecessários.
- Não suponha que o participante conheça menus, processos, atalhos ou termos técnicos.
- Cada passo deve começar com um `title` no imperativo ou com uma ação extremamente clara. Exemplos: `Abra o menu Cadastros`, `Clique em Novo usuário`, `Preencha o e-mail`.
- `instruction` deve dizer exatamente o que fazer agora, sem explicar ações futuras.
- Todo passo deve ter `question`: uma **pergunta de confirmação sobre algo que a pessoa consegue observar no F10 depois de executar a ação**.
- A pergunta nunca deve testar conhecimento, memória ou entendimento. Não use perguntas como `Você entendeu?`, `Quer continuar?`, `Você sabe onde fica?` ou `Conseguiu acompanhar?`.
- Prefira perguntas concretas como `A janela Funcionários - Dados da Pessoa está aberta?`, `O campo E-mail está preenchido?`, `Usuário Ativo está marcado?` ou `O funcionário apareceu na lista?`.
- `expectedResult` deve descrever, de forma curta, o estado obrigatório que a pessoa precisa encontrar. Ele será usado principalmente quando a pessoa responder **Não**.
- Use `primaryActionLabel: "Já fiz esta etapa"`.
- Use `interactionMode: "presentation"` quando a pessoa só precisa observar algo, mas ainda assim gere uma confirmação observável.
- Use `interactionMode: "action"` quando a pessoa precisa executar algo.
- Não crie `failureReasons`. A opção **Preciso de ajuda** é global. O F10 solicita login, coleta o relato em texto livre e permite somente registrar a dificuldade ou registrar e abrir um ticket.
- `successMessage` é opcional e não deve ser usada para afirmar algo que o sistema não verificou.
- `estimatedSeconds` é somente informação interna e não deve ser mencionada nos textos mostrados ao participante.
- Não informe ao participante quantidade total de passos nem duração total da trilha.
- Referencie somente imagens e vídeos realmente fornecidos. Não invente nomes de arquivos, telas, botões, permissões ou funcionalidades.

## Como escrever uma boa confirmação

A pergunta deve ser respondível olhando para o F10 naquele momento.

Exemplo correto:

```json
{
  "title": "Abra um novo cadastro de funcionário",
  "instruction": "Abra **Cadastros**, entre em `Funcionários` e clique em `+`.",
  "question": "A janela **Funcionários - Dados da Pessoa** está aberta?",
  "expectedResult": "A janela de cadastro deve estar aberta e pronta para preenchimento."
}
```

Exemplos incorretos:

```text
Você entendeu como cadastrar um funcionário?
Quer continuar?
Você sabe o que fazer agora?
Conseguiu acompanhar?
```

Se o material de origem não permitir identificar qual resultado visual deve confirmar a ação, não invente. Liste isso em `Pendências`.

## Categorias

A trilha pode pertencer a mais de uma categoria da Central de Ajuda, por exemplo `comercial`, `financeiro` e `pedagogico`.

Quando a lista de **slugs de categorias existentes no F10** for fornecida explicitamente, use o campo opcional:

```json
"categories": ["comercial", "pedagogico"]
```

Regras:

- use somente slugs de categorias que tenham sido fornecidos ou confirmados como existentes;
- nunca invente uma categoria ou um slug;
- use no máximo 12 categorias;
- se não houver informação confiável sobre as categorias existentes, **omita o campo `categories`**;
- não use nomes livres como `Setor financeiro`, `Finanças` ou `Área Comercial` tentando adivinhar a taxonomia.

## Marcação de texto

`instruction`, `question` e `expectedResult` podem usar a marcação simples abaixo quando melhorar a leitura:

- `**texto**` para **negrito**;
- `` `texto` `` para destacar exatamente um botão, símbolo, campo ou opção da interface;
- linhas começando com `- ` para listas;
- quebras de linha para separar instruções curtas.

Exemplo:

```text
No menu lateral, clique em **Cadastros**.

Depois clique no botão `+`.
```

Use negrito para a ação ou seção importante e código para o texto exato de botões/símbolos. Não use HTML, links em Markdown, títulos Markdown ou outras sintaxes.

## Imagens

Formatos aceitos:

- PNG
- JPG/JPEG
- WEBP
- GIF

Use **no máximo uma imagem por passo**.

A imagem deve mostrar exatamente onde a pessoa precisa olhar ou clicar na página normal. Evite sequências de prints, galerias e carrosséis. Se duas imagens forem realmente necessárias para explicar duas ações diferentes, crie dois passos.

Prefira recortes ou prints em que o elemento importante esteja visualmente evidente. Quando possível, destaque no próprio material a região relevante com seta, contorno, círculo ou zoom. Não invente marcações que não correspondam ao print real fornecido.

Use `altText` com uma descrição simples do que está sendo mostrado.

Lembre-se: a imagem **não aparece no guia flutuante**. O texto do passo e a confirmação não podem depender dela para fazer sentido.

## Vídeos

Vídeo local deve:

- ser MP4;
- ter **no mínimo 30 segundos e no máximo 60 segundos**;
- ter até 25 MB.

Legenda `.vtt` não é obrigatória e não deve ser criada apenas para satisfazer o formato.

O vídeo é uma demonstração auxiliar, principalmente para o estado de recuperação quando a pessoa respondeu **Não** na confirmação. Não use vídeo como única forma de explicar um passo quando houver um print claro disponível.

Essa faixa de duração é obrigatória. Não corte uma demonstração em vídeos de poucos segundos apenas para transformar cada clique em uma etapa.

Se uma demonstração ficar com menos de 30 segundos, agrupe instruções consecutivas que façam parte da mesma ação até formar uma explicação coerente entre 30 e 60 segundos.

Se a demonstração ultrapassar 60 segundos, divida somente quando houver uma mudança real de objetivo ou outra ação independente.

Para vídeo externo, use URL HTTP/HTTPS. Mesmo quando o sistema não puder validar automaticamente sua duração, planeje a demonstração com a mesma faixa recomendada de 30 a 60 segundos.

Não use o mesmo caminho de arquivo como tipos diferentes.

## Exemplo de apresentação

```json
{
  "title": "Localize o menu principal",
  "interactionMode": "presentation",
  "instruction": "Observe o **menu no lado esquerdo** da tela.",
  "question": "Você está vendo o **menu principal** no lado esquerdo do F10?",
  "expectedResult": "O menu principal deve estar visível no lado esquerdo da tela.",
  "primaryActionLabel": "Já fiz esta etapa",
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
  "instruction": "No menu lateral, clique em **Cadastros**.\n\nDepois clique em `Usuários`.",
  "question": "A lista de **usuários** está aberta?",
  "expectedResult": "A lista de usuários deve estar visível na tela.",
  "primaryActionLabel": "Já fiz esta etapa",
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

Não invente dados quando o material de origem não for suficiente. Preserve a terminologia real encontrada nos arquivos fornecidos, mas reescreva as instruções para que uma pessoa sem conhecimento técnico consiga olhar, executar, confirmar o resultado e somente então avançar.
