# Diagnóstico dos artigos Movidesk na IA

O assistente usa o conteúdo de `help_search_documents`, gerado automaticamente pelo gatilho
`help_publications_search_document_sync` na publicação dos artigos.

## Executar no servidor

O diagnóstico usa somente consultas `SELECT`, não publica, não reindexa e não altera artigos.

```bash
npm run help:diagnose
```

Por padrão, a amostra procura títulos e resumos contendo `matr` (matrícula e matrículas).
Para investigar outro assunto:

```bash
HELP_KNOWLEDGE_QUERY=rematricula npm run help:diagnose
```

O comando lê a variável `DATABASE_URL` do ambiente de execução e carrega os arquivos
`.env` e `.env.production` quando presentes. A saída JSON fica apenas no terminal.

## Interpretar os resultados

- `migrationApplied` e `publicationTriggerEnabled`: devem ser `true`.
- `imported`: total de conteúdos com `import_source = movidesk`.
- `drafts`: importados que ainda não foram publicados. Eles não alimentam a IA pública.
- `publicSnapshots`: conteúdos Movidesk com versão publicada.
- `indexedPublications`: publicações encontradas em `help_search_documents`.
- `missingSearchDocuments`: publicados sem índice de pesquisa; exige correção específica da sincronização.
- `invalidKnowledgeSnapshots`: publicados sem estrutura de conhecimento válida.
- `emptyIndexedContent`: índices sem texto público ou texto auxiliar.
- `relatedArticles`: amostra da pergunta investigada, com estado de publicação e quantidade de fragmentos.
- `missingIndex`: até 25 artigos publicados sem índice, para diagnóstico.

Se houver rascunhos, verificar as condições editoriais de publicação antes de publicá-los.
Se houver publicações sem índice, verificar o gatilho no banco e corrigir com procedimento controlado.
Não reprocessar os artigos importados nem republicar em massa apenas para corrigir a busca.

A existência de índices corretos não garante relevância do mecanismo de busca. Uma pergunta
pode recuperar itens inadequados, que não devem ser apresentados como sugestões sem filtragem.
