# Recuperação de anexos históricos do Movidesk

A importação registra os anexos e links originais, mas não traz os arquivos.
Esta rotina recupera os binários pelo hash de armazenamento do Movidesk,
salva-os no MinIO privado e associa-os aos tickets já importados.

O script trata **dois formatos distintos**: anexos estruturados em
`actions[].attachments` e links temporários `s3.amazonaws.com/movidesk-files/…`
inseridos nas mensagens e imagens do HTML histórico. URLs S3 expiradas são
substituídas por links internos **somente após a gravação do arquivo no MinIO**.
Imagens recuperadas são disponibilizadas na visualização da mensagem.

A rotina não recria tickets, mensagens, clientes, operadores nem muda status,
visibilidade pública/interna ou autorização do portal. A transcrição original
permanece preservada em `movidesk_chat_transcript_archives`, mesmo quando os
links das mensagens operacionais forem atualizados.

## Pré-requisitos

- Snapshot: `/var/lib/f10/movidesk-final-snapshot/tickets.jsonl` (não alterar)
- Projeto: `/opt/f10.com.br`
- Tabelas das migrações 0025 e 0103
- Variáveis: `DATABASE_URL`, `ASSET_STORAGE=s3`, `S3_ENDPOINT`, `S3_BUCKET`,
  `S3_ACCESS_KEY`, `S3_SECRET_KEY` e `MOVIDESK_KB_API_TOKEN` ou `MOVIDESK_API_TOKEN`
- Backup **recuperável** do PostgreSQL antes da primeira execução com escrita
- Bucket MinIO com capacidade disponível

## 1. Validar o exemplo com link vencido

O snapshot contém o arquivo “WhatsApp Image 2026-10-06 at 16.48.20.jpeg” no
ticket Movidesk **43030**.

Prévia sem operações de rede ou escritas:

```bash
cd /opt/f10.com.br
node scripts/recover-movidesk-ticket-attachments.mjs --ticket 43030
```

Após backup e conferência, executar o piloto:

```bash
node --env-file-if-exists=.env --env-file-if-exists=.env.production \
  scripts/recover-movidesk-ticket-attachments.mjs --ticket 43030 --apply
```

Validar no atendimento do F10: a mensagem deve mostrar um link interno
“Abrir arquivo” e a imagem deve estar acessível pela rota autenticada do
ticket. As mensagens reconstruídas do chat não devem ter URLs S3 para os
arquivos recuperados.

O ticket **42746**, testado anteriormente com 11 PDFs na primeira ação,
também contém imagem incorporada no HTML de outra ação. Reexecutar o piloto
42746 é idempotente e permite recuperar a imagem ausente:

```bash
node --env-file-if-exists=.env --env-file-if-exists=.env.production \
  scripts/recover-movidesk-ticket-attachments.mjs --ticket 42746 --apply
```

## 2. Validar um lote antes da execução completa

Primeiros 100 tickets do snapshot, **somente leitura**:

```bash
node scripts/recover-movidesk-ticket-attachments.mjs --all --limit 100
```

Os registros com anexos exibem `state=preview` com quantidades, sem
divulgar tokens ou URLs assinadas.

Aplicar o lote validado:

```bash
node --env-file-if-exists=.env --env-file-if-exists=.env.production \
  scripts/recover-movidesk-ticket-attachments.mjs --all --limit 100 --apply
```

## 3. Retomar e processar todo o histórico

As opções `--offset` e `--limit` usam a posição do registro em `tickets.jsonl`,
não o ID do ticket. Arquivos já registrados no banco são ignorados na execução
seguinte; os links são reconferidos. A execução percorre as linhas uma vez por
lote, sem carregar o snapshot inteiro na memória.

```bash
cd /opt/f10.com.br
umask 077

nohup node --env-file-if-exists=.env --env-file-if-exists=.env.production \
  scripts/recover-movidesk-ticket-attachments.mjs --all --apply \
  > /var/lib/f10/movidesk-final-snapshot/media-recovery.log 2>&1 \
  < /dev/null &

echo $!
```

Acompanhar sem interromper o processamento:

```bash
tail -f /var/lib/f10/movidesk-final-snapshot/media-recovery.log
```

Para processar somente a partir do registro 100:

```bash
node --env-file-if-exists=.env --env-file-if-exists=.env.production \
  scripts/recover-movidesk-ticket-attachments.mjs \
  --all --offset 100 --apply
```

Não executar duas instâncias simultâneas. Se houver falha de rede, consultar
a última posição informada em `nextOffset` e reexecutar desde ela, ou reiniciar
a rotina inteira para deixar que a checagem de anexos ignore os existentes.

## Integridade e limites

- Os downloads usam o endpoint oficial de armazenamento do Movidesk,
  identificado pelo hash, e não a assinatura S3 expirada.
- A origem deve ser um identificador hexadecimal de 32 caracteres.
- Downloads são limitados a 100 MB por arquivo. A leitura é por chunks,
  com limite de memória e cache LRU de até 64 MB.
- O limite de chamadas à API é de uma solicitação a cada 6,1 segundos,
  com tratamento de HTTP 429, `Retry-After` e erros temporários.
- Cada registro usa uma chave estável no MinIO e um vínculo em
  `ticket_message_attachments`. Anexos já vinculados não são baixados novamente.
- Apenas mensagens com origem Movidesk e IDs coincidentes podem ter os
  links alterados. Cada atualização exige que o corpo original ainda seja
  idêntico ao encontrado na leitura.
- Anexos de ações com IDs duplicados são ignorados e relatados para auditoria:
  esses conflitos históricos não podem ser resolvidos pela ordem do snapshot.
- Os novos links passam pelas rotas autenticadas de anexos e pelas
  permissões existentes. O acesso público não é liberado automaticamente.
- Falhas individuais aparecem como `state=failed`, e o comando retorna
  código 2 caso haja pendências. Tokens e URLs temporárias não são
  exibidos nos logs.

O processamento da reconciliação de mensagens e o da recuperação de arquivos
são independentes. Alterar o corpo para trocar uma URL não modifica a
visibilidade nem o registro da autoria.
