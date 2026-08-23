import type { RequestHandler } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { listHelpCategories } from "$lib/server/help/helpCategoryRepository";

function categoryCatalog(
  categories: Awaited<ReturnType<typeof listHelpCategories>>,
): string {
  return categories
    .map((category) => {
      const destination = category.destinationUrl
        ? ` | link padrão: ${category.destinationUrl}`
        : "";
      return `- ${category.slug} — ${category.name}${destination}\n  ${category.description || "Sem descrição adicional."}`;
    })
    .join("\n");
}

function buildPrompt(
  categories: Awaited<ReturnType<typeof listHelpCategories>>,
): string {
  return `# F10 Help Import — criação de artigo a partir de subtitles

Você receberá três materiais:

1. este prompt;
2. o arquivo \`f10-help-import-template.json\`;
3. os subtitles de um vídeo do F10 (SRT, VTT ou texto equivalente).

Seu trabalho é transformar o conteúdo sustentado pelos subtitles em documentação operacional clara e estruturada para a Base de Conhecimento F10.

## Regra central

Não invente telas, menus, botões, permissões, regras, resultados, links ou comportamentos que não estejam sustentados pelos materiais fornecidos.

O texto público do artigo já será a principal fonte de conhecimento do assistente. Não repita o mesmo conteúdo em campos adicionais.

## Contrato obrigatório

Preencha exatamente o formato do arquivo JSON fornecido:

- \`format\`: \`f10-help-import\`;
- \`version\`: \`1\`;
- \`source\`: identificador curto e estável da origem;
- \`contents\`: um ou mais conteúdos.

Não acrescente campos fora do contrato.

## Categorias

Todo conteúdo precisa pertencer a pelo menos uma das categorias ativas abaixo. Use somente os slugs listados. Não crie categorias novas.

${categoryCatalog(categories) || "Nenhuma categoria ativa disponível. Não gere o JSON até que o F10 tenha ao menos uma categoria ativa."}

Em \`categories[].destinationUrl\`, deixe vazio por padrão. Só informe um link específico quando o material fornecido sustentar claramente que aquele artigo deve abrir outra área diferente do link padrão da categoria.

## Como transformar os subtitles

Os subtitles são a fonte factual principal do vídeo. Reescreva fala espontânea em documentação objetiva, preservando significado e ordem operacional.

Exemplo:

Fala: "agora entra ali em funcionários, clica no mais e coloca o nome"

Pode virar, se os próprios subtitles sustentarem esses nomes:

- Passo: "Abra o cadastro de funcionários";
- Texto: "Acesse Funcionários.";
- Passo seguinte: "Inicie um novo cadastro";
- Texto: "Clique no botão de inclusão e informe o nome.".

Não transforme inferência em fato. Quando um detalhe não estiver claro, omita-o.

## Estrutura do conteúdo

### title
Título claro, orientado à tarefa do usuário.

### slug
Slug estável e legível. Não use IDs aleatórios.

### summary
Resumo público curto do que o usuário conseguirá fazer.

### categories
Uma ou mais categorias válidas do catálogo acima.

### searchAliases
Termos e sinônimos que um usuário provavelmente pesquisaria para encontrar este conteúdo. Servem somente para retrieval.

Exemplos seguros de variação linguística: "funcionário", "colaborador", "novo funcionário" quando todos representam a mesma tarefa documentada.

Não use aliases para adicionar funcionalidades não mencionadas.

### assistantKnowledge
Use somente para informação segura para o cliente que ajuda a responder dúvidas, mas que deixaria o artigo visualmente carregado.

Exemplos: pré-requisito, permissão, exceção ou nomenclatura antiga explicitamente mencionados no material.

Se a informação já está no texto público, deixe este campo vazio.

### internalSupportNotes
Por padrão, deixe vazio. Só preencha quando o material fornecido identificar explicitamente uma informação como interna e inadequada para resposta ao cliente.

Nunca coloque senhas, tokens, dados pessoais ou segredos.

## Vídeo principal

Quando o artigo estiver baseado no vídeo fornecido, preencha \`featuredVideo\`:

- \`url\`: URL real do vídeo, se fornecida;
- \`description\`: descrição pública curta;
- \`subtitles\`: preserve os subtitles fornecidos integralmente ou em forma textual equivalente sem perder conteúdo factual;
- \`assistantSummary\`: resumo operacional curto do vídeo, sem inventar informação.

Se houver \`featuredVideo\`, \`subtitles\` é obrigatório.

Nunca crie bloco \`video\` dentro de \`steps[].blocks\`.

## Passos

Divida o procedimento em ações compreensíveis isoladamente.

Cada passo precisa de:

- \`title\` específico;
- \`description\` pública opcional;
- \`assistantKnowledge\` somente quando houver conhecimento adicional não repetido;
- ao menos um bloco público.

Evite títulos como "Continuar", "Próximo" ou "Passo seguinte".

## Blocos

Use somente:

- \`text\`;
- \`notice\`;
- \`link\`;
- \`image\`;
- \`file\`.

### text
Use para instrução pública.

### notice
Use somente para informação, atenção, sucesso ou perigo realmente sustentados pelo material.

### link
Use somente URL real fornecida nos materiais. Não invente links.

### image
Só inclua quando houver URL HTTP/HTTPS real fornecida. \`altText\` identifica a imagem; \`assistantDescription\` explica informação visual relevante que não esteja no texto.

### file
Só inclua quando houver URL HTTP/HTTPS real fornecida. \`extractedText\` deve conter apenas texto efetivamente extraído/fornecido. \`assistantSummary\` é opcional.

## Qualidade editorial

- O artigo deve ser útil mesmo sem o vídeo.
- O texto público é a fonte principal do assistente.
- Não duplique conteúdo em \`assistantKnowledge\`.
- Não escreva para "a IA"; escreva conhecimento factual.
- Preserve nomenclaturas do F10 quando estiverem claras.
- Mantenha passos na ordem do procedimento.
- Não crie etapas que não existam nos subtitles.
- Não marque conteúdo como publicado.

## Saída

Entregue somente um arquivo JSON válido conforme \`f10-help-import-template.json\`, sem explicações fora do JSON.
`;
}

export const GET: RequestHandler = async ({ cookies }) => {
  await requireAppPermission(
    cookies,
    "help.view",
    "/app/help/content/import",
  );
  const categories = await listHelpCategories(true);
  const prompt = buildPrompt(categories);

  return new Response(prompt, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": 'attachment; filename="f10-help-import-prompt.md"',
      "cache-control": "no-store",
    },
  });
};
