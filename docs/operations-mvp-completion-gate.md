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

O banco deve possuir as migrations até `0017_remote_device_enrollment.sql`.

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
- a rota pública de asset retorna objeto somente quando ele pertence ao snapshot publicado daquele slug.

## 6. Configurações

Acesse `/app/settings` como Super Admin.

Valide:

- configurações gerais salvam no PostgreSQL;
- credenciais MinIO/OpenAI/MeshCentral não aparecem em HTML;
- status de OpenAI e chat são exibidos;
- teste de MinIO funciona;
- **Testar interface** confirma o endereço público do MeshCentral;
- **Testar integração** autentica via MeshCtrl e lista grupos;
- usuário sem `system.settings.manage` recebe bloqueio server-side.

## 7. MeshCentral em `/acesso-remoto/`

Configuração de produção:

```env
REMOTE_SUPPORT_PROVIDER=meshcentral
MESHCENTRAL_BASE_URL=https://f10.com.br/acesso-remoto/
MESHCENTRAL_DEVICE_URL_TEMPLATE=https://f10.com.br/acesso-remoto/?viewmode=13&gotonode={deviceId}

MESHCENTRAL_MESHCTRL_PATH=/opt/meshcentral/node_modules/meshcentral/meshctrl.js
MESHCENTRAL_CONTROL_URL=ws://127.0.0.1:4430/acesso-remoto/
MESHCENTRAL_CONTROL_USER=f10-operations
MESHCENTRAL_CONTROL_DOMAIN=acesso-remoto
MESHCENTRAL_CONTROL_LOGIN_KEY_FILE=/etc/f10/meshcentral-login.key
MESHCENTRAL_WINDOWS_AGENT_TYPE=4
MESHCENTRAL_DEVICE_CONSENT_FLAGS=8
REMOTE_ENROLLMENT_HOURS=24

OPERATIONS_DOCTOR_REQUIRE_REMOTE=true
```

Valide:

- `operations:doctor` exige login key file quando o gate remoto está habilitado;
- `/app/settings` mostra provider e integração automática como prontos;
- `/acesso-remoto/` abre pelo HTTPS do domínio principal;
- portas internas do MeshCentral não ficam expostas diretamente;
- o usuário técnico da integração não é o usuário administrador humano.

## 8. Primeiro atendimento — enrollment

Use um cliente que ainda não tenha dispositivo conhecido.

No ticket ou chat:

1. confirme que aparece **Instalar suporte remoto** / **Enviar instalador de Suporte Remoto F10**;
2. clique;
3. confirme evento `remote.enrollment.requested`;
4. confirme mensagem pública com `/suporte-remoto/instalar/:token`;
5. abra o link como cliente;
6. clique **Baixar Suporte Remoto F10**;
7. confirme que o download é o agente pertencente ao grupo daquele cliente;
8. instale no Windows;
9. volte ao ticket e clique **Verificar agora**;
10. confirme que o novo computador é descoberto automaticamente;
11. confirme `remote_devices` preenchido sem digitar Node ID;
12. confirme evento `remote.device.enrolled`;
13. confirme que o enrollment passa para `completed`.

Também teste:

- token expirado retorna indisponível;
- gerar novo enrollment cancela o anterior aberto do mesmo grupo;
- outro dispositivo já existente no grupo não é confundido com o novo graças ao baseline;
- organização com vários contatos reutiliza o mesmo grupo/dispositivos.

## 9. Atendimento recorrente

Com o agente já instalado:

1. abra novo chat/ticket do mesmo cliente;
2. confirme que o Operations reconhece o computador;
3. se estiver online, deve aparecer **Iniciar acesso remoto**;
4. se estiver offline, o botão deve permanecer indisponível;
5. ao iniciar, confirme evento `remote.requested` com `consentMode=meshcentral-local-prompt`;
6. confirme a mensagem pública orientando o cliente a aceitar no próprio computador;
7. o MeshCentral deve exibir o Desktop Prompt local;
8. recuse e confirme que o desktop não é liberado;
9. tente novamente e autorize;
10. confirme `remote.started` no Operations;
11. encerre o atendimento e confirme `remote.ended`.

O agente permanecer instalado não deve permitir desktop silencioso.

## 10. Comportamento do Chat

Valide os três estados:

```text
0 computadores online
→ Instalar suporte remoto

1 computador online
→ Iniciar acesso remoto

2+ computadores online
→ Escolher computador
```

O botão de primeiro uso precisa inserir o link de instalação na própria conversa.

## 11. Tela geral `/app/remote`

- não existe mais formulário normal para cadastrar Node ID;
- mostra sessões remotas;
- Super Admin/`remote.manage` vê computadores conhecidos;
- mostra online/offline e última conexão;
- mostra cliente/organização associados;
- usuário `remote.use=own` continua vendo apenas as próprias sessões.

## 12. Escopos

Teste usuários diferentes:

- `remote.request`: pode iniciar enrollment/acesso pelo ticket dentro do próprio escopo;
- `remote.use=own`: vê somente sessões solicitadas por si;
- `remote.use=all`: vê todas as sessões;
- `remote.manage`: recebe catálogo global dos dispositivos já reconhecidos;
- sem `remote.use`: `/app/remote` bloqueado;
- sem `system.settings.manage`: `/app/settings` bloqueado.

## 13. Segurança do enrollment

Confirme:

- token público não é salvo em texto puro;
- enrollment possui expiração;
- vínculo do dispositivo deriva do grupo exclusivo daquele cliente/organização;
- somente dispositivos daquele cliente podem ser iniciados no ticket;
- `MESHCENTRAL_CONTROL_LOGIN_KEY_FILE` fica fora do repositório;
- segredo não aparece na página Configurações;
- comando MeshCtrl é executado sem shell intermediário;
- Windows deve exibir consentimento local para o desktop;
- RDP/3389 não está aberto.

## 14. Critério de aceite

A tranche é aprovada quando:

- migrations, doctor, check, build e smoke passam;
- MinIO recebe e entrega arquivos;
- ZIP importa atomicamente;
- artigo público usa somente snapshot publicado;
- assets publicados não podem ser apagados;
- Configurações funciona sem expor secrets;
- `/acesso-remoto/` funciona no mesmo domínio;
- primeiro suporte entrega o instalador externamente pelo chat/ticket;
- agente instalado é associado automaticamente ao cliente;
- atendimento seguinte reconhece a máquina sem novo download;
- desktop remoto exige confirmação local do cliente;
- tickets registram enrollment, vínculo, início e fim;
- Movidesk e widget público atual permanecem sem cutover.
