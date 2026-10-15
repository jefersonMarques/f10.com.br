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
