# Publicação em massa supervisionada — Movidesk

A aplicação de pacotes de revisão editorial **não aprova automaticamente os artigos**.
Os estados `needs_review` e `humanReview` continuam obrigatórios.

## Escopo inicial

O manifesto `src/lib/server/help/movideskPublicationPlan.ts` relaciona **18 coleções por assunto**, exclusivamente por IDs de origem do Movidesk. Mantém as coleções existentes com slugs `primeiros-passos` e `crm-e-whatsapp` sem substituir seus itens. Um artigo pode integrar várias coleções sem ser duplicado.

Ficam fora da publicação automática:
- Procedimentos internos de suporte e infraestrutura/legado;
- Instalação e suporte operacional até curadoria de informações potencialmente restritas;
- Artigos duplicados, mistos ou históricos identificados no manifesto (`119872`, `122943`, `122644`, `122653`, `166620`);
- Qualquer artigo sem aprovação editorial, com mídia externa não copiada, revisão humana de imagens ausente ou validações de publicação pendentes.

**Coleções não controlam acesso.** Não crie coleção pública por empresa sem uma solução de permissões por cliente.

## Fluxo de produção

1. Fazer deploy com migração `0091_help_movidesk_publication.sql`.
2. Acessar **Migração Movidesk → Publicação em massa**. Verificar quantidades de aprovados, pendentes e publicados.
3. Aprovar individualmente os artigos aptos no painel Movidesk; conferir visualmente todas as imagens e concluir a revisão humana no editor. Aplicar ZIP não substitui esses procedimentos.
4. Confirmar **Publicar aprovados**. A fila é persistida em `help_movidesk_publication_state` e executa um artigo por ciclo no processo `f10-help-video-worker`.
5. Cada artigo é reconferido imediatamente antes da publicação por `publishHelpKnowledgeContent`, o mesmo serviço da publicação individual. O resultado é registrado como publicado, já publicado ou bloqueado com causa.
6. Após a fila, o worker cria/atualiza coleções com os artigos **efetivamente publicados**, mantendo membros já existentes, sem tocar nas coleções internas. Também existe o botão **Organizar coleções** para sincronização independente, inclusive quando não houver artigos novos prontos.

A fila permite pausar, retomar e prosseguir após reinício do processo. O cursor só avança quando o artigo termina, e artigos publicados não são republicados após recuperação do worker. Falhas individuais não bloqueiam as seguintes. Uma falha na organização das coleções pausa a fase final para retomada posterior.

Não executar reprocessamento ou descarte dos rascunhos revisados. As fusões e desmembramentos de artigos serão feitos posteriormente com preservação dos IDs de mídias e redirecionamentos.
