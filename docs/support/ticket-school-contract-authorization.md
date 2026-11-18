# Pessoas, escolas e contratos no atendimento F10

## Objetivo

A abertura manual de tickets apresenta o título, solicitante, contratos e
acompanhantes sem obrigar o operador a sair do fluxo para adicionar uma
autorização contratual. A API comercial continua sendo a fonte de contratos.

## Regras implementadas

- O nome visível prioriza apelido da escola na API/perfil ou no cadastro
  comercial reconciliado. Número comercial acompanha o nome.
- Contrato inativo permanece identificável, mas não pode ser selecionado
  para **novos** chamados ou concedido pela janela de gerenciamento.
- Um único contrato ativo já autorizado pode ser pré-selecionado. A
  pré-seleção não insere permissões no banco.
- Em múltiplos contratos, a seleção é explícita.
- Pessoas acompanhantes só aparecem na busca se têm acesso a **todos**
  os contratos selecionados. A gravação também valida novamente essa regra.
- O operador com `customers.manage` no escopo `all` e `tickets.create`
  pode conceder acesso a um contrato ativo a uma pessoa existente diretamente
  no formulário. O POST exige uma confirmação explícita e registra evento
  em `customer_contract_access_events`. O histórico da concessão inclui
  pessoa, contrato, ator e data.
- Vínculos removidos continuam sendo tratados na página de cadastro da
  pessoa, para não retirar acesso inesperadamente durante a criação.
- A criação de uma pessoa nova com contrato escolhido registra o mesmo
  evento de concessão.

## O que não é concedido automaticamente

O login F10 retorna grupos e unidades autorizadas. Esses identificadores
não equivalem necessariamente a `(unit_id, contract_id)` da API comercial.

O sistema **não concede** `customer_contract_access` ao fazer login só
porque nomes ou grupos são parecidos, nem converte escolas em pessoas
usando heurísticas pelo nome. Essa etapa exige comprovação de identificadores
canônicos no banco real e análise de permissão no portal.

A rotina preexistente `reconcileCustomerTickets()` em
`customerAuthService.ts`, que pode associar tickets por e-mail/telefone,
é independente desta migração. Ela exige revisão específica de segurança,
sem executar alterações silenciosas em tickets históricos.

## Verificação pós-deploy

A migração `0121_support_contract_access_audit.sql` cria a tabela de
eventos. O `npm run prod` aplica as migrações e atualiza a aplicação.

Auditoria somente leitura:

```bash
cd /opt/f10.com.br

node --env-file-if-exists=.env --env-file-if-exists=.env.production \
  scripts/audit-support-school-contract-access.mjs
```

Verificar manualmente:
1. Pessoa com um contrato ativo: pré-seleção correta.
2. Pessoa com dois ou mais: nenhum contrato selecionado sem escolha.
3. Pessoa sem contrato: gerenciamento administrativo no formulário.
4. Concessão manual: gravar uma única permissão e um evento.
5. Acompanhante sem acesso aos contratos selecionados: não aparece na busca.
6. Contrato inativo: sem concessão e com retorno claro.
7. Usuário sem `customers.manage:all`: não consegue conceder vínculo.
8. Login do cliente: nenhuma nova concessão automática e nenhum ticket
   histórico indevidamente liberado.

## Próxima etapa

Analisar os totais de identidades F10 sem acesso contratual, vínculos
ativos/inativos e mapeamentos de pessoa da API. Só então definir uma regra
de conciliação automática verificável, com testes de autorização do portal.
