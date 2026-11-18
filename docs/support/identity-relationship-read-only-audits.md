# Testes de relacionamento: login, cadastro manual e Movidesk

Esta auditoria investiga lacunas de identidade e autorização, **sem mesclar
pessoas, vincular escolas, conceder contratos ou liberar tickets no portal**.

Ela consulta apenas o PostgreSQL já sincronizado. Não precisa chamar a API
externa nem modificar as rotinas de importação e recuperação de anexos.

## Execução

No servidor F10, depois de atualizar somente os arquivos do GitHub:

```bash
cd /opt/f10.com.br
git pull --ff-only origin main

node --env-file-if-exists=.env --env-file-if-exists=.env.production \
  scripts/audit-support-identity-relationships.mjs --mode login

node --env-file-if-exists=.env --env-file-if-exists=.env.production \
  scripts/audit-support-identity-relationships.mjs --mode manual

node --env-file-if-exists=.env --env-file-if-exists=.env.production \
  scripts/audit-support-identity-relationships.mjs --mode movidesk
```

Todos os comandos estabelecem uma transação `READ ONLY` com timeout de
consulta de 60 segundos. Nenhuma conexão com API externa é feita. A
auditoria não imprime e-mails, documentos, nomes de pessoas, senhas,
tokens, hashes de sessão ou conteúdo de tickets.

## Interpretação

### Login F10

O JSON `identity_relationship_login_audit` mostra:
- quantas identidades efetivamente possuem snapshot recente de grupos;
- quantos grupos do login encontram grupo comercial importado;
- quantos contratos são **candidatos** por grupo (não autorização);
- quantas pessoas têm atribuições de escola registradas pelo operador;
- quantas atribuições referem contratos de fato existentes;
- quantos contratos constam também em `customer_contract_access`;
- quantas identidades estão associadas diretamente à pessoa da API F10.

Os exemplos usam referências irreversíveis `C-...` produzidas a partir do
UUID interno, não o e-mail ou o ID do usuário. Uma unidade listada pelo login
não equivale automaticamente ao `unit_id` da API de contratos.

### Cadastro manual

O JSON `identity_relationship_manual_audit` mostra:
- contatos comerciais e contatos históricos;
- concessões de contratos ativos e inativos;
- outros cadastros que compartilham o e-mail de login (sinal de possível
  duplicidade, nunca autorização para mesclar);
- atribuições manuais de escolas e vínculos com contratos da API;
- quantos titulares sincronizados apresentam documento com comprimento
  de CPF ou CNPJ (a contagem **não valida os dígitos verificadores**);
- quantas pessoas/titulares da API têm mais de um contrato.

### Movidesk

O JSON `identity_relationship_movidesk_audit` mostra:
- quantidade de tickets e contatos históricos já importados;
- quantidade de evidências de e-mail em ações com autoria de cliente;
- correspondências de e-mail únicas ou ambíguas com contatos atuais;
- potenciais correspondências com usuários que fizeram login F10.

**Atenção:** o importador histórico manteve muitos contatos sem e-mail;
a existência de e-mail no texto/metadata de uma mensagem é uma evidência
fraca e exige revisão. Não se associa nenhum ticket histórico
automaticamente com base nesse dado.

## Decisão após os resultados

1. Identidade F10 autenticada com o mesmo vínculo já comprovado pode ser
   reutilizada sem recriar pessoa.
2. Atribuição administrativa de escola e acesso contratual são verificados
   separadamente.
3. Correspondências apenas por grupo, nome ou e-mail vão para revisão.
4. O Movidesk é fonte de candidatos para conciliação supervisionada, nunca
   autorização automática de tickets históricos.
5. Antes de mudanças em produção, confirmar o modelo e os totais por origem.

A auditoria não identifica documentos CPF/CNPJ no cadastro geral da API
quando eles não foram sincronizados. Esse ponto depende de uma etapa
posterior de coleta e classificação de documentos de origem confiável.
