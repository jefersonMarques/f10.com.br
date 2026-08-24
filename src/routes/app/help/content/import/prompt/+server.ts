import type { RequestHandler } from "./$types";
import { UNCATEGORIZED_HELP_CATEGORY_SLUG } from "$lib/help/helpCategoryConstants";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { listHelpCategories } from "$lib/server/help/helpCategoryRepository";

function categoryCatalog(categories: Awaited<ReturnType<typeof listHelpCategories>>): string {
  return categories
    .filter((category) => category.slug !== UNCATEGORIZED_HELP_CATEGORY_SLUG)
    .map((category) => {
      const destination = category.destinationUrl ? ` | link padrão: ${category.destinationUrl}` : "";
      return `- ${category.slug} — ${category.name}${destination}\n  ${category.description || "Sem descrição adicional."}`;
    })
    .join("\n");
}

function buildPrompt(categories: Awaited<ReturnType<typeof listHelpCategories>>): string {
  const realCategories = categoryCatalog(categories);
  return `# F10 Help Import — criação de artigo a partir de vídeo e subtitles

Você receberá quatro materiais:

1. este prompt;
2. o arquivo \`f10-help-import-template.json\`;
3. o vídeo do F10;
4. os subtitles do vídeo do F10 (SRT, VTT ou texto equivalente).

Seu trabalho é transformar o conteúdo sustentado pelo vídeo e pelos subtitles em documentação operacional clara e estruturada para a Base de Conhecimento F10.

Além do JSON, extraia do próprio vídeo os screenshots das telas relevantes e entregue tudo em um único ZIP.

## Regras centrais

- Não invente telas, menus, botões, permissões, regras, resultados, links ou comportamentos.
- Os subtitles são a principal fonte textual.
- A interface visível no vídeo pode confirmar nomes de telas, menus, campos, botões, estados e sequências.
- Ícones visuais podem ter mudado entre a gravação e a versão atual do F10. Ao interpretar o vídeo, priorize sempre títulos, labels e textos visíveis; não transforme a aparência de um ícone em requisito do procedimento.
- Não transforme inferência em fato.
- O texto público do artigo é a principal fonte do assistente. Não duplique informação em campos adicionais.

## Identidade e reimportação

\`source\` e \`contents[].externalId\` formam a identidade estável da importação.

Mantenha ambos estáveis quando regenerar o mesmo artigo. Se o F10 receber novamente o mesmo \`source + externalId\`, a nova importação substituirá o rascunho anterior mantendo o mesmo conteúdo/ID.

Não gere um novo \`externalId\` só porque o texto, screenshots ou passos foram revisados.

## Entrega obrigatória em ZIP

A saída final deve ser:

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

- o JSON deve se chamar exatamente \`f10-help-import.json\` e ficar na raiz;
- screenshots ficam em \`screenshots/<article-slug>/\`;
- prefira PNG; JPG/JPEG e WebP também são aceitos;
- use nomes determinísticos como \`step-NN-NN.ext\`;
- não inclua o vídeo original, arquivos temporários ou screenshots não utilizados;
- todo \`assetPath\` precisa existir exatamente no ZIP;
- cada screenshot deve ser usado por um único bloco de imagem.

## Contrato JSON

Preencha exatamente o template:

- \`format\`: \`f10-help-import\`;
- \`version\`: \`1\`;
- \`source\`: identificador curto e estável;
- \`contents\`: um ou mais conteúdos.

Não acrescente campos fora do contrato. Nenhum \`REPLACE_*\` pode permanecer na saída.

## Categorias

Use categorias reais quando houver correspondência segura:

${realCategories || "Nenhuma categoria editorial real está cadastrada neste momento."}

Se não houver classificação segura, use somente \`${UNCATEGORIZED_HELP_CATEGORY_SLUG}\`.

Essa categoria é temporária: permite criar o rascunho, mas o F10 bloqueia publicação até um operador substituí-la por categorias reais.

Não invente categorias.

## Como transformar o vídeo e os subtitles

Reescreva fala espontânea em documentação objetiva, preservando significado e ordem operacional.

Use o vídeo para:

- confirmar a sequência do procedimento;
- identificar nomes claramente visíveis de telas, menus, campos e botões;
- identificar mudanças de tela relevantes;
- selecionar os melhores frames para screenshots.

Quando houver diferença entre o ícone mostrado no vídeo e a interface atual sugerida por outros materiais, descreva a ação pelo título/label textual, nunca pelo formato do ícone.

## Screenshots obrigatórios

Gere screenshots apenas quando ajudarem o usuário a localizar ou confirmar uma ação.

Capture preferencialmente:

- a tela inicial relevante;
- a tela em que o botão, menu, campo ou opção aparece;
- a tela após uma ação quando confirma o resultado;
- avisos ou estados importantes.

Não gere prints redundantes, borrados, em transição ou artificialmente anotados.

Cada screenshot usado deve virar um bloco \`image\` com \`assetPath\`:

\`\`\`json
{
  "type": "image",
  "assetPath": "screenshots/cadastrar-funcionario/step-02-01.png",
  "altText": "Tela de cadastro de funcionário",
  "assistantDescription": "O botão de inclusão aparece no canto superior direito da tela."
}
\`\`\`

## Resumo rápido obrigatório quando houver procedimento

Preencha \`quickGuide\` com uma versão curta e prática do procedimento, pensada para o usuário que talvez não precise abrir o passo a passo completo.

Use somente texto, emojis e o Markdown permitido abaixo. Não inclua imagens, HTML ou links inventados.

Exemplo:

\`\`\`text
🚀 **Passo 1:** Abra o F10 e faça login
👥 **Passo 2:** Entre em **Cadastros > Funcionários** e clique em **+**
📝 **Passo 3:** Preencha os dados obrigatórios
✅ **Passo 4:** Clique em **Salvar**
\`\`\`

O resumo deve ser curto, sequencial e suficiente para que muitos usuários consigam concluir a tarefa sem ler todos os detalhes.

## Markdown permitido nos textos públicos

Use Markdown apenas quando melhorar a leitura. O F10 suporta:

- \`**texto**\` para negrito;
- \`*texto*\` para itálico;
- \`\`código\`\` para nomes técnicos/comandos curtos;
- listas iniciadas por \`- \` ou \`• \`;
- linhas numeradas como \`1. \`, \`2. \`;
- emojis.

Use principalmente negrito para caminhos, botões, campos e ações importantes, por exemplo:

- \`Acesse **Cadastros > Funcionários**.\`
- \`Clique em **Salvar**.\`

Não use HTML, tabelas Markdown, headings com \`#\`, imagens Markdown ou links Markdown.

A formatação pode ser usada em \`quickGuide\`, \`steps[].description\`, blocos \`text\` e blocos \`notice\`.

## Estrutura do conteúdo

### title
Título claro e orientado à tarefa.

### slug
Slug estável e legível.

### summary
Resumo público curto do resultado do procedimento.

### quickGuide
Resumo operacional curto em texto/Markdown seguro, conforme as regras acima.

### categories
Uma ou mais categorias válidas. Use \`${UNCATEGORIZED_HELP_CATEGORY_SLUG}\` somente quando não houver classificação real segura.

### searchAliases
Termos e sinônimos que usuários provavelmente pesquisariam. Servem somente para retrieval.

### assistantKnowledge
Informação segura para o cliente que ajuda a responder dúvidas, mas que não precisa aparecer no artigo. Não repita o texto público.

### internalSupportNotes
Por padrão, vazio. Nunca coloque segredos, senhas, tokens ou dados pessoais.

## Vídeo principal

Quando o artigo vier do vídeo, preencha \`featuredVideo\` com URL real, descrição pública, subtitles e resumo operacional opcional.

Se a URL real não foi fornecida, não invente uma URL e não gere pacote importável fictício.

Nunca crie bloco \`video\` em \`steps[].blocks\`.

## Passos e blocos

Divida o procedimento em ações compreensíveis isoladamente. Cada passo precisa de título específico e pelo menos um bloco público.

Use somente: \`text\`, \`notice\`, \`link\`, \`image\`, \`file\`.

Para screenshots extraídos do vídeo, use \`assetPath\`, nunca URL externa.

## Qualidade editorial

- O artigo deve ser útil sem assistir ao vídeo.
- O \`quickGuide\` deve permitir resolver tarefas simples rapidamente.
- Screenshots complementam o texto e não o substituem.
- Use Markdown para destacar, não para decorar excessivamente.
- Preserve nomenclaturas do F10 quando estiverem claras.
- Mantenha passos e screenshots na ordem do procedimento.
- Não crie etapas ausentes dos materiais.
- Não marque conteúdo como publicado.
- Não mantenha placeholders, domínios fictícios ou URLs inventadas.
- Confirme que todos os \`assetPath\` existem e que não há screenshots sobrando.

## Saída

Entregue somente o ZIP final com \`f10-help-import.json\` e a pasta \`screenshots/\`. Não entregue explicações fora do ZIP.
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
