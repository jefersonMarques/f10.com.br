# F10 WordPress Child Theme

Tema filho do Astra utilizado no Blog F10, preparado para autoria profissional, páginas públicas de autores e experiência responsiva.

## Versão

`1.1.0`

## Principais recursos

- perfil editorial próprio para cada usuário do WordPress;
- foto local pela Biblioteca de Mídia, sem dependência obrigatória do Gravatar;
- nome real do autor no cabeçalho de cada post;
- caixa profissional de autor ao final do artigo;
- página individual de autor usando `author.php`;
- página com a lista pública de autores;
- imagens responsivas com `srcset`, `sizes`, dimensões reais e prioridade da imagem destacada;
- ajustes para smartphone, tablet, teclado e redução de movimento;
- sanitização, nonce, validação de permissão e validação de anexos.

## Restaurar o pacote instalável

O pacote ZIP foi dividido em partes de texto para permitir seu versionamento pelo conector GitHub. Execute na raiz deste diretório:

```bash
bash scripts/restore-package.sh
```

O comando gera:

```text
dist/f10-child-1.1.0.zip
```

SHA-256 esperado:

```text
559e7f03091b3c9ef781f48ad994f409ad2e0979c4d3722b61805dbee3f3f659
```

## Instalação

1. Restaure o ZIP com o script acima.
2. No WordPress, acesse **Aparência → Temas → Adicionar tema → Enviar tema**.
3. Envie `dist/f10-child-1.1.0.zip`.
4. Ative o tema **F10 Child**.
5. Acesse **Configurações → Links permanentes** e salve novamente.

## Configuração de Rodrigo Fonseca

| Campo | Valor |
|---|---|
| Nome de exibição | Rodrigo Fonseca |
| E-mail interno | rodrigo.fonseca@f10.com.br |
| Cargo | Head Comercial da F10 Software |
| Especialidades | Vendas, Captação de alunos, Funil de matrículas, Processos comerciais para escolas |
| LinkedIn | https://www.linkedin.com/in/rfrodrigofonseca/ |
| Biografia curta | Rodrigo Fonseca é Head Comercial da F10 Software e especialista em vendas, captação de alunos e processos de matrículas para instituições de ensino. |

O e-mail não é exibido publicamente pelo tema.

## Lista de autores

Crie uma página no WordPress e selecione o modelo **F10 - Autores**. A página lista usuários com posts publicados e visibilidade pública habilitada.

## Validação realizada

- sintaxe PHP validada em todos os templates;
- sintaxe JavaScript validada;
- balanceamento estrutural dos arquivos CSS validado;
- breakpoints revisados para 360, 390, 414, 768, 1024 e 1440 px;
- imagens e mídias protegidas contra estouro horizontal;
- alvos de toque principais com pelo menos 44 px.

A nota final do Lighthouse depende também de hospedagem, cache, plugins, imagens publicadas e scripts de terceiros, portanto deve ser confirmada no ambiente de produção.
