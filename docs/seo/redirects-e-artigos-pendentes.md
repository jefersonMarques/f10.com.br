# Redirecionamentos legados e artigos pendentes

Este documento registra as URLs antigas identificadas no Ahrefs e a estratégia aplicada em julho de 2026.

## Artigos que precisam ser publicados no blog

Publicar em `https://blog.f10.com.br/` usando exatamente estes slugs:

1. `cursos-profissionalizantes-crescimento-em-2018-e-um-mundo-de-possibilidades-para-2019`
2. `5-metodologias-de-ensino-inovadoras-para-voce-conhecer`
3. `6-erros-que-devem-ser-evitados-na-captacao-de-alunos`
4. `7-dicas-para-manter-seus-professores-motivados`
5. `como-manter-os-alunos-motivados-para-garantir-indicacao-de-amigos`
6. `ensino-interativo-conheca-essa-metodologia-revolucionaria`
7. `o-que-eu-preciso-saber-para-ter-uma-escola-de-cursos-livres-de-sucesso`
8. `os-5-erros-que-prejudicam-a-administracao-escolar`
9. `plano-de-gestao-escolar`
10. `sobre-retencao-de-alunos`
11. `software-de-gestao-escolar-nuvem-ou-local`
12. `tecnologia-medo-de-se-reinventar`
13. `qual-a-importancia-do-marketing-local-para-uma-franquia-de-educacao`
14. `seguranca-de-dados`
15. `o-que-e-roi-como-calcula-lo-e-por-que-utiliza-lo-em-uma-escola`
16. `como-montar-uma-campanha-de-matriculas`
17. `benchmarking-entenda-o-que-e`
18. `como-organizar-a-escola`
19. `diminuindo-sua-taxa-de-evasao-com-o-nps`
20. `aplicativos-para-captar-e-reter-alunos`
21. `boas-praticas-cobranca`
22. `como-usar-as-redes-sociais-favor-da-sua-escola`
23. `passo-passo-para-um-bom-treinamento-de-equipe`
24. `como-captar-novos-alunos-atraves-do-marketing-digital`

Os caminhos antigos no domínio principal já respondem com 301 para os endereços acima. Enquanto o artigo não for publicado, o destino continuará retornando 404 no WordPress.

## Redirecionamentos que precisam ser configurados no WordPress

Estes endereços pertencem ao subdomínio `blog.f10.com.br` e não podem ser corrigidos pelo projeto Svelte do site principal.

| Origem no WordPress | Destino recomendado |
|---|---|
| `/author/` | `/` ou uma página de autor válida |
| `/software-para-escolas/` | `https://f10.com.br/software-para-escolas` |
| `/solucao-para-franquias/` | `https://f10.com.br/software-para-escolas` |
| `/blog/2018/05/24/diminuindo-sua-taxa-de-evasao-com-o-nps/` | `/diminuindo-sua-taxa-de-evasao-com-o-nps/` |
| `/blog/2017/09/04/o-que-eu-preciso-saber-para-ter-uma-escola-de-cursos-livres-de-sucesso/` | `/o-que-eu-preciso-saber-para-ter-uma-escola-de-cursos-livres-de-sucesso/` |
| `/blog/2018/01/24/aplicativos-para-captar-e-reter-alunos/` | `/aplicativos-para-captar-e-reter-alunos/` |
| `/blog/2017/10/04/como-usar-as-redes-sociais-favor-da-sua-escola/` | `/como-usar-as-redes-sociais-favor-da-sua-escola/` |
| `/blog/2018/03/01/passo-passo-para-um-bom-treinamento-de-equipe/` | `/passo-passo-para-um-bom-treinamento-de-equipe/` |
| `/blog/2017/11/30/como-captar-novos-alunos-atraves-do-marketing-digital/` | `/como-captar-novos-alunos-atraves-do-marketing-digital/` |

A URL `/boas-praticas-cobranca` deve passar a existir quando o artigo correspondente for publicado.

## URLs redirecionadas para páginas atuais

- `/home` → `/`
- `/precos` → `/preco`
- `/sobre-a-f10` e `/o-que-e-f10` → `/sobre`
- `/como-funciona-o-f10`, `/beneficios-do-f10`, `/solucao-para-franquias` e `/multiplas.html` → `/software-para-escolas`
- `/f10-smart-aluno` e o antigo artigo do Smart Aluno → `/solucoes/aplicativo-smart-aluno`
- `/gestao-financeira-escolar` e `/galaxpay` → `/solucoes/financeiro`
- `/comunicacao-escolar` → `/solucoes/whatsapp`
- `/contato.html` e `/demonstracao.html` → `/contato`
- `/passopasso/index.html` e `/treinamentos` → Central de Ajuda
- `/novidades_2020` e `/atualizacoes` → página inicial do blog

## URLs de spam

Caminhos incompatíveis com o conteúdo da F10, incluindo esportes, apostas, vídeos, conteúdo adulto e páginas aleatórias sob `/video.php`, `/android`, `/ios`, `/pt-br`, `/games`, `/casino`, `/poker`, `/bet`, `/blank`, `/futebol`, `/noticias` e `/esportes`, retornam `410 Gone` com `X-Robots-Tag: noindex, nofollow`.

Essas URLs não devem ser redirecionadas para a homepage ou para páginas comerciais da F10.

## Pendências fora deste repositório

- Configurar os redirecionamentos da tabela no WordPress.
- Publicar os 24 artigos com os slugs exatos.
- Tratar separadamente `servidor.f10.com.br/phpmanual/...`, pois pertence a outro host.
- Reprocessar o crawl no Ahrefs após o deploy e a publicação dos artigos.
