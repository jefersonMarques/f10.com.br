# Acesso remoto — F10 Operations + MeshCentral

O F10 Operations não implementa protocolo de desktop remoto. Ele controla o fluxo de atendimento, consentimento e auditoria; o MeshCentral é o provedor que mantém os agentes Windows e abre a sessão remota no navegador.

## Arquitetura

```text
Cliente Windows
  └─ Agente MeshCentral
       ↓ conexão de saída
https://f10.com.br/acesso-remoto/
       ↓ reverse proxy
MeshCentral local
       ↑
F10 Operations
  ├─ ticket/chat
  ├─ solicitação
  ├─ consentimento temporário
  └─ auditoria
```

Não é necessário expor RDP/3389 na internet e não é necessário criar subdomínio para o MeshCentral.

## Endereço público adotado

O endereço público do provider é:

```text
https://f10.com.br/acesso-remoto/
```

O MeshCentral suporta domínios virtuais identificados pelo primeiro segmento do caminho. Para esta implantação, use uma domain section chamada `acesso-remoto`, de forma que a interface e os agentes utilizem o mesmo caminho público.

Não configure o F10 para abrir o MeshCentral na raiz `/`: o provider valida que a URL final continua dentro do caminho configurado em `MESHCENTRAL_BASE_URL`.

## Configuração conceitual do MeshCentral

A porta interna é apenas um exemplo; pode ser alterada conforme a VPS. O importante é manter o serviço local atrás do Nginx e informar ao MeshCentral que o endereço externo usa HTTPS/443.

Exemplo de `meshcentral-data/config.json`:

```json
{
  "$schema": "https://raw.githubusercontent.com/Ylianst/MeshCentral/master/meshcentral-config-schema.json",
  "settings": {
    "cert": "f10.com.br",
    "WANonly": true,
    "port": 4430,
    "aliasPort": 443,
    "TLSOffload": "127.0.0.1",
    "trustedProxy": "127.0.0.1",
    "newAccounts": false
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

Confirme os nomes/opções contra o `sample-config.json`, `sample-config-advanced.json` e schema da versão efetivamente instalada antes de reiniciar o serviço.

## Nginx

O Nginx deve encaminhar `/acesso-remoto/` ao MeshCentral preservando o caminho e permitindo WebSocket. Como o domínio virtual do MeshCentral se chama `acesso-remoto`, não remova esse prefixo no proxy.

Exemplo inicial:

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

Depois valide e recarregue o Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## `.env` do F10

```env
REMOTE_SUPPORT_PROVIDER=meshcentral
MESHCENTRAL_BASE_URL=https://f10.com.br/acesso-remoto/
MESHCENTRAL_DEVICE_URL_TEMPLATE=https://f10.com.br/acesso-remoto/?viewmode=13&gotonode={deviceId}
OPERATIONS_DOCTOR_REQUIRE_REMOTE=true
```

O F10 exige que a URL final permaneça no mesmo origin e, agora, também dentro do mesmo caminho-base configurado.

## Implantação

1. instale o MeshCentral na VPS seguindo o projeto/documentação oficial;
2. mantenha a porta do processo acessível apenas localmente/firewall interno;
3. configure o domain `acesso-remoto`;
4. configure o bloco Nginx acima;
5. reinicie MeshCentral;
6. valide `https://f10.com.br/acesso-remoto/` no navegador;
7. instale um agente de teste a partir dessa instalação;
8. confirme que o dispositivo fica online;
9. configure o `.env` do F10;
10. execute `npm run operations:doctor` e use **Testar MeshCentral** em `/app/settings`.

Depois de criar um dispositivo no MeshCentral, copie o identificador do nó e registre-o em `/app/remote`, associando-o ao cliente correspondente.

## Fluxo

1. funcionário abre um ticket ou chat;
2. seleciona **Solicitar acesso remoto**;
3. escolhe um dispositivo já vinculado ao cliente/organização;
4. o F10 cria uma sessão `requested` e gera token aleatório;
5. somente SHA-256 do token é persistido;
6. o cliente recebe um link temporário `/suporte-remoto/:token`;
7. cliente autoriza ou recusa;
8. somente uma sessão `authorized` pode ser iniciada;
9. o F10 registra `remote.started` e abre o dispositivo no MeshCentral;
10. ao terminar, o atendente encerra a sessão no F10, registrando `remote.ended`.

## Estados

```text
requested
  ├─ authorized → active → ended
  ├─ denied
  ├─ expired
  └─ cancelled
```

Falhas operacionais podem ser registradas como `failed`.

## Segurança

- consentimento é explícito e temporário;
- token de consentimento não é armazenado em texto puro;
- o cliente não recebe credenciais administrativas do MeshCentral;
- `remote.request`, `remote.use` e `remote.manage` continuam separados;
- iniciar uma sessão exige autorização anterior;
- todos os eventos relevantes são vinculados ao ticket quando aplicável;
- o F10 não abre porta RDP;
- o MeshCentral fica atrás do HTTPS existente do domínio F10;
- a console/gestão do MeshCentral deve ser protegida separadamente.

## Limite atual do provider

A primeira integração abre o nó correspondente no MeshCentral depois do consentimento. O encerramento no F10 registra o encerramento lógico/auditoria da sessão. Uma integração futura com a API/eventos do MeshCentral poderá sincronizar automaticamente conexão/desconexão do provider sem alterar o modelo de domínio do F10.
