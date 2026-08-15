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

O banco deve possuir as migrations até `0019_remote_embedded_sessions.sql`.

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

Configuração de produção para a topologia atual, com Nginx Proxy Manager em Docker e MeshCentral no host:

```env
REMOTE_SUPPORT_PROVIDER=meshcentral
MESHCENTRAL_BASE_URL=https://f10.com.br/acesso-remoto/

MESHCENTRAL_MESHCTRL_PATH=/opt/meshcentral/node_modules/meshcentral/meshctrl.js
MESHCENTRAL_CONTROL_URL=ws://172.17.0.1:4430/acesso-remoto/
MESHCENTRAL_CONTROL_USER=f10-operations
MESHCENTRAL_CONTROL_DOMAIN=acesso-remoto
MESHCENTRAL_CONTROL_LOGIN_KEY_FILE=
MESHCENTRAL_CONTROL_PASSWORD=...
MESHCENTRAL_WINDOWS_AGENT_TYPE=4
MESHCENTRAL_DEVICE_CONSENT_FLAGS=8
MESHCENTRAL_SHARE_MINUTES=30
REMOTE_ENROLLMENT_HOURS=24

OPERATIONS_DOCTOR_REQUIRE_REMOTE=true
```

O domínio `acesso-remoto` do MeshCentral deve limitar guest sharing a 60 minutos e permitir framing somente pelo domínio F10. A resposta HTTP deve conter `frame-ancestors 'self' https://f10.com.br`.

Valide:

- `operations:doctor` aceita credencial técnica configurada por password ou login key;
- `/app/settings` mostra provider, integração automática e duração do compartilhamento;
- `/acesso-remoto/` abre pelo HTTPS do domínio principal;
- `172.17.0.1:4430` é alcançável pelo Nginx Proxy Manager, mas não fica exposto na interface pública da VPS;
- WebSocket do MeshCentral funciona pelo caminho `/acesso-remoto/`;
- o usuário `f10-operations` possui `siteadmin: 0`;
- o usuário técnico enxerga e controla somente grupos aos quais recebeu direito ou que criou;
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
7. confirme que o arquivo recebido se chama `F10-Suporte-Remoto.exe` e pertence ao grupo daquele cliente;
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

## 9. Atendimento recorrente e desktop embutido

Com o agente já instalado:

1. abra novo chat/ticket do mesmo cliente;
2. confirme que o Operations reconhece o computador;
3. se estiver online, deve aparecer **Iniciar acesso remoto**;
4. se já for conhecido mas estiver offline, o chat deve mostrar **Computador offline**, e não sugerir nova instalação;
5. solicite o acesso e conclua a autorização do fluxo F10;
6. na sessão, clique **Iniciar acesso remoto**;
7. confirme que o Operations cria `DeviceSharing` temporário somente com `desktop` e `prompt`;
8. confirme que o desktop aparece dentro de `/app/remote/:sessionId`, sem abrir o painel MeshCentral em outra aba;
9. o Windows deve exibir o Desktop Prompt local;
10. recuse e confirme que o desktop não é liberado;
11. tente novamente e autorize;
12. valide mouse, teclado, resolução e tela cheia;
13. confirme `remote.started` no Operations;
14. atualize a página e use **Reconectar desktop**; o share anterior deve ser revogado antes de criar outro;
15. encerre o atendimento e confirme que o share atual é revogado e o evento `remote.ended` é registrado.

O agente permanecer instalado não deve permitir desktop silencioso. O link `DeviceSharing` não deve ser persistido no banco; apenas o identificador do share e sua expiração são persistidos.

## 10. Comportamento do Chat

Valide os estados:

```text
nenhum computador conhecido
→ Instalar suporte remoto

1 computador online
→ Iniciar acesso remoto

2+ computadores online
→ Escolher computador

computador conhecido, porém offline
→ Computador offline
```

O botão de primeiro uso precisa inserir o link de instalação na própria conversa e o preview do cliente precisa renderizar **Baixar Suporte Remoto F10** como ação clicável.

## 11. Tela geral `/app/remote`

- não existe mais formulário normal para cadastrar Node ID;
- mostra sessões remotas;
- Super Admin/`remote.manage` vê computadores conhecidos;
- mostra online/offline e última conexão;
- mostra cliente/organização associados;
- usuário `remote.use=own` continua vendo apenas as próprias sessões;
- `remote.manage` vê os indicadores de SLA dos últimos 30 dias;
- SLA separa tempo do cliente para autorizar do tempo do atendente para iniciar;
- por atendente, ficam disponíveis volume iniciado/concluído, média/P90 de pickup e duração média.

## 12. Escopos

Teste usuários diferentes:

- `remote.request`: pode gerar enrollment, enviar o instalador e sincronizar computadores no ticket dentro do próprio escopo;
- `remote.use=own`: pode abrir o desktop somente das próprias sessões elegíveis e vê somente sessões solicitadas por si;
- `remote.use=all`: pode abrir e visualizar todas as sessões elegíveis;
- `remote.manage`: recebe catálogo global dos dispositivos já reconhecidos e visão agregada de SLA;
- usuário com `remote.request` mas sem `remote.use` consegue enviar o instalador, porém não iniciar o desktop;
- sem `remote.use`: `/app/remote` bloqueado;
- sem `system.settings.manage`: `/app/settings` bloqueado.

## 13. Segurança do enrollment e da sessão

Confirme:

- token público de enrollment/consentimento não é salvo em texto puro;
- enrollment possui expiração;
- vínculo do dispositivo deriva do grupo exclusivo daquele cliente/organização;
- somente dispositivos daquele cliente podem ser iniciados no ticket;
- credencial `f10-operations` permanece fora do repositório;
- segredo não aparece na página Configurações;
- comando MeshCtrl é executado com `execFile`, sem shell intermediário;
- URL secreta de `DeviceSharing` não é gravada no PostgreSQL nem em eventos/auditoria;
- `provider_session_id` guarda somente o identificador revogável do share;
- cada reconexão revoga o share anterior antes de criar outro;
- encerramento revoga o share antes de marcar a sessão como encerrada;
- download do agente é obtido pela interface do MeshCentral e entregue ao cliente pelo Operations;
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
- desktop remoto é exibido dentro do F10 Operations;
- atendente não precisa de conta ou painel MeshCentral;
- desktop remoto exige confirmação local do cliente;
- share temporário expira e pode ser revogado;
- tickets registram enrollment, vínculo, início, reconexão e fim;
- SLA remoto atribui início/fim aos atendentes corretos;
- Movidesk e widget público atual permanecem sem cutover.
