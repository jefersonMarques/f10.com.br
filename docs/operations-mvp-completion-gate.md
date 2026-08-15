# F10 Operations — Gate de conclusão do MVP

Este gate cobre MinIO/assets, publicação estruturada, Configurações e Acesso Remoto. Movidesk e o widget público atual devem permanecer inalterados durante a homologação.

## 1. Gate técnico

```bash
npm run db:migrate
npm run operations:doctor
npm run check
npm run build
```

Com a aplicação em execução:

```bash
npm run operations:smoke
```

O banco deve possuir as migrations até `0016_help_asset_delete_guard.sql`.

## 2. MinIO / S3

Configure no `.env`:

```env
ASSET_STORAGE=s3
S3_ENDPOINT=http://127.0.0.1:9000
S3_REGION=us-east-1
S3_BUCKET=f10-help
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
OPERATIONS_DOCTOR_REQUIRE_ASSET_STORAGE=true
```

Valide:

- `operations:doctor` reconhece storage configurado;
- `/app/settings` mostra MinIO/S3 configurado;
- **Testar conexão** grava e remove o objeto de health-check;
- `/app/help/assets` aceita PNG/JPEG/WebP/GIF e documentos permitidos;
- SVG/HTML/executáveis são rejeitados;
- upload do mesmo binário reutiliza o objeto por SHA-256;
- arquivo em uso não pode ser excluído;
- asset ainda referenciado por uma publicação não pode ser excluído, mesmo que tenha sido removido do rascunho atual.

## 3. Biblioteca → passo

Em `/app/help/assets`:

1. envie uma imagem;
2. escolha **Usar em um passo**;
3. selecione conteúdo e passo;
4. confirme que o conteúdo volta para rascunho;
5. abra o editor e confirme o bloco de imagem;
6. faça o mesmo com PDF/XLSX e confirme o bloco de arquivo;
7. publique novamente.

## 4. Importação ZIP

Monte:

```text
pacote.zip
├── manifest.json
└── assets/
    ├── tela.png
    └── modelo.xlsx
```

O manifest pode usar:

```json
{
  "type": "image",
  "file": "assets/tela.png",
  "altText": "Tela do sistema"
}
```

```json
{
  "type": "file",
  "file": "assets/modelo.xlsx",
  "label": "Baixar modelo"
}
```

Valide:

- todos os conteúdos entram como rascunho;
- arquivos são copiados ao MinIO;
- caminho `../`, ZIP criptografado, formatos não permitidos e limites excessivos são rejeitados;
- erro em qualquer parte impede conteúdo parcial;
- vídeos continuam por URL/YouTube.

## 5. Preview e artigo público

- `/app/help/content/:id/preview` mostra o rascunho atual;
- `/ajuda-f10/:slug` mostra somente o snapshot publicado;
- editar sem republicar não altera a página pública;
- o botão **Ver artigo** continua abrindo o slug da publicação anterior mesmo quando o slug do rascunho foi alterado;
- assets privados/rastreáveis não são expostos apenas por conhecer o UUID;
- a rota pública de asset retorna objeto somente quando ele pertence ao snapshot publicado daquele slug.

## 6. Configurações

Acesse `/app/settings` como Super Admin.

Valide:

- configurações gerais salvam no PostgreSQL;
- credenciais MinIO/OpenAI não aparecem em HTML;
- status de OpenAI e chat são exibidos;
- teste de MinIO funciona;
- status/teste de MeshCentral funciona após configuração;
- usuário sem `system.settings.manage` recebe bloqueio server-side.

## 7. MeshCentral

Configure:

```env
REMOTE_SUPPORT_PROVIDER=meshcentral
MESHCENTRAL_BASE_URL=https://remote.example.com
MESHCENTRAL_DEVICE_URL_TEMPLATE=https://remote.example.com/?viewmode=13&gotonode={deviceId}
OPERATIONS_DOCTOR_REQUIRE_REMOTE=true
```

Em `/app/remote` como Super Admin:

1. cadastre um node ID real do MeshCentral;
2. associe ao e-mail de um cliente já existente;
3. confirme que usuários sem `remote.manage` não recebem o catálogo global de dispositivos.

## 8. Consentimento remoto ponta a ponta

Em um ticket do mesmo cliente:

1. abra **Solicitar acesso remoto**;
2. selecione o computador;
3. confirme evento `remote.requested` e mensagem pública com link temporário;
4. abra `/suporte-remoto/:token` como cliente;
5. teste **Recusar** e confirme `remote.denied`;
6. gere outra solicitação e teste **Autorizar**;
7. confirme `remote.authorized`;
8. internamente, abra a sessão e clique **Iniciar acesso no MeshCentral**;
9. confirme que somente o primeiro start vence se duas abas tentarem iniciar simultaneamente;
10. confirme evento `remote.started`;
11. encerre e confirme `remote.ended`.

Uma solicitação expirada ou já respondida não pode ser autorizada novamente.

## 9. Escopos

Teste usuários diferentes:

- `remote.request`: pode solicitar pelo ticket dentro do próprio escopo;
- `remote.use=own`: vê somente sessões solicitadas por si na tela geral;
- `remote.use=all`: vê todas as sessões;
- `remote.manage`: vê/cadastra catálogo de dispositivos;
- sem `remote.use`: `/app/remote` bloqueado;
- sem `system.settings.manage`: `/app/settings` bloqueado.

## 10. Critério de aceite

A tranche é aprovada quando:

- migrations, doctor, check, build e smoke passam;
- MinIO recebe e entrega arquivos;
- ZIP importa atomicamente;
- artigo público usa somente snapshot publicado;
- assets publicados não podem ser apagados;
- Configurações funciona sem expor secrets;
- acesso remoto exige consentimento explícito;
- transições de consentimento/start/end são atômicas;
- MeshCentral só é aberto após autorização;
- tickets registram toda a trilha remota;
- Movidesk e widget público atual permanecem sem cutover.
