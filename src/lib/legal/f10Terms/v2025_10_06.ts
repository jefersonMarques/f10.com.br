// src/lib/legal/f10Terms/v2025_10_06.html.ts

/**
 * Template em HTML (versão fixa).
 * - Mantém placeholders {{LIKE_THIS}}
 * - Renderize com {@html ...} após substituir os placeholders no seu fluxo atual.
 */
export const F10_TERMS_VERSION = "2025-10-06" as const;

export const f10TermsHtmlTemplate = `
<article class="mx-auto max-w-5xl bg-white text-black">
  <header class="px-4 sm:px-8 pt-8 pb-6 border-b border-black/10">
    <div class="flex flex-col gap-2">
      <p class="text-[12px] text-black/55">
        Documento legal • Versão <span class="font-semibold text-black/70">${F10_TERMS_VERSION}</span>
      </p>
      <h1 class="text-[22px] sm:text-[28px] font-extrabold tracking-tight text-black/90">
        ADENDO DE TERMOS DE USO F10
      </h1>
    </div>
  </header>

  <div class="px-4 sm:px-8 py-8 space-y-6">
    <section class="space-y-3">
      <h2 class="text-[14px] font-extrabold text-black/85 uppercase tracking-wide">
        Considerando que
      </h2>

      <ol class="ml-5 list-[lower-roman] space-y-2 text-[13px] leading-relaxed text-black/75">
        <li>As partes firmaram uma parceria no intuito de produção de software para uso nas unidades;</li>
        <li>Que a F10 é empresa desenvolvedora de softwares, aplicações, processos de automação e outros relacionados;</li>
        <li>As Partes, ainda, decidiram realizar esse ADENDO ao presente contrato com as cláusulas sugeridas abaixo.</li>
      </ol>
    </section>

    <section class="space-y-4">
      <p class="text-[13px] leading-relaxed text-black/75">
        Este Adendo Termo de De Uso F10 ("ADENDO") é um acordo legal entre o cliente de razão social
        <strong class="text-black/85">{{CLIENT_LEGAL_NAME}}</strong>, pessoa jurídica inscrita no CNPJ
        <strong class="text-black/85">{{CLIENT_CNPJ}}</strong> (pessoa física ou jurídica, o "CLIENTE") e a
        <strong class="text-black/85">F10 Serviços Financeiros</strong>, pessoa jurídica de direito privado, inscrita no CNPJ sob nº
        <strong class="text-black/85">54.148.455/0001-88</strong>, com sede na
        <strong class="text-black/85">R. Comendador Araújo, 143 - Sala 31, 80420-900</strong> na cidade de
        <strong class="text-black/85">Curitiba -- PR - Brasil</strong>, (a "CONTRATADA") para uso dos serviços de automação de transações financeiras
        (o ”SERVIÇO”), disponibilizado neste ato pelo sistema F10 da CONTRATADA (a "PLATAFORMA").
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        Ao utilizar o SERVIÇO, mesmo que parcialmente ou a título de teste, o CLIENTE estará vinculado aos termos deste ADENDO,
        concordando com suas disposições, principalmente com relação ao <strong class="text-black/85">CONSENTIMENTO PARA o ACESSO, COLETA, USO,
        ARMAZENAMENTO, TRATAMENTO E TÉCNICAS DE PROTEÇÃO ÀS INFORMAÇÕES</strong> do CLIENTE pela CONTRATADA, necessárias para a integral execução das
        funcionalidades ofertadas pelo SERVIÇO. Em caso de discordância com os termos aqui apresentados, a utilização do SERVIÇO deve ser imediatamente
        interrompida pelo CLIENTE.
      </p>

      <div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <p class="text-[13px] leading-relaxed text-emerald-950">
          <strong>Em resumo:</strong> nossa sede fica na cidade de Curitiba no Paraná e ao usar o F10 você concorda com os termos estabelecidos neste instrumento
          para a utilização de nosso serviço.
        </p>
      </div>
    </section>

    <hr class="border-black/10" />

    <section class="space-y-4">
      <h2 class="text-[16px] sm:text-[18px] font-extrabold text-black/85">
        1. Declarações do CLIENTE
      </h2>

      <p class="text-[13px] leading-relaxed text-black/75">
        O CLIENTE declara ter pleno conhecimento dos direitos e obrigações decorrentes do presente ADENDO, constituindo este instrumento o acordo completo entre
        as partes. Declara, ainda, ter lido, compreendido e aceito todos os seus termos e condições.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        O CLIENTE declara que foi devidamente informado da política de confidencialidade e ambientes de proteção de informações confidenciais, dados pessoais e
        registros de acesso da CONTRATADA, consentindo livre e expressamente às ações de coleta, uso, armazenamento e tratamento das referidas informações e dados.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        O CLIENTE declara estar ciente de que as operações que correspondam à aceitação do presente ADENDO, de determinadas condições e opções, bem como eventual
        rescisão do presente instrumento e demais alterações, serão registradas nos bancos de dados da CONTRATADA, juntamente com a data e hora em que foram
        realizadas pelo CLIENTE, podendo tais informações serem utilizadas como prova pelas partes, independentemente do cumprimento de qualquer outra formalidade.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        O CLIENTE declara ainda que está ciente de que para usufruir de algumas das funcionalidades do SERVIÇO, em especial, dos serviços de integração com a rede
        bancária, deverá disponibilizar à CONTRATADA as <strong class="text-black/85">INFORMAÇÕES DE CONTA</strong> para que a PLATAFORMA, de maneira automatizada,
        colete informações diretamente nos sites e/ou outros meios virtuais disponibilizados pelas instituições financeiras, com as quais mantenha relacionamento,
        agindo a CONTRATADA, neste caso, como representante e mandatária do CLIENTE nestes atos.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        O CLIENTE está ciente e concorda que o serviço de intermediação de pagamentos, ora contratado, é operacionalizado por intermédio das empresas
        <strong class="text-black/85">CELCOIN INSTITUIÇÃO DE PAGAMENTO S.A.</strong> (“CELCOIN”), pessoa jurídica de direito privado, inscrita no CNPJ/MF sob o n°.
        <strong class="text-black/85">13.935.893/0001-09</strong>, com sede na Alameda Xingu, nº. 350, CJ 1604, Sala 02, Alphaville, no Município de Barueri,
        Estado de São Paulo, CEP: 06455-030; e, <strong class="text-black/85">GALAX INSTITUIÇÃO DE PAGAMENTO LTDA.</strong> (“GALAX PAY”), pessoa jurídica de direito
        privado, inscrita no CNPJ/MF sob o n°. <strong class="text-black/85">30.765.018/0001-45</strong>, com sede na Rua Tiros, nº. 35, Andar 4, bairro Calafate,
        no Município de Belo Horizonte, Estado de Minas Gerais, CEP: 30411-365, de forma que a, ao aderir a este instrumento, também adere aos Termos de Uso da
        CELCOIN e da GALAX PAY, disponível em
        <a class="font-semibold underline text-black/80 hover:text-black" href="https://www.celcoin.com.br/compliance-e-regulatorio" target="_blank" rel="noopener">
          https://www.celcoin.com.br/compliance-e-regulatorio
        </a>,
        na aba “cel_cash”.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        O CLIENTE está ciente e concorda que o desrespeito a qualquer uma das disposições previstas em ambos os instrumentos poderá ocasionar a rescisão imediata
        deste Termo e interrupção dos serviços.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        O CLIENTE tem plena ciência que a abertura de conta de pagamento pré-paga é operacionalizada na CELCOIN, restando a CONTRATADA autorizada a realizar as
        transações necessárias à operacionalização dos serviços aqui descritos.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        Por força do disposto acima, o CLIENTE de forma irrevogável e irretratável, nomeia e constitui a CONTRATADA como seu legítimo e bastante procurador, nos
        termos dos artigos 654 e 684 do Código Civil, conferindo-lhes poderes especiais para a finalidade específica de abrir em seu nome e movimentar a conta de
        pagamento pré-paga junto à instituição CELCOIN INSTITUIÇÃO DE PAGAMENTO S.A. (“CELCOIN”), pessoa jurídica de direito privado, inscrita no CNPJ/MF sob o n°.
        13.935.893/0001-09, com sede na Alameda Xingu, nº. 350, CJ 1604, Sala 02, Alphaville, no Município de Barueri, Estado de São Paulo, CEP: 06455-030, com o
        objetivo de receber e transferir recursos, conforme seja aplicável nos termos deste Contrato e nos Termos de Uso da CELCOIN, investindo a CONTRATANTE de
        todos os poderes necessários para tanto (“Procuração”). A CONTRATANTE não poderá ceder, alienar, transferir, vender, onerar, caucionar, empenhar e/ou por
        qualquer forma negociar os recursos existentes na conta de pagamento pré-paga de titularidade do USUÁRIO, a não ser nas hipóteses previstas neste Contrato
        ou nos Termos de Uso da CELCOIN.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        O CLIENTE deverá fornecer toda e qualquer informação solicitada pela CONTRATADA, seja para a abertura de conta na CELCOIN, seja em relação a toda e qualquer
        transação realizada nos termos dos serviços prestados.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        O CLIENTE deverá manter todos os seus dados cadastrais atualizados junto à CONTRATADA, devendo informar acerca de qualquer alteração, por escrito, em até 24
        (vinte quatro) horas.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        Toda e qualquer multa, taxa, encargo ou congêneres, devido pelo CLIENTE à CONTRATADA, CELCOIN, GALAX PAY ou terceiros, poderá ser debitada da conta de
        pagamento pré-paga de titularidade do USUÁRIO na CELCOIN, estando o CLIENTE ciente e de acordo com eventuais débitos, declarando, desde já, nada tendo a
        reclamar
      </p>

      <div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <p class="text-[13px] leading-relaxed text-emerald-950">
          <strong>Em resumo:</strong> aceitando os termos deste instrumento você concorda com todas as suas cláusulas e reconhece que seus dados e informações serão
          coletados pela CONTRATADA e sempre tratados com confidencialidade. Você compartilhará conosco certas informações específicas e que são necessárias para
          proporcionarmos, por meio de funcionalidades automáticas, a melhor experiência F10 para você, nosso cliente.
        </p>
      </div>
    </section>

    <hr class="border-black/10" />

    <section class="space-y-5">
      <h2 class="text-[16px] sm:text-[18px] font-extrabold text-black/85">
        2. Transações de recebimento e pagamento e Split de Pagamentos
      </h2>

      <section class="space-y-3">
        <h3 class="text-[14px] font-bold text-black/80">2.1. Das partes envolvidas no fornecimento do SERVIÇO.</h3>

        <p class="text-[13px] leading-relaxed text-black/75">
          Pelo presente instrumento, as Partes, de um lado:
        </p>

        <div class="rounded-2xl border border-black/10 bg-black/[0.02] p-4 space-y-3">
          <p class="text-[13px] leading-relaxed text-black/75">
            <strong class="text-black/85">Celcoin Instituição de Pagamento S.A</strong> – inscrita no CNPJ 13.935.893/0001-09, com sede na Rua Tiros, 35, 4 andar –
            Calafate, Belo Horizonte – MG, CEP 30411-365, inscrita no CNPJ sob o nº 30.765.018/0001-45, doravante designada INSTITUIÇÃO PARCEIRA;
          </p>

          <p class="text-[13px] leading-relaxed text-black/75">
            <strong class="text-black/85">F10 Serviços Financeiros LTDA</strong>, pessoa jurídica de direito privado, inscrita no CNPJ sob n. 54.148.455/0001-88, com
            sede na R. Comendador Araújo, 143 - Sala 31, 80420-900 na cidade de Curitiba - PR - Brasil, (a "CONTRATADA") e, de outro lado:
          </p>

          <p class="text-[13px] leading-relaxed text-black/75">
            <strong class="text-black/85">F10 Comércio de Computadores de Softwares Ltda</strong>, pessoa jurídica de direito privado, inscrita no CNPJ sob n.
            06.027.705/0001-89, com sede na R. Comendador Araújo, 143 - Sala 31, 80420-900 na cidade de Curitiba - PR - Brasil, (a "LICENCIANTE").
          </p>
        </div>
      </section>

      <section class="space-y-3">
        <h3 class="text-[14px] font-bold text-black/80">2.1.1 Aceite do contrato e documentos integrantes</h3>

        <p class="text-[13px] leading-relaxed text-black/75">
          Integram este Contrato para todos os ﬁns: (i) todas as informações e regras relacionadas ao âmbito financeiro e à plataforma contidas no site da INSTITUIÇÃO
          PARCEIRA; (ii) o formulário de cadastro de Conta principal; (iii) o formulário de veriﬁcação de conta e análise de limite; (iv) o Acordo de Tarifas e Taxa
          de Antecipação disponível no Menu &gt; Configurações &gt; Tarifas e limites; e (v) a Política de Privacidade. Esses documentos conterão a descrição de todas
          as funcionalidades aceitas no ato da contratação e constituirão objeto desta prestação de serviços da INSTITUIÇÃO PARCEIRA (“Serviços”) ao CLIENTE.
        </p>
      </section>

      <section class="space-y-3">
        <h3 class="text-[14px] font-bold text-black/80">2.2. Aceitação dos Termos</h3>
        <p class="text-[13px] leading-relaxed text-black/75">
          Ao utilizar o Split de Pagamentos, o CLIENTE declara ter lido, compreendido e concordado com estes Termos. Se o CLIENTE não concordar com qualquer
          disposição destes Termos, não poderá utilizar o Split de Pagamentos.
        </p>
      </section>

      <section class="space-y-3">
        <h3 class="text-[14px] font-bold text-black/80">2.3. Divisão e Distribuição de Pagamentos</h3>
        <p class="text-[13px] leading-relaxed text-black/75">
          O Split de Pagamentos permite a divisão automatizada de pagamentos entre múltiplos beneficiários de uma transação.
          Quando ocorre um Split de Pagamentos em que o valor total a ser dividido não seja perfeitamente divisível pelos beneficiários envolvidos. A divisão será
          feita de acordo com a ordem de envio das requisições, priorizando a ordem do envio.
          As divisões e distribuições dos pagamentos respeitarão sempre a ordem que foi enviada na requisição.
        </p>
      </section>

      <section class="space-y-3">
        <h3 class="text-[14px] font-bold text-black/80">2.4. Responsabilidade pelas Informações Fornecidas</h3>
        <p class="text-[13px] leading-relaxed text-black/75">
          O CLIENTE é responsável pela exatidão das informações fornecidas durante o processo de configuração do Split de Pagamentos. A CONTRATADA não se
          responsabiliza por quaisquer erros ou imprecisões nas informações fornecidas pelo CLIENTE.
          A INSTITUIÇÃO PARCEIRA também não se responsabiliza por garantir que as condições comerciais estabelecidas entre as partes estejam refletidas com exatidão na
          ordem de criação de um Split de Pagamentos.
          As cobranças serão efetuadas por parte da conta originadora que emitiu a cobrança seguindo a periodicidade estabelecida no momento do envio das informações
          do Split de Pagamentos.
        </p>
      </section>

      <section class="space-y-3">
        <h3 class="text-[14px] font-bold text-black/80">2.5. Pagamentos e Liquidação</h3>
        <p class="text-[13px] leading-relaxed text-black/75">
          A INSTITUIÇÃO PARCEIRA se compromete a efetuar os pagamentos de acordo com as proporções definidas no Split de Pagamentos. Os pagamentos serão realizados
          dentro do prazo estipulado, sujeitos a eventuais atrasos ou interrupções causados por circunstâncias fora do controle da INSTITUIÇÃO PARCEIRA.
        </p>
      </section>

      <section class="space-y-3">
        <h3 class="text-[14px] font-bold text-black/80">2.6. Taxas e Deduções</h3>
        <p class="text-[13px] leading-relaxed text-black/75">
          As taxas referentes ao modelo de pagamento (Boleto, Pix, Cartão) serão cobradas da conta originadora da cobrança, ou seja, aquela que emitiu a cobrança.
          Após a criação da Cobrança com Split de Pagamentos e a conclusão do pagamento, não será possível reverter o processo. Será necessário que as partes que
          estão envolvidas no recebimento da cobrança resolvam qualquer questão entre si.
          Em casos de ocorrência de um chargeback em uma transação originada em uma subconta, e essa subconta não disponha de saldo suficiente para cobrir o montante
          em questão, a Conta Principal compromete-se a arcar com o reembolso necessário para sanar o chargeback.
        </p>
      </section>

      <section class="space-y-3">
        <h3 class="text-[14px] font-bold text-black/80">2.7. Alterações nos Termos</h3>
        <p class="text-[13px] leading-relaxed text-black/75">
          A INSTITUIÇÃO PARCEIRA reserva-se o direito de modificar ou atualizar estes Termos a qualquer momento, mediante aviso prévio. As modificações entrarão em
          vigor após a publicação dos Termos atualizados na Plataforma.
        </p>
      </section>
    </section>

    <hr class="border-black/10" />

    <section class="space-y-4">
      <h2 class="text-[16px] sm:text-[18px] font-extrabold text-black/85">
        3. Da emissão de cobranças e dos meios de pagamento PIX e Cartão de Crédito
      </h2>

      <p class="text-[13px] leading-relaxed text-black/75">3.1 O CLIENTE poderá realizar a criação de cobrança e recebimento de pagamentos decorrentes de sua exclusiva atuação comercial com a venda de produtos ou prestação de serviços.</p>
      <p class="text-[13px] leading-relaxed text-black/75">3.2 Caberá ao CLIENTE optar pela modalidade de cobrança a ser emitida, dentre as diversas modalidades disponibilizadas pela CONTRATADA.</p>

      <p class="text-[13px] leading-relaxed text-black/75">
        3.2.1 Para as cobranças de cartão de crédito, o CLIENTE está ciente de que se aplicam as regras previstas na Resolução n. 264/2022 do Banco Central do Brasil
        ou norma que a substitua, inclusive no que dispõe quanto às obrigações de registro da agenda de recebíveis.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        3.2.1.1 Caso o CLIENTE utilize o mecanismo de divisão de valores “split”, está ciente de que a CONTRATADA registrará o valor remanescente da unidade de
        recebível de cartão, subtraindo os valores já descontados em razão da configuração do “split” feito no sistema F10.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        3.2.1.2 O CLIENTE declara que mantêm relação contratual formalizada com todos os terceiros favorecidos pelo recebimento de valores decorrentes dos “splits”
        mencionados no item anterior, comprometendo-se, desde já, a apresentar documentação comprobatória de tal relação, sempre que requisitado pela CONTRATADA.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        3.3 A CONTRATADA é participante do PIX e oferece o meio de pagamento instantâneo de acordo com os procedimentos previstos nas normas e regulamentos do Banco
        Central do Brasil.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        3.4 O CLIENTE que tiver sua conta aprovada poderá cadastrar a chave PIX em sua conta digital, podendo cadastrar como chave a informação de chave aleatória.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        3.4 O CLIENTE não é obrigado a cadastrar uma chave PIX, entretanto, para emitir cobranças via Pix através do sistema F10, o CLIENTE deverá ter uma chave Pix
        cadastrada para possibilitar a vinculação da cobrança à sua conta digital no sistema F10.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        3.6 O CLIENTE está ciente que uma transação via Pix somente poderá ser alterada ou cancelada antes da confirmação do Pagamento. A liquidação do Pìx ocorre em
        tempo real, por esse motivo, após a confirmação, a transação não poderá ser cancelada.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        3.7 Todas as transações realizadas através do Pix estão sujeitas às disposições do presente ADENDO, inclusive às relativas ao monitoramento para fins de
        destinação de valores para verificar ocorrência de inconformidades.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        3.8 Para cobranças realizadas via cartão de crédito serão cobradas taxas específicas no momento da liquidação, os créditos das vendas destes serviços serão
        creditados na conta do CLIENTE no prazo médio de 32 (trinta e dois) dias após a confirmação de pagamento.
      </p>
    </section>

    <hr class="border-black/10" />

    <section class="space-y-4">
      <h2 class="text-[16px] sm:text-[18px] font-extrabold text-black/85">
        4. Obrigações da INSTITUIÇÃO PARCEIRA
      </h2>

      <p class="text-[13px] leading-relaxed text-black/75">4.1. Manter as informações do CLIENTE em seus servidores, incluindo, mas não se limitando, àqueles referentes ao cadastro do CLIENTE, mas também relativos a pedidos, produtos, serviços, transações financeiras e clientes.</p>
      <p class="text-[13px] leading-relaxed text-black/75">4.2. Prestar serviços conforme as Condições de Prestação de Serviços contidas neste contrato.</p>
      <p class="text-[13px] leading-relaxed text-black/75">4.3. Disponibilizar o dinheiro no prazo estabelecido, exceto em caso de problemas decorrentes de atividades que não tenha controle ou que estejam contidos nas condições de prestação de serviços previstas neste termo de uso.</p>

      <p class="text-[13px] leading-relaxed text-black/75">
        4.4. A INSTITUIÇÃO PARCEIRA obriga-se a manter público este contrato no endereço
        <a class="font-semibold underline text-black/80 hover:text-black" href="https://www.celcoin.com.br/compliance-e-regulatorio" target="_blank" rel="noopener">
          https://www.celcoin.com.br/compliance-e-regulatorio
        </a>
        e se reserva o direito de efetuar modificações em seu conteúdo.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        4.5. A INSTITUIÇÃO PARCEIRA garante que serão disponibilizadas, ao CLIENTE, as seguintes funcionalidades de segurança, nas transações realizadas por meio da
        “Plataforma” da INSTITUIÇÃO PARCEIRA: (i) criptografia de ponta a ponta em todas as suas transações realizadas por cartão de crédito, inclusive para os links
        de pagamento onde a forma de pagamento subjacente escolhida seja o cartão de crédito; (ii) certificação Payment Card Industry Data Security Standard
        (“PCI-DSS”), o que significa que seus controles de segurança de dados de cartão de crédito são realizados segundo as Normas do PCI Council, notadamente o
        PCI-DSS, e auditados anualmente; e (iii) criptografia no tráfego de dados pessoais transacionados através da “Plataforma” da INSTITUIÇÃO PARCEIRA.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        4.6. Dada a impossibilidade de garantia de funcionamento integral e ininterrupto de qualquer sistema de telecomunicações e informática durante 365 (trezentos
        e sessenta e cinco) dias por ano, 24 (vinte e quatro) horas por dia, a INSTITUIÇÃO PARCEIRA não garante a prestação dos serviços ininterruptamente e isenta de
        erros e indisponibilidades, não se responsabilizando por eventuais falhas no processamento de pagamentos devido à indisponibilidade temporária dos serviços,
        inclusive por falha nos serviços de processamento de dados de terceiros.
      </p>
    </section>

    <hr class="border-black/10" />

    <section class="space-y-4">
      <h2 class="text-[16px] sm:text-[18px] font-extrabold text-black/85">
        5. Limitações de responsabilidade e indenização
      </h2>

      <p class="text-[13px] leading-relaxed text-black/75">
        5.1. A INSTITUIÇÃO PARCEIRA esclarece que atua como intermediador de transações realizadas entre o CLIENTE e o seus clientes, sendo responsável apenas pelo
        processamento de pagamentos efetuados pelos clientes, de modo que, em nenhuma hipótese será considerado fornecedor ou parte na cadeia de fornecimento de
        serviços nos termos do Código de Defesa do Consumidor, assim, o CLIENTE reconhece que a INSTITUIÇÃO PARCEIRA não terá nenhuma responsabilidade quanto:
      </p>

      <ol class="ml-5 list-[lower-roman] space-y-2 text-[13px] leading-relaxed text-black/75">
        <li>à existência de riscos relativos aos serviços prestados aos seus Clientes, em especial quanto à periculosidade ou nocividade;</li>
        <li>à insuficiência e/ou inadequação das informações sobre as características dos serviços;</li>
        <li>à prática de publicidade enganosa ou abusiva, bem como práticas comerciais coercitivas, desleais ou abusivas contra Consumidores;</li>
        <li>aos problemas com a entrega ou na prestação dos serviços contratados entre o CLIENTE e seus Clientes, defeitos, vícios de qualidade ou quantidade, ou vícios decorrentes de disparidade com as indicações constantes em embalagens, rótulos, recipientes ou mensagens publicitárias.</li>
      </ol>

      <p class="text-[13px] leading-relaxed text-black/75">
        5.2. A INSTITUIÇÃO PARCEIRA, não poderá ser responsabilizada pelas transações comerciais efetuadas pelo CLIENTE ou pelos Parceiros de Negócios, incluindo,
        mas não se limitando a fraudes e/ou prejuízos decorrentes destas transações.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        5.3. Os Serviços prestados pela INSTITUIÇÃO PARCEIRA são submetidos às regras do Banco Central do Brasil, sendo sua atividade a de uma instituição de pagamento
        para fins de prestação de serviços de infraestrutura de automação financeira, limitando-se, portanto, à gestão do processamento de recebimentos e pagamentos
        do CLIENTE, sem qualquer ingerência sobre as atividades por ele desenvolvidas.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        5.4. A INSTITUIÇÃO PARCEIRA somente é responsável pela captura e processamento das transações, de modo que, em nenhuma hipótese, poderá ser responsabilizada por
        falhas na segurança do ambiente online, aplicativo e/ou dispositivos do CLIENTE e/ou seus Parceiros Comerciais, inclusive no que tange ao local onde são
        inseridas os dados e informações dos clientes finais.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        5.5. O CLIENTE assume integral e exclusiva responsabilidade por si e por seus Parceiros de Negócio (caso haja), perante a INSTITUIÇÃO PARCEIRA e terceiros, e
        concorda em indenizar e manter ilesa a INSTITUIÇÃO PARCEIRA de todo e qualquer prejuízo decorrente de:
      </p>

      <ol class="ml-5 list-[lower-roman] space-y-2 text-[13px] leading-relaxed text-black/75">
        <li>violação das cláusulas e condições constantes neste Contrato e nos demais documentos integrantes;</li>
        <li>inexatidão ou falsidade das informações prestadas à INSTITUIÇÃO PARCEIRA e declarações constantes neste Contrato;</li>
        <li>descumprimento da legislação aplicável ao negócio e/ou atividade desenvolvida pelo CLIENTE;</li>
        <li>uso dos serviços para a prática de atos considerados ilegais, abusivos ou contrários à moral e aos bons costumes; e</li>
        <li>falta de recolhimento dos tributos aplicáveis aos negócios e/ou atividade desenvolvida pelo CLIENTE.</li>
      </ol>

      <p class="text-[13px] leading-relaxed text-black/75">
        5.6. Na hipótese de a INSTITUIÇÃO PARCEIRA ser demandada por terceiro, seja pela via administrativa ou judicial, em decorrência de prática pelo CLIENTE ou seus
        Parceiros Comerciais ou seus clientes, de qualquer violação legal ou violação às práticas descritas acima, o CLIENTE se compromete a assumir exclusivamente o
        polo passivo da demanda, devendo solicitar e corroborar para exclusão da INSTITUIÇÃO PARCEIRA do polo passivo, bem como arcar integral e exclusivamente com
        todas as custas judiciais, despesas e honorários advocatícios relacionados à demanda, inclusive nos casos onde a exclusão da INSTITUIÇÃO PARCEIRA polo passivo
        não for possível.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        5.6.1. O CLIENTE autoriza expressamente o bloqueio de saldo de valores mantidos na Conta Principal ou nas Subcontas atreladas, sobre prejuízos decorrentes de
        atos do CONTRATANTE, os quais poderão corresponder a Chargebacks, cancelamentos, despesas judiciais ou administrativas, multas e/ou penalidades aplicadas pela
        rede de pagamento ou por autoridades governamentais ao CLIENTE e qualquer outro valor que seja de sua exclusiva responsabilidade, sem prejuízo da possibilidade
        de rescisão deste Contrato.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        5.7. O CLIENTE será responsabilizado, inclusive, mas não se limitando a, sempre que ele:
      </p>

      <ol class="ml-5 list-[lower-roman] space-y-2 text-[13px] leading-relaxed text-black/75">
        <li>Praticar o serviço com atraso;</li>
        <li>Entregar serviço com defeito e/ou divergência das informações fornecidas ao Consumidor;</li>
        <li>Desistir da prática do serviço;</li>
        <li>Praticar qualquer falta, intencional ou não, na relação de consumo;</li>
        <li>Coletar ou tratar dados pessoais em desacordo com as obrigações impostas pelo CLIENTE, que é o controlador de dados pessoais nessa relação jurídica;</li>
        <li>Realizar ato comprovadamente danoso à imagem da INSTITUIÇÃO PARCEIRA, ainda que o dano de imagem seja potencial e não tenha se materializado.</li>
      </ol>

      <p class="text-[13px] leading-relaxed text-black/75">
        5.8. Caso o CLIENTE não possua saldo, este deverá ressarcir a INSTITUIÇÃO PARCEIRA no prazo de 5 (cinco) dias da ciência da existência do débito, sob pena da
        adoção das medidas judiciais cabíveis, bem como incidência de juros e correção monetária de 1% ao mês em razão do atraso, ficando autorizada desde já a
        compensação com eventual saldo ou agenda de recebível havido na Conta Principal, ou em eventual Subconta, nos termos deste Contrato.
      </p>
    </section>

    <hr class="border-black/10" />

    <section class="space-y-4">
      <h2 class="text-[16px] sm:text-[18px] font-extrabold text-black/85">
        6. Estornos e Chargebacks
      </h2>

      <p class="text-[13px] leading-relaxed text-black/75">
        6.1. O CLIENTE se responsabiliza em respeitar e observar as regras de estorno de cada arranjo de pagamento, devendo sempre manter boas práticas comerciais,
        com a finalidade de evitar chargebacks, como, por exemplo, conservar comprovantes de transações realizadas e cultivar políticas claras de cancelamento e
        restituição.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        6.1.1. Nos casos em que a INSTITUIÇÃO PARCEIRA receber notificação de chargeback, relacionada ao CONTRATANTE, fica este ciente que será notificado para adotar
        as providências necessárias junto ao consumidor final, no prazo máximo de 4 (quatro) dias. Paralelamente, a INSTITUIÇÃO PARCEIRA poderá seguir com o bloqueio
        do valor contestado. No mesmo prazo, o CLIENTE se compromete a enviar a documentação solicitada que comprove o pedido e forneça o embasamento para as
        solicitações de chargeback, de acordo com todas as regras de Bandeiras definidas a respeito.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        6.1.2. Se o CLIENTE não notificar a INSTITUIÇÃO PARCEIRA sobre o resultado do chargeback, no prazo estipulado na cláusula anterior, ou ainda, se o resultado
        apontado pelo instituidor do arranjo for desfavorável ao CLIENTE ficando confirmado o chargeback, a INSTITUIÇÃO PARCEIRA descontará os valores devidos
        diretamente da conta principal ou da subconta do CLIENTE, podendo ainda utilizar-se de processo de cobrança dos valores devidos, caso não haja saldo suficiente
        na conta do CLIENTE.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        6.1.3. A fim de evitar a ocorrência de chargeback, caso os dados utilizados nas transações associadas ao CLIENTE ou de seus Parceiros de Negócio constem na
        listagem de dados de transações fraudulentas repassadas pelos integrantes da rede de pagamento e/ou Bandeiras, a INSTITUIÇÃO PARCEIRA compromete-se em
        realizar o estorno do valor, fazendo o desconto dos valores diretamente da Conta principal e/ou Subconta que realizou a emissão da fatura.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        6.1.4. Nos casos onde o CLIENTE ultrapassar o limite de chargebacks, definido pela INSTITUIÇÃO PARCEIRA, fica este ciente que estará sujeito, isoladamente ou
        cumulativa, às seguintes penalidades, a critério exclusivo da INSTITUIÇÃO PARCEIRA: (i) suspensão/limitação dos serviços prestados pela INSTITUIÇÃO PARCEIRA
        como, por exemplo, o serviço de antecipação, (ii) limitação do valor das transações de cartão de crédito emitidas pelo CLIENTE; (iii) suspensão de saque por
        até 120 (cento e vinte) dias; e (iv) suspensão/limitação da Conta por um período de até 120 (cento e vinte) dias.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        6.1.5. Caso haja reincidência na ultrapassagem do limite de chargebacks previsto no painel do cliente, além das penalidades previstas na cláusula anterior, o
        CLIENTE ainda estará sujeito à suspensão da Conta principal e/ou Subconta por um período adicional de 120 (cento e vinte) dias e aplicação de multa de 50%
        sobre o valor de chargeback apurado no período acima indicado.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        6.2. O CLIENTE concorda e autoriza desde já que a INSTITUIÇÃO PARCEIRA debite de sua Conta Principal – inclusive mediante retenção de recebíveis – todo e
        qualquer valor devido por prejuízos sofridos pela INSTITUIÇÃO PARCEIRA em decorrência dos atos do CLIENTE e/ou de seus Parceiros de Negócios, titulares das
        Subcontas, os quais poderão corresponder a chargeback, cancelamentos, contestações, despesas judiciais ou administrativas, multas e/ou penalidades aplicadas
        pelos integrantes do arranjo de pagamento ou por autoridades governamentais em decorrências dos atos praticados pelo CLIENTE e/ou pelo Parceiro de Negócios,
        bem como qualquer outro valor que seja de responsabilidade do CLIENTE e/ou seu Parceiro de Negócio.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        6.3. Nos casos em que houver entendimento, pela INSTITUIÇÃO PARCEIRA, de que o chargeback é proveniente de desacordo comercial, fica reservado a esta o direito
        de debitar da Conta Principal ou das Subcontas do CLIENTE, o valor referente à compra contestada bem como valores adicionais que cubram proporcionalmente os
        custos de realização do processo de disputa.
      </p>
    </section>

    <hr class="border-black/10" />

    <section class="space-y-4">
      <h2 class="text-[16px] sm:text-[18px] font-extrabold text-black/85">
        7. Antecipação de recebíveis e/ou cessão dos recebíveis
      </h2>

      <p class="text-[13px] leading-relaxed text-black/75">
        7.1. A disponibilização e a manutenção do serviço de antecipação e/ou cessão de recebíveis está sujeita à análise da INSTITUIÇÃO PARCEIRA. Fica ainda
        reservado a INSTITUIÇÃO PARCEIRA o direito de negar e/ou cancelar a disponibilização deste serviço, caso se constate qualquer irregularidade e/ou risco
        operacional e/ou financeiro.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        7.2. O CONTRATANTE poderá solicitar, em dias úteis e durante o período de expediente bancário, a antecipação do prazo de pagamento dos recebíveis relativos às
        transações processadas pela INSTITUIÇÃO PARCEIRA, ficando ao exclusivo critério da INSTITUIÇÃO PARCEIRA, antecipar ou não os valores solicitados, por meio
        dos procedimentos descritos neste contrato. Assim, fica o CLIENTE ciente que: (i) a liberação deste serviço é sujeita à análise e poderá ser condicionada à
        prestação de garantia; (ii) os preços relativos à antecipação de recebíveis poderão variar mensalmente.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        7.3. O CONTRATANTE concorda que as taxas relativas a este serviço poderão variar mensalmente, conforme o disposto na Plataforma, sendo de sua exclusiva
        responsabilidade realizar a consulta das taxas antes da utilização deste serviço.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        7.3.1. O CLIENTE poderá solicitar a antecipação dos recebíveis relativos às transações processadas através da “plataforma” da INSTITUIÇÃO PARCEIRA, ficando a
        critério desta, antecipar ou não os valores solicitados.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        7.4. A INSTITUIÇÃO PARCEIRA poderá, diretamente ou através de seus parceiros de antecipação, cancelar a liquidação antecipada oferecida pelo CLIENTE, sem
        qualquer penalidade, nas hipóteses em que ocorram fatos alheios que dificultem ou impossibilitem a obtenção de crédito pela INSTITUIÇÃO PARCEIRA e/ou seus
        parceiros de antecipação, tornando indisponível a opção de liquidação antecipada a seu favor.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        7.5. O CLIENTE desde já autoriza o débito na sua conta de domicílio bancário de todos os valores, taxas e tarifas incidentes, em caso de antecipação e/ou
        cessão de crédito dos recebíveis.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        7.6. O CLIENTE fica ciente que responderá pela legitimidade e legalidade das transações que originaram os recebíveis negociados e sua regularidade de acordo
        com este Contrato, sob pena de estorno, débito ou cancelamento, que poderão ocorrer nos prazos previstos neste Contrato, independentemente da vigência de
        eventuais negociações de recebíveis.
      </p>
    </section>

    <hr class="border-black/10" />

    <section class="space-y-4">
      <h2 class="text-[16px] sm:text-[18px] font-extrabold text-black/85">
        8. Prazo e Rescisão
      </h2>

      <p class="text-[13px] leading-relaxed text-black/75">8.1. Este Termo é celebrado por prazo indeterminado, entrando em vigor na data de seu aceite.</p>

      <p class="text-[13px] leading-relaxed text-black/75">
        8.2. É reservado a INSTITUIÇÃO PARCEIRA o direito de alterar este Contrato a qualquer tempo e a seu critério. O CONTRATANTE se compromete a utilizar a
        “plataforma” para verificação das alterações realizadas pela INSTITUIÇÃO PARCEIRA.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        8.2.1. A INSTITUIÇÃO PARCEIRA, não poderá ser responsabilizada por qualquer perda ou prejuízo se o não recebimento das informações acerca das alterações deste
        Contrato ocorrerem em razão da desatualização do cadastro do CONTRATANTE.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        8.3. Qualquer das Partes poderá rescindir este Contrato a qualquer tempo, mediante notificação com 30 (trinta) dias de antecedência.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        8.4. O presente Contrato poderá ser rescindido de pleno direito, independentemente de qualquer notificação ou interpelação, judicial ou extrajudicial, nos
        casos de (i) descumprimento por qualquer das Partes de quaisquer obrigações ou declarações assumidas ou prestadas no âmbito deste Contrato; (ii)
        comprometimento, pelo CONTRATANTE e/ou por seus Parceiros de Negócio, da imagem pública da INSTITUIÇÃO PARCEIRA ou de qualquer um de seus parceiro na
        prestação dos Serviços; (iii) atingimento, pelo CONTRATANTE ou seus Parceiros de Negócio, do limite máximo (percentual) de chargebacks e/ou transações
        fraudulentas; (iv) constatação de inatividade da Conta principal e/ou Subconta por mais de 90 (noventa) dias.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        8.5. Caso a rescisão do Contrato ocorra por qualquer uma das razões mencionadas na Cláusula acima, por culpa do CONTRATANTE, fica a INSTITUIÇÃO PARCEIRA
        autorizada a bloquear seu acesso à sua Conta Principal e as eventuais Subcontas, até que o CONTRATANTE a indenize por todos os prejuízos sofridos.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        8.6. A rescisão do presente Contrato, por qualquer motivo, não prejudicará o direito da INSTITUIÇÃO PARCEIRA de haver quantias que porventura lhe são devidas
        relativamente aos Serviços prestados anteriormente à data da rescisão, nem de haver indenização por eventuais prejuízos sofridos.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        8.7. Em caso de rescisão, salvaguardado os cenários onde as retenções em razão do disposto neste Contrato sejam aplicáveis, os saques de quaisquer saldos
        remanescentes, após a rescisão, serão realizados manualmente, por meio do canal de suporte.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        8.8 Em caso de rescisão do presente contrato referente à PLATAFORMA junto à LICENCIANTE, este ADENDO será rescindido automaticamente, já que o SERVIÇO tem a
        PLATAFORMA como premissa para funcionamento.
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        8.9. Em qualquer hipótese de rescisão, o CONTRATANTE concorda que sua Conta Principal será encerrada.
      </p>
    </section>

    <hr class="border-black/10" />

    <section class="pt-2">
      <div class="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p class="text-[13px] leading-relaxed text-amber-950">
          <strong>Assinatura:</strong> {{TERM_CITY}}, {{TERM_DATE_LONG}}
        </p>
      </div>
    </section>
  </div>
</article>
`;
