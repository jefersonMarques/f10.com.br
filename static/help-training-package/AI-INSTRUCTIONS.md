# Criar uma Trilha F10 com IA

Envie este arquivo para a IA junto com o material de origem: procedimentos, manuais, prints, vídeos ou transcrições.

## Tarefa

Transforme o material fornecido em um pacote importável de Trilha F10. Gere um `training.json` válido e organize o conteúdo em microações curtas. Cada passo deve mostrar somente a orientação necessária naquele momento.

## Regras

- Use `"formatVersion": 1`.
- Use `"accessMode": "invite_only"` por padrão; use `"public"` somente quando solicitado.
- Escreva em português do Brasil, com instruções curtas e objetivas.
- Não informe ao participante quantidade total de passos ou duração total.
- Use `interactionMode: "presentation"` quando a pessoa só precisa ler ou observar.
- Use `interactionMode: "action"` quando a pessoa precisa executar algo.
- Todo passo `action` deve possuir `expectedResult`.
- Não crie `failureReasons`. O F10 coleta o motivo de dificuldade com texto livre diretamente do participante e registra esse relato junto da pessoa e da microação.
- `successMessage` deve ser curta e não afirmar algo que não foi verificado. Exemplo: `Certo. Próxima orientação.`
- `estimatedSeconds` é somente informação interna e pode ser usado por passo.
- Referencie somente imagens e vídeos realmente fornecidos. Não invente nomes de arquivos, telas ou funcionalidades.
- Imagens aceitas: PNG, JPG/JPEG, WEBP e GIF.
- Vídeo local deve ser MP4, ter no máximo 60 segundos e possuir legenda WebVTT `.vtt`.
- Para vídeo externo, use URL HTTP/HTTPS.
- Não use o mesmo caminho de arquivo como tipos diferentes.

## Exemplo de apresentação

```json
{
  "title": "Antes de começar",
  "interactionMode": "presentation",
  "instruction": "Confira esta tela antes de continuar.",
  "successMessage": "Certo. Vamos continuar."
}
```

## Exemplo de ação

```json
{
  "title": "Abra o cadastro de clientes",
  "interactionMode": "action",
  "instruction": "No menu principal, abra Clientes.",
  "expectedResult": "A lista de clientes deve aparecer na tela.",
  "successMessage": "Certo. Próxima orientação.",
  "estimatedSeconds": 30,
  "images": [
    {
      "file": "images/clientes.png",
      "altText": "Menu Clientes destacado"
    }
  ],
  "video": {
    "file": "videos/clientes.mp4",
    "captions": "videos/clientes.vtt"
  }
}
```

## Estrutura do ZIP

```text
training.json
images/
  clientes.png
videos/
  clientes.mp4
  clientes.vtt
```

A raiz deve conter `training.json` ou `manifest.json`.

## Formato da resposta

Entregue nesta ordem:

1. conteúdo completo do `training.json` em um único bloco JSON válido;
2. árvore de arquivos esperada no ZIP;
3. conteúdo dos arquivos `.vtt` que puder gerar com fidelidade;
4. seção `Pendências` somente quando faltar informação indispensável.

Não invente dados quando o material de origem não for suficiente. Preserve a terminologia real encontrada nos arquivos fornecidos.
