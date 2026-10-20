# Aceite editorial em lote — Movidesk

A aprovação dos pacotes editoriais ZIP atualizou rascunhos, não a autorização de publicação. A fila de aprovação em lote permite aproveitar a revisão textual já aplicada sem exigir uma operação por artigo.

## Sequência

1. Acesse **Migração Movidesk** após o deploy. O painel mostrará o comando **Aprovar revisados em lote**.
2. Confirme a autorização administrativa. A operação não publica nada e não afirma que imagens foram individualmente inspecionadas.
3. O worker percorre os rascunhos do **manifesto público**. Cada um precisa ter origem Movidesk, nenhuma pendência de importação, categoria ativa, conteúdo válido e a mesma quantidade de imagens do HTML original, todas com `storageKey` no bucket F10. Mais de uma imagem por etapa ou texto incompleto bloqueia a aprovação.
4. Cada imagem recebe registro `movideskBulkEditorialAcceptance`, contendo o ID do ativo, quem autorizou, a versão do artigo e `visuallyReviewed: false`. **Não** grava `humanReview` falso. Um artigo ou ativo modificado após a aprovação perde automaticamente a validade do aceite.
5. Ao final, clique separadamente em **Publicar aprovados**. A publicação repete as validações. As coleções são atualizadas somente com artigos efetivamente publicados.

## Exclusões e cuidados

Os materiais internos, legados, duplicados e os artigos específicos fora do manifesto público não entram na fila. Capturas Freshdesk ausentes não são aceitas. Os bloqueados aparecem pelo motivo e permanecem em rascunho.

Pausar ou fechar a página não perde o cursor. A fila aceita retomada. **Não use Reprocessar artigos** após a revisão editorial.

A aprovação administrativa em lote é uma decisão do responsável pelo conteúdo e não substitui uma inspeção visual individual. Quando houver suspeita de imagem incorreta, dados sensíveis ou procedimento específico de cliente, mantenha o artigo fora do plano público ou faça revisão manual antes de publicá-lo.


## Correção da migração já revisada

O ZIP editorial atualiza o rascunho e conserva `help_movidesk_articles.needs_review`, portanto não indica publicação pendente de conteúdo editorial. No botão **Executar aprovação e publicação**, a fila agora passa por **um único artigo de cada vez**: se `needs_review` ainda estiver ativo, tenta sua aprovação administrativa, conferindo categorias, vínculo Movidesk, conteúdo e imagens antes de publicar. Não é necessário reiniciar a fila ou aprovar manualmente cada artigo.

Avisos antigos que informam apenas a preservação de um rascunho editado são reavaliados. Outros problemas de importação, imagens externas, falhas de validação ou exclusão do plano público permanecem bloqueados com motivo real; não são rotulados genericamente como `REVISAO_EDITORIAL_PENDENTE`.

Nenhuma aprovação nem publicação ocorre automaticamente no deploy. Uma confirmação no painel inicia a única passagem por todos os rascunhos públicos elegíveis.
