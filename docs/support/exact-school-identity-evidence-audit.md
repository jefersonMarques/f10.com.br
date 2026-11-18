# Auditoria de unidade do login, CPF/CNPJ e contratos

Este diagnóstico complementa os três testes de identidade existentes. Não
recria pessoas, escolas ou tickets, não concede acesso ao portal, não altera
contratos, nem consulta APIs externas.

## Execução

Depois de incorporar o PR à main:

```bash
cd /opt/f10.com.br
git pull --ff-only origin main

node --env-file-if-exists=.env --env-file-if-exists=.env.production \
  scripts/audit-exact-school-identity-relationships.mjs
```

Não é necessário executar `npm run prod`: apenas scripts de diagnóstico,
testes e documentação foram adicionados.

Um único JSON `exact_school_identity_relationship_audit` inclui três
seções:

- `loginUnits`: compara grupos do login com grupos comerciais usando
  o ID de grupo, e **nomes de unidade** com nomes de escola, dentro do
  mesmo grupo. Distingue nenhuma correspondência, uma organização comercial
  candidata e várias organizações ambíguas. Vários contratos da **mesma**
  organização não são classificados como duplicidade de escola.
- `legalDocuments`: valida dígitos verificadores de CPF e CNPJ numéricos
  em titulares sincronizados e organizações comerciais. Compara documentos
  válidos **somente** entre contratos e organizações vinculadas. Não imprime
  nenhum documento, nome, e-mail ou identificador externo.
- `contractCoverage`: quantifica contratos ativos/inativos, presença de
  vínculos para escolas comerciais, perfis, contratos múltiplos por pessoa
  da API e por organização comercial.

## Limite de identidade oficial

O login retorna `grupo_id`, `unidade_id` e `schema`. O cadastro comercial
`customer_units` não possui colunas equivalentes que armazenem
`unidade_id` e `schema` **do login**. Seu `f10_unit_id` identifica a
unidade configurada na API comercial; seu `source_id` é proveniente
da planilha, em geral o número comercial de contrato.

Portanto, `definitiveUnitIdMatches` será `null`: não há como confirmar
identidade por chave oficial com o esquema atual. Mesmo uma única escola com
nome coincidente dentro do grupo continua sendo **candidata à revisão**.
O script não tenta adivinhar vínculos por igualdade de IDs que pertencem
a domínios diferentes.

## Restrições dos documentos

CPF e CNPJ são classificados apenas quando numéricos e com dígitos
verificadores válidos. Um CNPJ válido do titular não significa que ele seja
a escola: `titular_id` e `pessoa_id` podem representar pessoas distintas.

Amostras por conta são limitadas a 12 registros pseudonimizados; nenhuma
amostra expõe IDs externos, e-mails, nomes, documentos, textos ou dados
de autenticação. Nenhuma autorização pode ser inferida somente por nome,
grupo ou CPF/CNPJ.

O script usa transação PostgreSQL `READ ONLY` com
`statement_timeout` de 60 segundos. Erros retornam apenas código SQL
controlado. A recuperação de anexos Movidesk pode permanecer executando.

## Próxima decisão

Após revisar o JSON, definir qual API ou tabela disponibiliza o
identificador canônico da escola para cruzar com `unidade_id` e `schema`
do login. Só depois disso classificar ligações como comprovadas e propor
uma migração com prévia, aprovação e auditoria.
