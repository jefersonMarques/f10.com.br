import type { RequestHandler } from "./$types";
import { UNCATEGORIZED_HELP_CATEGORY_SLUG } from "$lib/help/helpCategoryConstants";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { listHelpCategories } from "$lib/server/help/helpCategoryRepository";

function categoryCatalog(
  categories: Awaited<ReturnType<typeof listHelpCategories>>,
): string {
  return categories
    .filter((category) => category.slug !== UNCATEGORIZED_HELP_CATEGORY_SLUG)
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
  const realCategories = categoryCatalog(categories);
  return `# F10 Help Import — criação de artigo a partir de vídeo e subtitles

Você receberá quatro materiais:

1. este prompt;
2. o arquivo \`f10-help-import-template.json\`;
3. o vídeo do F10;
4. os subtitles do vídeo do F10 (SRT, VTT ou texto equivalente).

Seu trabalho é transformar o conteúdo sustentado pelo vídeo e pelos subtitles em documentação operacional clara e estruturada para a Base de Conhecimento F10.

Além do JSON, extraia do próprio vídeo os screenshots das telas relevantes para o procedimento e organize toda a entrega em um único arquivo ZIP.

## Regra central

Não invente telas, menus, botões, permissões, regras, resultados, links ou comportamentos que não estejam sustentados pelos materiais fornecidos.

Os subtitles são a principal fonte textual. A interface visível no vídeo também pode confirmar nomes de telas, menus, campos, botões, estados e sequências quando isso estiver claramente legível.

Não transforme inferência em fato.

O texto público do artigo será a principal fonte de conhecimento do assistente. Não repita a mesma informação em campos adicionais.

## Entrega obrigatória em ZIP

A saída final deve ser um único arquivo ZIP com esta estrutura:

\`\`\`text
f10-help-import.zip
├── f10-help-import.json
└── screenshots/
    └── <article-slug>/
        ├── step-01-01.png
        ├── step-02-01.png
        └── ...
\`\`\`

Regras:

- o JSON final deve se chamar exatamente \`f10-help-import.json\` e ficar na raiz;
- todos os screenshots devem ficar dentro de \`screenshots/<article-slug>/\`;
- prefira PNG; JPG/JPEG e WebP também são aceitos;
- use nomes determinísticos em minúsculas seguindo \`step-NN-NN.ext\`;
- não inclua o vídeo original no ZIP;
- não inclua arquivos temporários ou screenshots não utilizados;
- todo \`assetPath\` do JSON deve existir exatamente dentro do ZIP;
- cada screenshot deve ser referenciado por um único bloco de imagem.

## Contrato JSON

Preencha exatamente o formato do template:

- \`format\`: \`f10-help-import\`;
- \`version\`: \`1\`;
- \`source\`: identificador curto e estável da origem;
- \`contents\`: um ou mais conteúdos.

Não acrescente campos fora do contrato.

Nenhum valor \`REPLACE_*\` pode permanecer na saída final. Se uma estrutura opcional não tiver informação real, remova-a em vez de inventar dados.

## Categorias

Use categorias reais quando o assunto do artigo corresponder com segurança a uma ou mais categorias abaixo:

${realCategories || "Nenhuma categoria editorial real está cadastrada neste momento."}

Se não for possível escolher uma categoria real com segurança, use somente:

- \`${UNCATEGORIZED_HELP_CATEGORY_SLUG}\` — categoria técnica temporária para criação do rascunho.

A categoria \`${UNCATEGORIZED_HELP_CATEGORY_SLUG}\` nunca é uma classificação final. O F10 permite importar o rascunho com ela, mas bloqueia a publicação até que um operador associe categorias reais e remova a categoria temporária.

Não crie novos slugs de categoria.

Em \`categories[].destinationUrl\`, deixe vazio por padrão. Só informe um link específico quando o material sustentar claramente que aquele artigo deve abrir uma área diferente do link padrão da categoria.

## Como transformar o vídeo e os subtitles

Reescreva fala espontânea em documentação objetiva, preservando significado e ordem operacional.

Use o vídeo para:

- confirmar a sequência visual do procedimento;
- identificar nomes claramente visíveis de telas, menus, campos e botões;
- identificar mudanças de tela relevantes;
- selecionar os melhores frames para screenshots de cada passo.

Quando um detalhe não estiver claro no vídeo nem nos subtitles, omita-o.

## Screenshots obrigatórios do vídeo

Ao receber o vídeo, percorra o procedimento e gere screenshots das telas que realmente ajudam o usuário a executar cada ação.

Capture preferencialmente:

- a tela inicial de uma etapa quando ela orienta onde o usuário está;
- a tela em que o botão, menu, campo ou opção relevante aparece;
- a tela após uma ação quando ela confirma que o usuário chegou ao local correto;
- estados, avisos ou resultados importantes para o procedimento.

Não:

- gere um print para cada fala ou intervalo de tempo;
- repita praticamente a mesma tela;
- use frames borrados ou em transição quando houver frame melhor;
- corte a interface de forma que o contexto necessário seja perdido;
- desenhe setas, círculos, textos ou elementos que não existam no vídeo;
- recrie artificialmente uma tela ausente do vídeo.

Use a menor quantidade de screenshots que deixe o procedimento visualmente claro.

Cada screenshot utilizado deve estar associado ao passo correto por um bloco \`image\` com \`assetPath\`:

\`\`\`json
{
  "type": "image",
  "assetPath": "screenshots/cadastrar-funcionario/step-02-01.png",
  "altText": "Tela de cadastro de funcionário",
  "assistantDescription": "O botão de inclusão aparece no canto superior direito da tela."
}
\`\`\`

\`altText\` identifica objetivamente a tela. \`assistantDescription\` deve conter apenas informação visual relevante que não esteja suficientemente clara no texto público.

## Estrutura do conteúdo

### title
Título claro e orientado à tarefa.

### slug
Slug estável e legível. Não use IDs aleatórios.

### summary
Resumo público curto do resultado do procedimento.

### categories
Uma ou mais categorias válidas. Use \`${UNCATEGORIZED_HELP_CATEGORY_SLUG}\` apenas quando não houver classificação real segura.

### searchAliases
Termos e sinônimos que usuários provavelmente pesquisariam. Servem somente para retrieval e não podem introduzir funcionalidades não documentadas.

### assistantKnowledge
Use somente para informação segura para o cliente que ajuda a responder dúvidas, mas que deixaria o artigo visualmente carregado. Se já estiver no texto público, deixe vazio.

### internalSupportNotes
Por padrão, deixe vazio. Só preencha quando o material identificar explicitamente uma informação como interna e inadequada para resposta ao cliente. Nunca coloque segredos, senhas, tokens ou dados pessoais.

## Vídeo principal

Quando o artigo estiver baseado no vídeo fornecido, preencha \`featuredVideo\`:

- \`url\`: URL real do vídeo;
- \`description\`: descrição pública curta;
- \`subtitles\`: subtitles integrais ou forma textual equivalente sem perda factual;
- \`assistantSummary\`: resumo operacional curto e opcional.

Se a URL real do vídeo não foi fornecida, não invente uma URL: informe ao operador que falta esse dado e não gere um pacote importável fictício.

Nunca crie bloco \`video\` dentro de \`steps[].blocks\`.

## Passos e blocos

Divida o procedimento em ações compreensíveis isoladamente. Cada passo precisa de título específico e pelo menos um bloco público.

Use somente os blocos:

- \`text\`;
- \`notice\`;
- \`link\`;
- \`image\`;
- \`file\`.

Para screenshots extraídos do vídeo, use \`assetPath\`, nunca uma URL externa.

Links e arquivos externos só podem ser incluídos quando uma URL HTTP/HTTPS real tiver sido fornecida nos materiais.

## Qualidade editorial

- O artigo deve continuar útil sem assistir ao vídeo.
- Os screenshots complementam o texto e não o substituem.
- Preserve nomenclaturas do F10 quando estiverem claras.
- Mantenha passos e screenshots na ordem do procedimento.
- Não crie etapas que não existam no vídeo/subtitles.
- Não marque conteúdo como publicado.
- Não mantenha placeholders, domínios fictícios ou URLs inventadas.
- Antes de gerar o ZIP, confirme que todos os \`assetPath\` existem e que não há screenshots sobrando.

## Saída

Entregue somente o arquivo ZIP final contendo:

1. \`f10-help-import.json\`;
2. a pasta \`screenshots/\` com todos e somente os prints utilizados pelo JSON.

Não entregue explicações fora do ZIP.
`;
}

export const GET: RequestHandler = async ({ cookies }) => {
  await requireAppPermission(cookies, "help.view", "/app/help/content/import");
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
