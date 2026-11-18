# Evidências de chaves de identidade na API F10 em produção

Complemento às auditorias somente leitura de login, escola e contrato.

## Comando

Após incorporar o pull request na main:

```bash
cd /opt/f10.com.br
git pull --ff-only origin main

node --env-file-if-exists=.env --env-file-if-exists=.env.production \
  scripts/inspect-f10-live-identity-keys.mjs
```

Não exige `npm run prod`: só foram adicionados scripts de diagnóstico,
testes e documentação.

## Escopo e limites

O script utiliza apenas os endpoints de leitura que já existem no
repositório, com o `F10_API_BEARER_TOKEN` configurado no servidor:

- `GET /unidade/contratos/{F10_UID}` — somente a primeira página.
- `GET /unidade/pessoas/{F10_UID}/{pessoa_id}` — até um exemplo.
- `GET /unidade/pessoas/{F10_UID}/{titular_id}` — até um exemplo.

Os IDs da amostra vêm do cache local de contratos e não são impressos.
A consulta ao PostgreSQL ocorre em transação `READ ONLY`, com limite de
20 segundos para instruções SQL. HTTP usa `GET`, com limite de 8 MiB por
resposta, timeout de 20 segundos e intervalo entre chamadas.

O relatório `f10_live_identity_api_structure` informa a presença e o
tipo de campos reconhecidos: `contrato_id`, `pessoa_id`, `titular_id`,
`unidade_id`, `grupo_id`, `schema`, `cpf_cnpj` e outros identificadores.
Valores são descartados. Os documentos são validados em memória e
retornam apenas `cpf`, `cnpj`, `invalid` ou `missing`.

O JSON **não imprime** nomes, documentos, e-mails, URLs com tokens,
identificadores pessoais, esquema da escola, credenciais ou payload
bruto dos endpoints.

A amostra da primeira página não representa o catálogo completo,
e uma pessoa/titular não representa todos os perfis da API. Falhas dos
endpoints de pessoas são reportadas individualmente por códigos seguros.

## Interpretação

O backend de login usa `/adm/user/groups` e retorna `grupo_id`,
`unidade_id` e `schema`. A API comercial utiliza a unidade `F10_UID`
como contexto de contratos, e cada contrato tem `pessoa_id` e
`titular_id` independentes.

**Não presuma que `unidade_id` de login e `unit_id` da API referenciem
a mesma entidade**. Mesmo que um campo com nome semelhante apareça na
API, é necessária documentação de semântica e prova de equivalência
antes de conceder acesso a contratos.

O resultado poderá:
1. Confirmar que não existe chave de escola compartilhada nos campos
   disponíveis desses endpoints, indicando necessidade de documentação
   ou um endpoint oficial adicional.
2. Identificar nomes de campos candidatos cuja semântica deve ser
   validada antes de criar um mapeamento.
3. Comprovar se o detalhe de pessoa oferece CPF/CNPJ e identificadores
   relevantes, sem expor dados de clientes.

Nenhuma mesclagem automática, permissão, ticket ou sessão é alterada.
