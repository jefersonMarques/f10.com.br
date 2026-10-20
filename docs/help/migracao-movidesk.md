> **ENCERRADA — outubro de 2026.** A área `/app/help/content/movidesk`, suas páginas filhas, exportação e ações POST retornam HTTP 404. Os três workers de migração, recuperação de imagens e publicação em lote não são mais iniciados pela aplicação. Os artigos, os ativos e os redirecionamentos históricos permanecem preservados; o editor e a publicação regulares da Central de Ajuda não foram alterados. As instruções abaixo são apenas histórico operacional. Para reabrir a migração, será necessária uma mudança explícita no código e a conferência de eventuais filas persistidas antes de reativar os workers.

# Migração temporária Movidesk → F10

A migração **não usa IA**. Ela copia o conteúdo para rascunhos estruturados do F10, preserva o HTML/texto originais e importa imagens compatíveis para o armazenamento próprio. Nunca sobrescreve um artigo F10 já importado.

## Configuração

No servidor, configure em `.env.production`:

```dotenv
F10_MOVIDESK_MIGRATION_ENABLED=true
MOVIDESK_KB_API_TOKEN=SEU_TOKEN_DE_API_MOViDESK
```

Se as imagens estiverem hospedadas fora dos domínios Movidesk, a importação mostrará
`MOVIDESK_IMAGE_HOST_NOT_ALLOWED:dominio`. Confira no HTML original se é uma origem confiável e
adicione **somente esse hostname** à variável opcional
`MOVIDESK_IMAGE_ALLOWED_HOSTS` no `.env.production` (hosts separados por vírgula, sem protocolo).
Reinicie o worker para aplicar. Não use curingas ou domínios internos. As imagens permanecem
bloqueadas até a origem ser autorizada, evitando baixar arquivos de hosts arbitrários.

Não coloque o token no repositório, em screenshots ou no navegador. O token é obtido na administração do Movidesk. O worker usa o processo PM2 `f10-help-video-worker` e deve conseguir gravar no armazenamento S3/MinIO do F10. Faça backup do PostgreSQL e dos assets antes de iniciar.

Faça o deploy com `npm run prod`. Depois abra **Base de Conhecimento → Migração Movidesk** com um usuário que tenha `system.settings.manage`.

## Importação

1. Clique **Iniciar migração**. A API é paginada e o worker limita as chamadas a uma a cada ~8 s.
2. Pode fechar a página: o servidor persiste página, itens e falhas. **Pausar**, **Continuar** e **Tentar falhas novamente** preservam o progresso.
3. Cada artigo vira um rascunho F10. Categorias existentes são reaproveitadas, e categorias ausentes são criadas com identificação Movidesk.
4. Confira **Original salvo** e **Abrir no F10**. Reveja texto, imagens e anexos. Tabelas, embeds e anexos sem URL na API são sinalizados.
5. Clique **Aprovar** após verificação editorial e complete a revisão humana de screenshots no editor, quando exigida. Só então publique.

## Correções e reprocessamento

Depois de concluir a primeira importação, use **Reprocessar artigos** no painel para aplicar
correções do conversor aos rascunhos e tentar novamente os artigos com falha.
O worker reutiliza HTML e metadados originais salvos no banco; somente artigos sem cópia
original precisam de nova consulta à API Movidesk. A operação
trabalha no worker, com progresso persistido e sem usar IA. O mesmo conteúdo mantém seu
ID original e o histórico original é preservado.

**Proteção:** só são reprocessados conteúdos ainda não revisados nem editados após a
importação. Artigos aprovados, publicados, com release ou com alterações no editor são
pulados. Faça backup antes de usar e confira os resultados antes de aprovar.

Os embeds do YouTube presentes no HTML (como `<iframe src="//www.youtube.com/embed/...">`)
são preservados como links de vídeo estruturados. O preview e o artigo publicado
exibem o player no ponto original do conteúdo, sem baixar MP4 ou exigir uma
transcrição nesta migração. Outros embeds continuam sinalizados para revisão.

O conversor decodifica entidades HTML, converte links internos Movidesk para URLs do F10
por ID do artigo e não copia links automáticos de navegação Próximo/Anterior. Referências
sem correspondência no inventário geram um aviso de revisão.

O conteúdo bruto é mantido em `help_movidesk_articles.source_html` e `source_text`. A identidade usa `import_source=movidesk` + `import_external_id=ID`. A sincronização não apaga correções manuais nem republica artigos.

## Redirecionamentos

A aplicação reconhece em `ajuda.f10.com.br` as formas `/kb/pt-br/article/ID/slug` e `/kb/article/ID/slug`. Ela responde **301** para `https://f10.com.br/ajuda-f10/<slug-publicado>` somente quando o ID estiver vinculado a um artigo **aprovado e publicado**.

