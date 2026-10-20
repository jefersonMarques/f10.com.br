# Corte controlado: ajuda.f10.com.br para f10.com.br/ajuda-f10

## Resumo

O F10 resolve as URLs antigas de artigos Movidesk pelo ID e pelo snapshot efetivamente publicado no novo sistema, sem usar a flag de revisão do importador. Na exportação de 19/10/2026 foram encontrados 227 URLs de artigos, todos no padrão /kb/pt-br/article/NUMERO/slug.

- Raiz, /kb e /kb/pt-br: HTTP 301 para https://f10.com.br/ajuda-f10.
- /kb/pt-br/article/119823/criando-os-professores-e-funcionarios-usuarios: HTTP 301 para a URL publicada correspondente ao ID 119823.
- /kb/article/NUMERO/slug: mesma lógica por ID.
- Artigo 119872: direciona ao artigo consolidado 119846, quando publicado; enquanto isso, fallback temporário 302 para coleção adequada ou Central de Ajuda.
- Categorias antigas com coleção pública correspondente: HTTP 301 para a coleção somente quando ela existir e estiver ativa.
- Artigos inexistentes ou não publicados: HTTP 404. Não usar redirecionamento genérico para a página inicial.

## Ordem de migração

1. Subir o código primeiro (sem mexer em DNS): no servidor, rodar cd /opt/f10.com.br e npm run prod.
2. Preparar o proxy para aceitar ajuda.f10.com.br e encaminhar à mesma aplicação Node do F10. O proxy deve preservar o header Host original, pois o adapter-node utiliza ORIGIN=https://f10.com.br.
3. Configurar HTTPS com certificado válido para ajuda.f10.com.br, usando desafio DNS-01 antes da troca, se disponível, ou HTTP-01 após DNS apontar para o proxy.
4. Testar o redirecionamento diretamente na porta interna do F10, sem mudar DNS:
   curl -I -H 'Host: ajuda.f10.com.br' http://127.0.0.1:3000/kb/pt-br/article/119823/criando-os-professores-e-funcionarios-usuarios
   curl -I -H 'Host: ajuda.f10.com.br' http://127.0.0.1:3000/kb/pt-br/article/119872/caixas-e-bancos-criando-uma-nova-conta-para-recebimento
   curl -I -H 'Host: ajuda.f10.com.br' http://127.0.0.1:3000/kb/pt-br/article/999999/inexistente
   Substituir a porta 3000 pela porta real da aplicação.
5. Somente após validar os itens anteriores, substituir o DNS antigo do Movidesk por CNAME ajuda apontando ao endereço de entrada do F10, ou A/AAAA para o IP do proxy (conforme configuração de DNS e infraestrutura). Não criar registros conflitantes. Reduzir TTL antes do corte, se disponível.
6. Testes externos após propagação: usar curl -I e curl -IL sobre https://ajuda.f10.com.br/kb/pt-br/article/119823/..., verificar 301 para https://f10.com.br/ajuda-f10/..., certificado SSL válido, último destino com HTTP 200 e 404 para IDs desconhecidos.
7. Acompanhar 404 e Google Search Console durante as semanas seguintes. Manter o domínio e o certificado antigos ativos, pois links históricos continuarão acessando o subdomínio.

## Cuidados

DNS não redireciona URLs, apenas resolve nomes. Os redirects HTTPS são responsabilidade do proxy/aplicação.

Nunca emitir 301 para artigo não publicado, ou apontar artigos desconhecidos para a raiz (soft 404). Não reaplicar pacotes editoriais, reprocessar Movidesk nem alterar conteúdos.

Corrigidas também as antigas rotas do site /treinamentos e /passopasso/index.html, que ainda levavam ao artigo Movidesk 291730, para não criar uma cadeia de redirecionamentos para uma página desativada.
