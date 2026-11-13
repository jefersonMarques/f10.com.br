# Clientes e contratos: API F10 como fonte principal

A visualização **Unidades** em `/app/customers?view=units` é uma lista de contratos.
O registro principal é `(unit_id, contract_id)` de `f10_customer_contracts`.
A consulta de listagem **não acessa a API externa**: usa a cópia local
atualizada pela sincronização já existente ou pelo botão **Atualizar**.

## Planilha é complemento

- `customer_units` fornece apelido, rede, plano, contatos comerciais e outros dados.
- Um contrato não precisa existir na planilha para aparecer na lista.
- O vínculo automático usa o ID F10 previamente reconciliado ou o
  `numero_contrato` somente quando ele é único na unidade da API.
- Se não houver correspondência confiável, o contrato aparece como
  **Sem complemento**, sem criar organização ou contato automaticamente.
- Os registros exclusivos da planilha permanecem no banco para conciliação.
- O status exibido e filtrado é o da API, não o da planilha.

## Botão Atualizar

- Disponível apenas a operadores com `customers.manage` no escopo `all`.
- Busca todas as páginas da API F10 usando a configuração `F10_UID` e
  `F10_API_BEARER_TOKEN` e **só depois** inicia a gravação.
- Insere em `f10_customer_contracts` exclusivamente contratos com
  `(unit_id, contract_id)` ainda não cadastrado. Contratos existentes não
  são sobrescritos, nem excluídos.
- Usa transação e lock de banco para não criar duplicidades sob concorrência.
- Retorna a quantidade de contratos novos. Não cria usuários, não muda
  permissões nem concede acesso aos clientes.
- Não substitui a sincronização completa de pessoas e dados da API em
  `/app/customers/sync`; nomes dependem de dados já sincronizados.

## Conferência em produção

Após o deploy, a lista deve mostrar o número de contratos já existentes
em `f10_customer_contracts` para a unidade configurada. Antes de pressionar
Atualizar, verificar se a interface exibe os 1.227 contratos registrados
na auditoria inicial. Depois da atualização, um novo contrato aumenta o
total; um segundo clique sem mudanças na API retorna zero registros.

Se os totais divergirem, não reimporte a planilha nem modifique vínculos
de contatos. Compare as contagens por `unit_id` e o estado do cache da API.

## Detalhes do contrato e tickets

- A listagem prioriza o nome comercial da planilha (`Aluno`) para o
  título, quando vinculado de modo inequívoco. Nome da pessoa, titular
  e apelido aparecem separadamente.
- O botão **Ver** abre modal com dados confirmados da API e complementos
  comerciais. A consulta de detalhe exige `customers.view` global e não
  envia o objeto bruto `source_record` ao navegador.
- Ao criar ticket, administradores com `customers.view` global podem
  selecionar diretamente um contrato da API, mesmo sem atendimento prévio.
- O servidor valida o contrato por `(unit_id, contract_id)` e cria ou
  reutiliza contato pela identidade F10; nunca combina pelo nome/e-mail.
- O vínculo do novo ticket é persistido em `ticket_f10_contract_links`
  (migração `0112`). Contextos de escola/grupo da aplicação antiga
  não são inventados quando ausentes na API.
- O contato associado fica sujeito às regras normais de acesso ao portal
  para tickets novos; não há alteração em tickets históricos.
- Após a migração e publicação, testar a pesquisa por `tex`, contrato 24,
  criação de ticket com seleção por API e abertura do modal de detalhes.

## Titular: responsável pelo contrato na API

- `titular_id` é uma pessoa independente de `pessoa_id`. Exemplo:
  contrato interno 639, número comercial 24, titular 3181
  `TEX CURSOS E TREINAMENTOS LTDA` e pessoa vinculada 3182
  `Robson Melo Gomes`.
- A origem da verdade é `GET /unidade/pessoas/<unit_id>/<titular_id>`.
- O cache `f10_customer_holder_profiles` (migração `0113`) mantém
  apenas dados de identificação, contato e endereço do titular, sem
  criar `customer_contacts`, usuários, organizações ou permissões.
- O worker de importações, já ativo no PM2 em produção, detecta
  `titular_id` ainda não sincronizados e os consulta em pequenos lotes,
  com nova tentativa espaçada, sem bloquear a listagem.
- O botão `Atualizar titular` no modal solicita o titular diretamente
  à API para o contrato escolhido. Requer `customers.manage` global.
- A listagem e a criação de ticket passam a pesquisar o nome
  confirmado do titular, e não só o e-mail da pessoa vinculada.
- `Cliente / empresa` e `Razão social` usam o nome do titular
  como pessoa jurídica somente quando o documento tiver 14 dígitos
  (CNPJ). Pessoas físicas continuam aparecendo como titulares,
  sem serem apresentadas como empresas.
- No ticket, `pessoa_id` continua sendo o contato operacional;
  `titular_id` não substitui automaticamente solicitante nem email
  de notificação. Titulares nunca são usados para consolidar
  outras pessoas por nome, domínio de email ou telefone.

### Teste pós-deploy

1. Abra o contrato comercial 24 (ID API 639) em Clientes > Ver.
2. Use `Atualizar titular` e verifique o nome do responsável e documento.
3. Pesquise `TEX CURSOS` na lista e em Tickets > Novo ticket.
4. Confira o nome `Robson Melo Gomes` como pessoa vinculada.
5. O worker processa os demais titulares, sem alterar os 1.227 contratos.
