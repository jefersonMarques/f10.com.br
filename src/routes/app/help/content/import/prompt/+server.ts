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
- Cada passo do artigo pode possuir **no máximo um screenshot**. Se uma segunda tela for realmente necessária para explicar a sequência, crie outro passo específico.
- Para elementos literais da interface, prefira Markdown inline code: \`Cadastros > Funcionários\`, \`Salvar\`, \`E-mail\`, \`Ativo\`, \`F10-123\`. Use negrito para ênfase semântica, não como padrão para nomes de elementos da tela.

## Identidade e reimportação

\`source\` e \`contents[].externalId\` formam a identidade estável da importação.

Mantenha ambos estáveis quando regenerar o mesmo artigo. Se o F10 receber novamente o mesmo \`source + externalId\`, a nova importação substituirá o rascunho anterior mantendo o mesmo conteúdo/ID.

O F10 também tenta reconciliar uma reimportação pela combinação da mesma origem e do mesmo slug para evitar duplicidade quando uma IA variar o \`externalId\`. Mesmo assim, não dependa desse fallback: mantenha o \`externalId\` estável sempre que o conteúdo for o mesmo.

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
- use um screenshot por passo, com nome determinístico como \`step-NN-01.ext\`;
- não gere \`step-NN-02\`, \`step-NN-03\` etc.; quando uma segunda tela for necessária, crie um novo passo;
- não inclua o vídeo original, arquivos temporários ou screenshots não utilizados;
- todo \`assetPath\` precisa existir exatamente no ZIP;
- cada screenshot deve ser usado por um único bloco de imagem;
- cada \`steps[]\` pode conter **no máximo um bloco \`image\`**.

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
- selecionar o melhor frame de cada passo para screenshot.

Quando houver diferença entre o ícone mostrado no vídeo e a interface atual sugerida por outros materiais, descreva a ação pelo título/label textual, nunca pelo formato do ícone.

## Regras, obrigatoriedades, condições e exceções

Trate como **fatos prioritários** todas as regras explicitamente afirmadas no vídeo ou nos subtitles.

Dê atenção especial a expressões como:

- \`é obrigatório\`;
- \`precisa\` / \`deve\`;
- \`somente\`;
- \`se\` / \`caso\`;
- \`exceto\`;
- \`não pode\`;
- dependências entre um tipo de cadastro, permissão, status, campo ou ação e outro comportamento.

Regras obrigatórias:

- não descarte uma obrigatoriedade ou condição apenas porque ela não é uma ação de clique/preenchimento;
- não generalize condições. Se algo é obrigatório somente em uma situação, preserve exatamente essa condição;
- quando a regra for importante para o usuário executar o procedimento corretamente, coloque-a no texto público do passo correspondente;
- quando for segura para o cliente e útil para responder dúvidas, mas detalhada demais para o artigo, preserve-a em \`assistantKnowledge\`;
- não duplique em \`assistantKnowledge\` o que já estiver completo e inequívoco no texto público;
- preserve também o motivo quando ele for explicitamente informado e ajudar a compreender a regra.

Exemplo correto:

\`\`\`text
Se o funcionário também for \`Usuário\` e fizer login no F10, o campo \`E-mail\` é obrigatório e deve ser válido para receber o link de definição de senha.
\`\`\`

Exemplo incorreto, por generalizar a condição:

\`\`\`text
O campo \`E-mail\` é obrigatório para todo funcionário.
\`\`\`

Antes de finalizar o JSON, revise os subtitles procurando explicitamente por obrigatoriedades, condições, exceções e dependências e confirme que nenhuma delas foi perdida entre o vídeo e o artigo/\`assistantKnowledge\`.

## Screenshots obrigatórios

Gere screenshots apenas quando ajudarem o usuário a localizar ou confirmar uma ação.

Capture preferencialmente:

- a tela inicial relevante;
- a tela em que o botão, menu, campo ou opção aparece;
- a tela após uma ação quando confirma o resultado;
- avisos ou estados importantes.

**Escolha somente um desses frames por passo.** Se duas telas distintas forem indispensáveis, divida a explicação em dois passos, cada um com seu próprio screenshot.

### Regra de correspondência entre passo e screenshot

O screenshot precisa representar **exatamente a etapa à qual está associado**. Não escolha um frame apenas porque ele está cronologicamente próximo da fala.

Antes de usar um frame, confirme visualmente que a tela, modal, menu, campo, botão ou estado descrito naquele passo realmente aparece no frame escolhido.

Regras obrigatórias:

- prefira um frame estável imediatamente depois da ação ter sido concluída, quando o resultado visual já estiver carregado;
- quando a instrução ensina a localizar um elemento antes do clique, escolha um frame em que esse elemento esteja claramente visível;
- não use frames de carregamento, animação, transição, tela parcialmente atualizada ou com menu/modal de outra etapa;
- não use o frame anterior ou seguinte apenas para garantir que o passo tenha uma imagem;
- não reutilize o mesmo frame em passos diferentes;
- se nenhum frame disponível representar corretamente a etapa, **não gere screenshot para aquele passo**; é melhor deixar a etapa sem imagem do que associar uma imagem incorreta;
- o \`altText\` e o \`assistantDescription\` devem descrever o que está realmente visível no frame selecionado e funcionar como uma verificação adicional de coerência.

### Enquadramento obrigatório: tela inteira

O screenshot deve preservar a **tela inteira do F10 mostrada no vídeo**, e não apenas a área que será destacada.

Regras obrigatórias:

- mantenha menus, abas, títulos, barras e demais elementos do F10 necessários para o usuário reconhecer onde está;
- **não recorte somente o campo, botão, menu ou área de interesse**;
- **não aplique zoom ou crop para transformar o destaque na imagem inteira**;
- preserve o contexto visual ao redor da ação, mesmo quando apenas uma pequena região seja importante naquele passo;
- quando o vídeo mostrar o F10 dentro de um player ou desktop maior, capture toda a área útil do aplicativo F10; controles do player, bordas externas e partes do desktop sem relação com o procedimento não precisam ser incluídos;
- escolha um frame limpo, estável e legível, com a interface completa disponível naquele momento.

Os screenshots entregues no ZIP devem ser **limpos e sem marcações adicionadas**. Não desenhe números, retângulos, setas, círculos ou textos sobre o arquivo da imagem.

O F10 possui uma ferramenta editorial própria para adicionar posteriormente, sem alterar o screenshot original:

- marcação numerada;
- retângulo de destaque;
- seta;
- texto curto.

Portanto, nunca recorte a imagem para simular um destaque. Entregue a tela completa e deixe a marcação específica para a revisão editorial dentro do F10.

Não gere prints redundantes, borrados, em transição ou artificialmente anotados.

Cada screenshot usado deve virar o único bloco \`image\` daquele passo, com \`assetPath\`:

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
👥 **Passo 2:** Entre em \`Cadastros > Funcionários\` e clique em \`+\`
📝 **Passo 3:** Preencha os dados obrigatórios
✅ **Passo 4:** Clique em \`Salvar\`
\`\`\`

O resumo deve ser curto, sequencial e suficiente para que muitos usuários consigam concluir a tarefa sem ler todos os detalhes.

## Markdown permitido nos textos públicos

Use Markdown apenas quando melhorar a leitura. O F10 suporta:

- \`**texto**\` para negrito semântico;
- \`*texto*\` para itálico;
- \`\`código\`\` para elementos literais da interface, nomes técnicos, códigos e valores;
- listas iniciadas por \`- \` ou \`• \`;
- linhas numeradas como \`1. \`, \`2. \`;
- emojis.

### Preferência de apresentação

Quando estiver destacando algo que o usuário deve **ler, localizar, selecionar, preencher ou clicar exatamente como aparece na tela**, prefira inline code.

Exemplos preferidos:

- menu/caminho: \`Cadastros > Funcionários\`;
- botão: \`Salvar\`;
- campo: \`E-mail\`;
- status: \`Ativo\`;
- valor/código: \`12345\` ou \`F10-123\`.

Use negrito para chamar atenção para conceitos, alertas ou partes importantes da explicação, e não como formatação padrão dos controles da interface.

Para instruções operacionais, prefira listas numeradas em vez de juntar várias ações no mesmo parágrafo.

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
Informação segura para o cliente que ajuda a responder dúvidas, mas que não precisa aparecer no artigo. Preserve aqui obrigatoriedades, condições, exceções e dependências explícitas dos materiais quando elas forem úteis para responder dúvidas e não estiverem completas no texto público. Não repita o texto público.

### internalSupportNotes
Por padrão, vazio. Nunca coloque segredos, senhas, tokens ou dados pessoais.

## Vídeo principal

Quando o artigo vier do vídeo, preencha \`featuredVideo\` com URL real, descrição pública, subtitles e resumo operacional opcional.

Se a URL real não foi fornecida, não invente uma URL e não gere pacote importável fictício.

Nunca crie bloco \`video\` em \`steps[].blocks\`.

## Passos e blocos

Divida o procedimento em ações compreensíveis isoladamente. Cada passo precisa de título específico e pelo menos um bloco público.

Cada passo pode conter textos, avisos, links e arquivos conforme necessário, mas **no máximo um bloco \`image\`**.

Quando a mudança de tela justificar outro screenshot, encerre o passo atual e crie o próximo passo. Isso mantém uma relação clara entre instrução e imagem.

### Numeração obrigatória das ações dentro de cada etapa

Sempre que uma etapa contiver uma ou mais ações que o usuário precisa executar, escreva essas ações como uma **lista numerada explícita**.

Cada ação executável deve ocupar sua própria linha e receber seu próprio número.

Evite transformar duas ou mais ações em um único parágrafo corrido.

**Evite:**

\`\`\`text
Acesse \`Cadastros > Funcionários\`. Na tela de funcionários, use a ação de inclusão para criar um novo registro.
\`\`\`

**Prefira:**

\`\`\`text
**1.** Abra \`Cadastros > Funcionários\`.
**2.** Clique no botão de inclusão para criar um novo cadastro.

Nessa mesma área também ficam as ações de edição, exclusão e filtro.
\`\`\`

Regras:

- numere somente ações que o usuário deve executar;
- use \`**1.**\`, \`**2.**\`, \`**3.**\` e assim por diante;
- mantenha uma ação principal por número;
- se uma ação tiver uma consequência imediata simples, ela pode permanecer na mesma linha;
- informações complementares, contexto, observações ou recursos disponíveis na tela devem vir **depois da lista numerada**, em parágrafo separado e sem receber número;
- use inline code em caminhos, menus, botões, campos, status e valores relevantes dentro de cada item;
- preserve a ordem real mostrada no vídeo/subtitles;
- não crie números para ações que não estejam sustentadas pelos materiais.

Exemplo adicional:

\`\`\`text
**1.** Abra \`Financeiro > Contas a Receber\`.
**2.** Localize o lançamento desejado.
**3.** Clique em \`Editar\`.
**4.** Altere os dados necessários.
**5.** Clique em \`Salvar\`.

Use os filtros disponíveis na tela quando precisar localizar um lançamento específico.
\`\`\`

Essa regra vale principalmente para os blocos \`text\` que ensinam o procedimento e também deve orientar o \`quickGuide\`.

Use somente: \`text\`, \`notice\`, \`link\`, \`image\`, \`file\`.

Para screenshots extraídos do vídeo, use \`assetPath\`, nunca URL externa.

## Qualidade editorial

- O artigo deve ser útil sem assistir ao vídeo.
- O \`quickGuide\` deve permitir resolver tarefas simples rapidamente.
- Toda ação executável deve ser apresentada de forma numerada quando houver procedimento sequencial.
- Não concentre várias ações em um único parágrafo quando elas puderem ser separadas em passos numerados.
- Não perca obrigatoriedades, condições, exceções ou dependências explicitamente informadas nos subtitles.
- Não generalize uma regra que só vale sob determinada condição.
- Screenshots complementam o texto e não o substituem.
- Use no máximo um screenshot por passo; uma segunda tela relevante exige outro passo.
- Só associe screenshot quando o frame representar exatamente a etapa; na dúvida, deixe o passo sem imagem.
- Todo screenshot deve preservar a tela completa do F10 e contexto suficiente para orientação; nunca recorte apenas o elemento da ação.
- O screenshot original deve permanecer limpo; destaques visuais serão adicionados manualmente no editor do F10.
- Prefira inline code para elementos literais da interface e negrito para ênfase semântica.
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