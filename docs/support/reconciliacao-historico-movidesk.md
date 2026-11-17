# Reconciliação do histórico Movidesk

Este procedimento corrige a **visibilidade das ações**, a **identificação do solicitante** e a **lista de pessoas envolvidas** nos tickets já importados. Começar pelo ticket 42746.

O reprocessador utiliza o mesmo snapshot da importação original e os mapeamentos existentes no PostgreSQL. Não baixa novamente anexos, não recria tickets, não altera contratos, não altera atribuições atuais e não envia notificações.

## Pré-requisitos

- Projeto: `/opt/f10.com.br`
- Snapshot: `/var/lib/f10/movidesk-final-snapshot/tickets.jsonl`
- Variável de conexão `DATABASE_URL` disponível no ambiente do servidor
- Backup recuperável do PostgreSQL antes do comando com `--apply`

## Prévia — ticket 42746

```bash
cd /opt/f10.com.br
node --check scripts/reconcile-movidesk-ticket-history.mjs

node --env-file-if-exists=.env --env-file-if-exists=.env.production \
  scripts/reconcile-movidesk-ticket-history.mjs --ticket 42746
```

A prévia deve informar três ações originalmente públicas, duas internas, o cliente histórico, a empresa original e as pessoas envolvidas. Para os operadores, os campos `operatorMatches`, `alreadyLinkedOperators`, `readyToLinkOperators` e `unresolvedOperators` distinguem vínculos existentes, vínculos que serão criados e contas sem correspondência exata de e-mail. Candidatos encontrados apenas pelo nome aparecem em `nameCandidates`, sem vínculo automático. Os campos `actionAuthors` e `authorsReadyToLink` mostram as mensagens antigas que ainda podem receber um autor F10 confirmado por e-mail; `linkedMessageAuthors` informa quantas foram associadas após `--apply`. Ela também informa quantas mensagens públicas ainda precisam ser restauradas no banco.

`publicMessagesToRestore` pode ser inferior a três se a visibilidade já tiver sido corrigida.

## Aplicação controlada

```bash
node --env-file-if-exists=.env --env-file-if-exists=.env.production \
  scripts/reconcile-movidesk-ticket-history.mjs --ticket 42746 --apply
```

O comando:

1. Verifica os IDs das ações, os mapeamentos originais e a marca de proteção do portal.
2. Restaura a visibilidade **somente** das ações públicas ainda indevidamente internas.
3. Registra a identificação histórica do solicitante somente onde não há uma edição manual prévia.
4. Relaciona a organização original do Movidesk ao contato histórico usando o identificador de origem, sem vincular automaticamente contratos F10.
5. Complementa os participantes vinculados aos contatos Movidesk e usuários F10 identificados sem ambiguidade, e corrige a autoria histórica de mensagens que ainda ficaram como `system` quando há correspondência exata de e-mail.
6. Registra nomes, e-mails e papéis históricos em evento de auditoria para exibição na área do operador.

**Importante:** nenhuma mensagem originalmente interna será exposta. Mensagens originalmente públicas recebem o estado `public`, mantendo `portalAccessApproved=false`. Este comando não libera o histórico no portal, não cria usuários e não vincula contrato/unidade comercial por semelhança de nome.

Vínculos já feitos por operadores são preservados. O cliente comercial e contratos do F10 continuam sujeitos à seleção do operador.

## Conferência

Abra o ticket de origem 42746 no F10 e confira:

- Três ações públicas e duas internas, conforme o Movidesk.
- Solicitante e empresa histórica no quadro de dados do atendimento.
- Seção recolhível com os envolvidos no histórico.
- Identificação original dos autores das mensagens.
- Os 11 anexos PDF recuperados anteriormente.

A reexecução é idempotente: mensagens já restauradas, perfis existentes, participantes repetidos e eventos históricos já gravados são mantidos.

## Processamento em lotes

O ticket 42746 foi usado como piloto e está reconciliado. Antes do primeiro lote, confirme que os vínculos históricos estão corretos na interface.

Prévia dos primeiros 100 registros do snapshot, sem escrita no banco:

```bash
cd /opt/f10.com.br
node --env-file-if-exists=.env --env-file-if-exists=.env.production \
  scripts/reconcile-movidesk-ticket-history.mjs --all --limit 100
```

Após revisar o resumo, aplicar somente o primeiro lote:

```bash
node --env-file-if-exists=.env --env-file-if-exists=.env.production \
  scripts/reconcile-movidesk-ticket-history.mjs --all --limit 100 --apply
```

Para continuar a partir da posição 100, sem repetir os primeiros registros:

```bash
node --env-file-if-exists=.env --env-file-if-exists=.env.production \
  scripts/reconcile-movidesk-ticket-history.mjs --all --offset 100 --limit 100
```

O índice é baseado na posição do registro em `tickets.jsonl`, começando em zero, e não no número do ticket. O campo `nextOffset` indica a posição inicial do próximo lote. Não altere o snapshot enquanto estiver usando o mesmo índice de retomada.

Todos os tickets do lote são processados em transações separadas. Se um ticket falhar, a falha será informada com `state=failed` e os seguintes continuarão; o processo terminará com código 2 quando houver falhas. O resumo inclui quantidades de mensagens públicas a restaurar, operadores encontrados, autores a associar e erros.

A prévia usa transações de leitura. A aplicação atualiza somente o necessário e pode ser repetida. Contratos comerciais continuam vinculados manualmente. Não há notificações automáticas nem concessão de acesso ao portal.

Para executar um lote maior após validação, altere `--limit`; o padrão de `--all` é 100 registros.