Antes de mudar o DNS, verifique:
- O inventário da API foi concluído e não restam erros ou artigos pendentes.
- Os screenshots foram copiados e os anexos foram preservados; confira principalmente itens com alertas.
- Todos os artigos que devem continuar acessíveis estão publicados e cada link novo retorna HTTP 200.
- Nginx/HTTPS do novo host `ajuda.f10.com.br` encaminha o cabeçalho Host correto para o SvelteKit. Faça uma verificação real de status/Location com `curl -I`.

**Não alterar o DNS e não cancelar o Movidesk apenas com o deploy do código.** A mudança do subdomínio é uma operação separada, após conferência do conteúdo.

## Encerrar a ferramenta temporária

Quando a migração estiver concluída, remova `F10_MOVIDESK_MIGRATION_ENABLED=true` (ou defina `false`) e reinicie o PM2. O atalho e a rota administrativa ficarão ocultos, e o worker parará. **Não apague a tabela de mapeamentos**: os 301 continuam dependendo dela.

O host `f10.movidesk.com` pertence ao Movidesk; seus próprios redirecionamentos não podem ser garantidos após o cancelamento.


### Organização do conteúdo migrado

- Parágrafos são separados em seções curtas com títulos extraídos do próprio texto; títulos reais do HTML são preservados.
- Vídeos do YouTube e arquivos HTTPS MP4 (inclusive Oracle Object Storage) ficam na posição original e são reproduzidos diretamente no preview e artigo público. O formato do importador continua compatível com os blocos de link existentes: não inventar transcrição de vídeo.
- Imagens do Movidesk e dos endereços oficiais Amazon S3 são copiadas para o armazenamento F10 quando possíveis. Redirects S3 passam pela mesma validação HTTPS e hostname. Se uma imagem falhar, o artigo é importado para revisão com link para a imagem original e aviso, em vez de descartar o conteúdo inteiro.
- Links de navegação "Próximo"/"Anterior" do Movidesk são descartados; a navegação nativa do F10 é a referência.
- Após o deploy, usar **Reprocessar artigos** (somente rascunhos intactos) para aplicar as melhorias; artigos editados e publicados são protegidos. Conferir vídeo e imagem na visualização antes de aprovar.


### Vídeos nativos e preparação para IA

- O primeiro YouTube/MP4 incorporado no HTML original é registrado no **Vídeo principal** nativo do conteúdo F10.
- Quando a origem é um MP4 HTTPS confiável, o worker tenta copiá-lo para o armazenamento do F10 (até 90 MB, formato validado). Isso permite usar o vídeo local no fluxo existente de análise da IA **mais tarde**, sem processá-lo durante a migração.
- Se não puder baixar ou for YouTube, a URL permanece no campo **Vídeo principal**; o painel avisa que ainda será necessário um MP4 local antes da análise.
- Não inventamos legendas nem resumos. O campo de transcrição fica vazio para processamento posterior; os requisitos normais de publicação permanecem ativos.
- Vídeos adicionais continuam em ordem dentro dos passos. O F10 só possui um campo **Vídeo principal** por artigo.
- Os dados originais continuam salvos para reprocessamentos seguros. O aviso de HTML excedido usa agora somente a comparação com o limite real, não o resultado de limpar a navegação.
- Domínios S3 reconhecidos passam a ser aceitos pela lista segura. Se a imagem falhar, mantém o bloco de imagem original no rascunho para revisão, em vez de substituí-lo por um link genérico.

Antes de reprocessar em lote, teste um artigo com YouTube, outro com MP4 Oracle e um com screenshots S3. Não publique automaticamente.


## Exportar para revisão editorial com IA

No painel temporário `/app/help/content/movidesk`, administradores encontram
**Exportar pacote**. Ele gera `f10-revisao-movidesk.zip` com:

- `movidesk-originais.json`: HTML/texto original, ID e anexos de cada artigo;
- `rascunhos-f10.json`: passos e blocos editáveis no F10, IDs e metadados de mídia,
  categorias e estado do rascunho;
- `publicados-referencia.json`: snapshots efetivamente publicados de toda a base,
  **somente para comparação** e detecção de duplicidades;
- `categorias-colecoes.json`: categorias, coleções e sequência atual;
- `inventario.json` e `LEIA-ME.md`: escopo, formato e cuidados.

O arquivo não inclui a chave Movidesk nem os binários de imagens/vídeos; os assets
já armazenados no F10 são referenciados por IDs persistentes. O download é autorizado
apenas a `system.settings.manage`, com `Cache-Control: private, no-store`.

**Importante:** este ZIP é um formato editorial de análise, não deve ser enviado
ao importador genérico `/app/help/content/import`. Esse importador substitui passos
e ativos do rascunho, o que não é adequado para aplicar alterações de IA preservando
mídias e relações. Após a revisão, usar ou implementar um aplicador editorial que
valide as versões-base, IDs e escopo antes de alterar algo. Artigos publicados
não devem ser modificados por essa operação.

## Aplicar um pacote editorial revisado com IA

