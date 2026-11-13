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
