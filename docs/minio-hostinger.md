# MinIO na VPS Hostinger — F10 Operations

O F10 Operations usa a interface S3 para armazenar imagens e documentos da Base de Conhecimento. A implementação não depende de um SDK específico e funciona com MinIO ou outro serviço S3 compatível.

## Topologia inicial

```text
Hostinger VPS
├── F10 / SvelteKit
├── PostgreSQL
├── MinIO API      127.0.0.1:9000
└── MinIO Console  127.0.0.1:9001
```

As portas 9000 e 9001 não precisam ficar expostas publicamente. O backend F10 acessa a API pela interface local e serve os objetos através de rotas controladas da aplicação.

## Instalação sem Docker

Use a distribuição Linux oficial do MinIO para a arquitetura da VPS e instale o servidor como serviço do sistema. A documentação oficial do MinIO disponibiliza instalação por pacote DEB/RPM e execução via systemd.

Depois da instalação, mantenha os dados fora do diretório da aplicação, por exemplo:

```bash
sudo mkdir -p /var/lib/minio
sudo chown -R minio-user:minio-user /var/lib/minio
```

A configuração do serviço deve manter a API e o console apenas no loopback:

```bash
MINIO_VOLUMES="/var/lib/minio"
MINIO_OPTS='--address "127.0.0.1:9000" --console-address "127.0.0.1:9001"'
MINIO_ROOT_USER="..."
MINIO_ROOT_PASSWORD="..."
```

Os nomes exatos do arquivo de ambiente e do usuário do serviço devem seguir o pacote/versão oficial instalado na VPS. Não versionar essas credenciais no repositório.

Reinicie e confirme o serviço:

```bash
sudo systemctl daemon-reload
sudo systemctl enable minio
sudo systemctl restart minio
sudo systemctl status minio
```

## Cliente `mc` e bucket

Instale o cliente oficial `mc`, configure um alias local e crie o bucket usado pelo F10:

```bash
mc alias set local http://127.0.0.1:9000 <usuario> <senha>
mc mb --ignore-existing local/f10-help
```

Para produção, prefira credenciais dedicadas à aplicação em vez de usar as credenciais administrativas do MinIO.

## `.env` do F10

```env
ASSET_STORAGE=s3
S3_ENDPOINT=http://127.0.0.1:9000
S3_REGION=us-east-1
S3_BUCKET=f10-help
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
OPERATIONS_DOCTOR_REQUIRE_ASSET_STORAGE=true
```

Depois:

```bash
npm run operations:doctor
```

E em `/app/settings`, use **Testar conexão**. O teste grava um pequeno objeto de health-check no bucket e o remove em seguida.

## Política da Base de Conhecimento

- o bucket não precisa ser público;
- objetos gerenciados recebem chave baseada em SHA-256;
- imagens e documentos são entregues pelo backend F10;
- uma rota pública só entrega um asset se ele estiver referenciado no snapshot publicado daquele artigo;
- assets em uso pelo rascunho ou pela última publicação não podem ser excluídos pela biblioteca;
- SVG e HTML não entram na whitelist inicial de upload;
- vídeos permanecem no YouTube e não são enviados ao MinIO.

## Backup

MinIO na mesma VPS melhora organização e desacoplamento do código, mas não cria redundância física. Faça backup externo periódico do diretório de dados do MinIO e do PostgreSQL. O backup da Base precisa considerar os dois: banco + objetos.

## Migração futura

A aplicação só conhece configuração S3. Se o armazenamento sair da VPS, a troca pode ser feita alterando endpoint/bucket/credenciais para outro serviço compatível sem redesenhar os conteúdos.
