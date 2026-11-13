# Contratos, pessoas e tickets multicontrato

## Identificadores

- A fonte contratual é `f10_customer_contracts` (unidade da API + ID do contrato).
- `titular_id` é o responsável contratual; `pessoa_id` não é necessariamente
  solicitante ou usuário do sistema.
- Não há vínculo confiável de franquias na API. A planilha não concede acesso.
- `customer_contacts` identifica a pessoa atendida pelo suporte.
- `customer_contract_access` registra os contratos permitidos à pessoa
  **no suporte**, sem qualquer efeito em permissões operacionais do F10.

## Operação

- Clientes > Contratos apresenta o status ativo como filtro inicial,
  definido por `status = 1` e ausência de data de cancelamento.
  A confirmação definitiva dos códigos de situação deve ser feita com o
  mantenedor da API antes de alterar o critério.
- A página do contrato exibe o titular, a pessoa vinculada, dados comerciais
  e o número de tickets associados por `ticket_contract_links`.
- Clientes > Pessoas e contatos permite criar uma pessoa manual com e-mail
  e atribuir contratos. Dados de identidade autenticada são somente leitura.
- O atendimento manual exige solicitante e ao menos um contrato autorizado.
  Cadastro novo no próprio formulário requer `customers.manage` global.
- A seleção de contratos e de participantes é independente do solicitante.
  Cada acompanhante precisa ter acesso aos mesmos contratos; notificações
  ficam desligadas inicialmente.
- Ao acrescentar contratos ao ticket, acessos incompatíveis de acompanhantes
  são desativados. Unidades de grupos diferentes são permitidas.

## Compatibilidade

- A migração 0114 cria os relacionamentos e copia os vínculos da tabela
  `ticket_f10_contract_links`. Nenhum ticket histórico é apagado.
- Para compatibilidade, o primeiro contrato da seleção segue registrado
  em `ticket_f10_contract_links`.
- `customer_contact_merges` preserva origem/destino das mesclagens:
  somente um cadastro manual pode ser incorporado a outro manual ou
  a um cadastro autenticado. Dois logins distintos não são mesclados.
- O cadastro de origem é desativado, mas suas referências históricas
  permanecem no banco. A consulta do portal reconhece a relação de
  mesclagem e verifica a autorização contratual.
- Acesso do participante requer confirmação explícita do operador e
  compatibilidade com todos os contratos do ticket.
- Consultas de tickets legados sem o novo metadado de contratos continuam
  a seguir as regras anteriores.

## Verificações pós-publicação

1. Verificar migração 0114 e a contagem dos vínculos migrados.
2. Listar contratos ativos por padrão e testar filtro Todos.
3. Abrir a página do contrato comercial 24 e conferir indicadores.
4. Cadastrar pessoa manual, selecionar dois contratos de empresas diferentes,
   salvar e recarregar a página.
5. Criar ticket manual para a pessoa com dois contratos e um acompanhante.
6. Tentar adicionar contrato não autorizado e confirmar erro de validação.
7. Mesclar dois cadastros manuais, verificar o histórico e o acesso ao portal.
8. Repetir os testes com identidade de login para confirmar campos somente leitura.

As alterações devem ser validadas contra o esquema PostgreSQL de produção
antes de liberar o fluxo a todos os operadores.