O painel de migração também oferece **Importar revisão organizada**.
Envie um ZIP editorial com `revisao-f10.json` na raiz (ou o JSON diretamente).
Use **Conferir pacote** antes de **Aplicar revisão**.

O formato `f10-help-editorial-review` versão 1 traz os mesmos IDs de conteúdo,
passos e blocos exportados, `baseUpdatedAt` e somente ajustes editoriais.
A aplicação:
- rejeita conteúdo que tenha sido editado desde o pacote ou já esteja aprovado/publicado;
- exige mesma quantidade e IDs de passos e blocos, mesmos tipos e mídias;
- atualiza títulos, resumos, textos e observações do rascunho sem remover seus assets;
- acrescenta uma categoria principal recomendada sem apagar categorias antigas;
- não cria novos artigos, não consolida duplicatas automaticamente e não publica;
- não modifica as coleções existentes. As coleções sugeridas precisam ser
  configuradas quando os respectivos conteúdos estiverem publicados.

Toda a validação e aplicação ocorrem em uma transação: erro interrompe o lote sem
alterações parciais. O ZIP de exportação original não segue esse formato: é um
pacote para **análise**, não para aplicar diretamente.

Os binários de imagens/vídeos que permanecerem remotos exigem correção separada
antes de desativar o Movidesk. Reescrever o artigo não transforma URL externa
em imagem armazenada localmente.


## Recuperar imagens antigas sem reprocessar artigos

Após a migração, o painel Movidesk oferece **Recuperar imagens para o bucket F10**.
O worker dedicado `f10-help-video-worker` copia, uma a uma, as imagens dos
`help_assets` dos conteúdos com `import_source = movidesk` e
`storage_key IS NULL`. Os passos, blocos, IDs, revisões de IA, artigos publicados
e categorias não são alterados. A URL original permanece apenas como referência
de origem, mas a entrega do arquivo passa a usar a chave armazenada no bucket.

- A fila é persistida em `help_movidesk_image_recovery_state`, migration `0090`.
- Para URLs `s3.amazonaws.com/movidesk-files/HASH`, o worker acessa diretamente `https://f10.movidesk.com/Storage/Download?id=HASH`. Essa rota foi verificada no servidor e responde HTTP 302 para o mesmo arquivo no S3 com `AWSAccessKeyId`, `Expires` e `Signature`; o S3 respondeu HTTP 206 com `image/png` no teste do artigo #119824. O worker valida HTTPS, host, hash e validade da assinatura antes de baixar e gravar o arquivo no bucket F10. Não armazena a URL assinada no banco. Não acessa a página pública do artigo nem depende de token na rota de download.
- A fila espera pelo menos 8 segundos entre arquivos, aguarda o término da fila de importação de artigos e aplica espera de 60 segundos para HTTP 429 ou 5xx. A rota de imagens não consome chamadas do endpoint de artigos da API.
- Imagens copiadas são validadas por assinatura PNG/JPEG/WebP, até 8MB por arquivo,
  hosts HTTPS autorizados (incluindo Amazon S3) e leitura de volta do bucket.
- O painel apresenta arquivos no bucket, pendentes e falhas. Ao terminar, a fila
  pausa sozinha; erros podem ser repetidos depois de autorizar os domínios necessários
  via `MOVIDESK_IMAGE_ALLOWED_HOSTS` no servidor. Não use curingas.
- Erros individuais não param o lote; o status de cada imagem é salvo em
  `help_assets.metadata.movideskImageRecovery`.
- Se o HTML original tiver imagens que nunca foram importadas como blocos, elas
  aparecerão em um aviso separado. Elas precisam ser reinseridas no artigo, pois
  não há vínculo de mídia para atualizar automaticamente.

**Reprocessar artigos** (somente rascunhos Movidesk não editados e sem publicação)
usa o mesmo fluxo de `/Storage/Download?id=HASH` durante a importação:
baixa, valida e grava as imagens no bucket antes de concluir cada artigo. Se alguma
imagem ainda ficar externa, a fila persistente de recuperação é acionada
automaticamente após o reprocessamento, sem segundo clique. O reprocesso
exige bucket configurado. Se um download falhar e o artigo tiver imagens já
armazenadas, o conteúdo anterior permanece intacto em vez de perder imagens.
Rascunhos editados, aprovados e conteúdos publicados continuam protegidos.

Para corrigir **apenas imagens** sem mudar os rascunhos nem a revisão editorial,
use **Recuperar imagens** ou **Repetir falhas**.

Se `/Storage/Download?id=HASH` retornar erro, confira se o arquivo continua disponível no Movidesk; nunca substitua pelo hash de outra imagem. URLs temporárias assinadas não devem permanecer como dependência no F10. Após o deploy, use **Repetir falhas** para reenfileirar imagens marcadas pela versão anterior.

Só desligue o Movidesk quando não houver imagens sem cópia local e os recursos
forem verificáveis pelas URLs do próprio F10.
