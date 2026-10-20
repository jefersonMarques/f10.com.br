# Publicar artigos Movidesk sem imagens perdidas

A publicação em massa pode aceitar tutoriais com capturas antigas sem cópia local
(Freshdesk e outros servidores), **desde que haja conteúdo válido para leitura**.

- Em artigos `importSource=movidesk`, somente blocos de imagem com `storageKey`
  entram no snapshot público. Links redundantes para imagens omitidas também
  deixam de aparecer. Etapas que ficariam completamente vazias não são mostradas.
- As imagens ausentes e seus URLs originais **permanecem nos blocos do editor,
  no banco e no snapshot editorial/versionado** para eventual recuperação.
- As imagens copiadas continuam exibidas e submetidas à revisão humana real ou
  ao aceite administrativo em lote já registrado, com rastreabilidade.
- A aprovação normal individual permanece estrita; apenas a aprovação
  administrativa em lote pode autorizar a publicação com imagens faltantes.
- O validador mantém restrições de categoria, artigos vazios, texto, quantidade
  de imagens locais por etapa e exclusão dos materiais fora do plano público.
- Alertas **não relacionados à falta de imagens**, como HTML especial, anexos,
  elementos não importados e links de artigos sem resolução, seguem bloqueados.

A publicação não altera os rascunhos editoriais e não recupera automaticamente
as imagens perdidas. Quando a mídia voltar a estar disponível, é necessária
uma atualização/republicação controlada para incluí-la no snapshot público.

Depois do deploy, usar **Executar aprovação e publicação** uma única vez.
Não usar **Reprocessar artigos** nem reaplicar os ZIPs.
