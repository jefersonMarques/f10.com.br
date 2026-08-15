# Acesso remoto — F10 Operations + MeshCentral

O F10 Operations não implementa protocolo de desktop remoto. Ele controla o fluxo de atendimento, consentimento e auditoria; o MeshCentral é o provedor que mantém os agentes Windows e abre a sessão remota no navegador.

## Arquitetura

```text
Cliente Windows
  └─ Agente MeshCentral
       ↓ conexão de saída
MeshCentral
       ↑
F10 Operations
  ├─ ticket/chat
  ├─ solicitação
  ├─ consentimento temporário
  └─ auditoria
```

Não é necessário expor RDP/3389 na internet.

## Implantação inicial

O MeshCentral deve usar um endereço HTTPS próprio, por exemplo:

```text
https://remote.f10.com.br
```

A instalação e atualização do MeshCentral devem seguir o repositório/documentação oficial do projeto. O agente deve ser instalado apenas nos computadores que participarão do suporte remoto.

Depois de criar um dispositivo no MeshCentral, copie o identificador do nó e registre-o em `/app/remote`, associando-o ao cliente correspondente.

## `.env` do F10

```env
REMOTE_SUPPORT_PROVIDER=meshcentral
MESHCENTRAL_BASE_URL=https://remote.f10.com.br
MESHCENTRAL_DEVICE_URL_TEMPLATE=https://remote.f10.com.br/?viewmode=13&gotonode={deviceId}
OPERATIONS_DOCTOR_REQUIRE_REMOTE=true
```

O template é configurável para permitir ajustar a navegação caso a instalação do MeshCentral utilize outro caminho. O F10 exige que a URL final permaneça no mesmo origin de `MESHCENTRAL_BASE_URL`.

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
- o cliente não recebe credenciais ou URL administrativa do MeshCentral;
- `remote.request`, `remote.use` e `remote.manage` continuam separados;
- iniciar uma sessão exige autorização anterior;
- todos os eventos relevantes são vinculados ao ticket quando aplicável;
- o F10 não abre porta RDP;
- a console/gestão do MeshCentral deve ser protegida separadamente.

## Limite atual do provider

A primeira integração abre o nó correspondente no MeshCentral depois do consentimento. O encerramento no F10 registra o encerramento lógico/auditoria da sessão. Uma integração futura com a API/eventos do MeshCentral poderá sincronizar automaticamente conexão/desconexão do provider sem alterar o modelo de domínio do F10.
