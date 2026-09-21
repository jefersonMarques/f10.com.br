# Acesso remoto — F10 Operations + MeshCentral

O componente de acesso remoto é **externo ao Software F10**. Ele não faz parte do instalador nem do updater do F10. O cliente só recebe o componente quando um atendimento realmente precisa de acesso remoto.

Depois da primeira instalação, o agente pode permanecer no Windows para facilitar atendimentos futuros. O Operations reconhece o computador automaticamente e permite iniciar uma nova solicitação sem novo download. O acesso ao desktop continua dependendo da confirmação local exibida pelo MeshCentral no computador do cliente.

## Arquitetura

```text
Primeiro atendimento

Chat / Ticket F10
   ↓
Enviar instalador de Suporte Remoto F10
   ↓
/suporte-remoto/instalar/:token
   ↓
F10 entrega F10-Suporte-Remoto.exe
   ↓
Agente MeshCentral específico do grupo do cliente
   ↓
Cliente instala
   ↓
MeshCentral registra o dispositivo
   ↓
Operations sincroniza e vincula automaticamente
```

Nos próximos atendimentos:

```text
Cliente identificado
   ↓
Computador conhecido
   ├─ Online  → Iniciar acesso remoto
   └─ Offline → informar que o computador precisa estar ligado
                    ↓
             MeshCentral Desktop Prompt
                    ↓
              cliente confirma
                    ↓
               desktop remoto
```

O agente é uma ferramenta de suporte separada. Portanto esse fluxo funciona inclusive quando o chamado existe justamente porque o cliente ainda não conseguiu instalar o Software F10.

## Endereço público

O endereço adotado é:

```text
https://f10.com.br/acesso-remoto/
```

Não é necessário criar subdomínio. O Nginx encaminha somente `/acesso-remoto/` para o MeshCentral e preserva WebSocket.

O provider do Operations também valida que URLs de lançamento permaneçam dentro desse mesmo origin e caminho-base.

## Modelo de associação automática

O Operations cria um grupo de dispositivos do MeshCentral por organização. Quando não existe organização, cria por contato.

Exemplos internos:

```text
F10-ORG-aabbccddeeff...
F10-CONTATO-aabbccddeeff...
```

O nome é técnico e não depende do nome comercial do cliente, evitando colisões quando escolas possuem nomes iguais.

O grupo só é criado quando alguém realmente solicita a instalação do suporte remoto. Abrir um chat ou ticket não cria grupos vazios no MeshCentral.

Quando o atendente escolhe **Enviar instalador de Suporte Remoto F10**:

1. o Operations resolve ou cria o grupo daquele cliente no MeshCentral;
2. registra quais dispositivos já existiam naquele grupo;
3. cria um enrollment temporário e armazena somente SHA-256 do token público;
4. envia `/suporte-remoto/instalar/:token` na conversa;
5. o Operations busca o agente diretamente pela interface local do MeshCentral e o entrega ao navegador como `F10-Suporte-Remoto.exe`;
6. depois da instalação, o Operations consulta o grupo;
7. o novo `nodeId` que não existia no baseline é identificado;
8. `remote_devices` é preenchido automaticamente;
9. o enrollment fica `completed`;
10. o ticket recebe `remote.device.enrolled`.

O cadastro manual de Node ID não faz mais parte do fluxo normal.

Quando existe organização, o dispositivo fica associado à organização, e não ao último contato que abriu atendimento. Assim diferentes usuários da mesma escola reutilizam corretamente os computadores daquela organização.

## Agente persistente e consentimento

O download inicial usa o agente Windows do MeshCentral com `installflags=2`, ou seja, o fluxo de background/install é usado para permitir instalação persistente.

O grupo criado pelo Operations usa por padrão:

```text
MESHCENTRAL_DEVICE_CONSENT_FLAGS=8
```

Esse valor corresponde ao **Desktop Prompt** na configuração de consentimento usada pelo MeshCentral. Assim, ter o agente instalado e online não significa que a equipe F10 pode abrir silenciosamente o desktop.

A experiência desejada é:

```text
Atendente clica em "Iniciar acesso remoto"
   ↓
Operations registra remote.requested
   ↓
MeshCentral abre o dispositivo
   ↓
Computador do cliente mostra confirmação local
   ↓
cliente autoriza
   ↓
sessão ocorre
```

A confirmação local é a autorização efetiva do desktop. O estado `authorized` criado pelo Operations antes do lançamento significa que o dispositivo está elegível tecnicamente para abrir o provider; não substitui o prompt local do MeshCentral.

## Integração via MeshCtrl

O Operations usa o `meshctrl.js` fornecido pelo próprio MeshCentral para:

- listar grupos;
- criar o grupo do cliente;
- listar dispositivos;
- identificar online/offline;
- construir o download de agente para aquele grupo.

O processo é executado com `execFile`, sem shell intermediário.

O identificador completo retornado pelo MeshCentral continua armazenado no banco para sincronização/deduplicação. Para `gotonode`, o provider extrai somente o Node ID necessário pela interface web.

### Credencial

Em produção prefira um **login key file** dedicado à integração. O fallback por senha existe para homologação, mas a senha precisaria ser passada ao processo filho e é menos adequado para produção.

O gate de produção (`OPERATIONS_DOCTOR_REQUIRE_REMOTE=true`) exige `MESHCENTRAL_CONTROL_LOGIN_KEY_FILE` existente.

## `.env` do F10

```env
REMOTE_SUPPORT_PROVIDER=meshcentral
MESHCENTRAL_BASE_URL=https://f10.com.br/acesso-remoto/
MESHCENTRAL_DEVICE_URL_TEMPLATE=https://f10.com.br/acesso-remoto/?viewmode=13&gotonode={deviceId}

MESHCENTRAL_MESHCTRL_PATH=/opt/meshcentral/node_modules/meshcentral/meshctrl.js
MESHCENTRAL_CONTROL_URL=ws://127.0.0.1:4430/acesso-remoto/
MESHCENTRAL_CONTROL_USER=f10-operations
MESHCENTRAL_CONTROL_DOMAIN=acesso-remoto
MESHCENTRAL_CONTROL_LOGIN_KEY_FILE=/etc/f10/meshcentral-login.key
MESHCENTRAL_CONTROL_PASSWORD=
MESHCENTRAL_WINDOWS_AGENT_TYPE=4
MESHCENTRAL_DEVICE_CONSENT_FLAGS=8
REMOTE_ENROLLMENT_HOURS=24

OPERATIONS_DOCTOR_REQUIRE_REMOTE=true
```

Não versionar a login key, senha ou qualquer outra credencial real.

## Configuração conceitual do MeshCentral

A porta interna é apenas um exemplo. Confirme as opções contra o schema e exemplos da versão efetivamente instalada antes de reiniciar o serviço.

```json
{
  "$schema": "https://raw.githubusercontent.com/Ylianst/MeshCentral/master/meshcentral-config-schema.json",
  "settings": {
    "cert": "f10.com.br",
    "WANonly": true,
    "port": 4430,
    "aliasPort": 443,
    "TLSOffload": "127.0.0.1",
    "trustedProxy": "127.0.0.1"
  },
  "domains": {
    "acesso-remoto": {
      "title": "F10 Acesso Remoto",
      "newAccounts": false,
      "userNameIsEmail": true,
      "certUrl": "https://f10.com.br/"
    }
  }
}
```

Crie um usuário técnico `f10-operations` com somente os direitos necessários para os grupos/dispositivos utilizados pela integração. Não reutilize o usuário administrador humano.

## Nginx

O Nginx deve encaminhar `/acesso-remoto/` preservando o prefixo e permitindo WebSocket:

```nginx
location ^~ /acesso-remoto/ {
    proxy_pass http://127.0.0.1:4430;
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;

    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    proxy_read_timeout 330s;
    proxy_send_timeout 330s;
}
```

Depois:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Experiência no Chat

O botão se adapta ao estado do cliente:

```text
Nenhum computador conhecido
→ Instalar suporte remoto

1 computador online
→ Iniciar acesso remoto

2+ computadores online
→ Escolher computador

Computador conhecido, porém offline
→ Computador offline
```

No primeiro caso, o sistema já coloca o link de instalação dentro da conversa. O preview do cliente transforma essa mensagem em um botão real **Baixar Suporte Remoto F10**.

## Tela do Ticket

`/app/tickets/:ticketId/remote` mostra todos os computadores conhecidos daquele cliente/organização:

```text
SECRETARIA-PC       Online     [ Iniciar acesso remoto ]
NOTEBOOK-JOAO       Offline
```

Também oferece:

```text
[ Verificar agora ]
[ Adicionar outro computador ]
```

## Tela geral

`/app/remote` deixa de ser formulário para digitar Node ID. Ela passa a mostrar:

- sessões;
- computadores conhecidos;
- online/offline;
- última conexão;
- cliente/organização vinculados.

Somente `remote.manage` recebe o catálogo global de dispositivos.

## Permissões

As responsabilidades ficam separadas:

```text
remote.request
→ gerar enrollment
→ enviar instalador
→ sincronizar computador

remote.use
→ iniciar/abrir desktop remoto
→ trabalhar com sessões conforme o próprio scope

remote.manage
→ visualizar catálogo administrativo global
```

Ter `remote.request` sem `remote.use` permite ajudar o cliente a instalar o componente, mas não permite abrir o desktop.

## Auditoria

Novos eventos relevantes:

```text
remote.enrollment.requested
remote.device.enrolled
remote.requested
remote.started
remote.ended
```

O enrollment e as sessões continuam vinculados ao ticket/chat quando aplicável.

## Segurança

- componente de suporte é separado do Software F10;
- nenhum Node ID precisa ser digitado pelo cliente;
- token público do enrollment é armazenado apenas como SHA-256;
- enrollment expira e um novo pedido cancela o anterior aberto daquele grupo;
- dispositivo só é iniciado se estiver associado ao cliente/organização do ticket;
- dispositivo precisa estar online;
- `remote.request` e `remote.use` são validados separadamente no backend;
- acesso ao desktop pede confirmação local pelo MeshCentral;
- o cliente não recebe credenciais administrativas;
- o binário é obtido pela interface local do MeshCentral e entregue pelo Operations com `Cache-Control: no-store`;
- RDP/3389 não é exposto;
- MeshCentral permanece atrás do HTTPS existente;
- credencial de automação fica somente no servidor.

## Limites atuais

A sincronização de dispositivos ocorre quando um ticket/chat remoto é aberto ou quando o atendente usa **Verificar agora**. Ainda não existe monitoramento global em background de todos os grupos, portanto o status exibido na tela geral `/app/remote` pode ficar desatualizado até uma sincronização daquele cliente.

O encerramento no Operations registra `remote.ended`, mas ainda não força via API o encerramento físico de uma conexão que continue aberta no MeshCentral. Depois da homologação com a versão real instalada, essa sincronização provider → Operations pode ser adicionada sem mudar o modelo de clientes/dispositivos/enrollment.
