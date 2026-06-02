// src/lib/legal/f10Terms/v2025_10_06.ts

/**
 * Template em HTML (versão fixa) para Termos de Uso da Funcionalidade de Emissão de Notas Fiscais.
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
        TERMOS DE USO DA FUNCIONALIDADE DE EMISSÃO DE NOTAS FISCAIS
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
        Pelo presente instrumento particular, as partes,
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        F10 Comércio de Computadores de Softwares Ltda, pessoa jurídica de direito privado, inscrita no CNPJ sob n. 06.027.705/0001-89, com sede na Rua Comendador Araújo, 143 3º andar - Centro, CEP: 80420-000 na cidade de Curitiba – PR – Brasil, a “CONTRATADA”, e
      </p>

      <p class="text-[13px] leading-relaxed text-black/75">
        <strong class="text-black/85">{{CLIENT_LEGAL_NAME}}</strong>, pessoa jurídica de direito privado, inscrita no CNPJ/MF sob nº <strong class="text-black/85">{{CLIENT_CNPJ}}</strong>, com sede na <strong class="text-black/85">{{CLIENT_ADDRESS}}</strong>, <strong class="text-black/85">{{CLIENT_NEIGHBORHOOD}}</strong>, <strong class="text-black/85">{{CLIENT_CITY}}</strong>, <strong class="text-black/85">{{CLIENT_STATE}}</strong>, na forma de seu contrato social, doravante denominada simplesmente, “CLIENTE” e,
      </p>
    </section>

    <section class="space-y-4">
      <h2 class="text-[16px] font-bold text-black/85">1. Da Natureza da Funcionalidade</h2>
      <p class="text-[13px] leading-relaxed text-black/75">1.1. A funcionalidade de emissão de Notas Fiscais de Produto (NF-e) e de Serviço (NFS-e), disponibilizada no ERP F10 Software, depende exclusivamente de integrações técnicas com sistemas de terceiros, incluindo, mas não se limitando a: Prefeituras Municipais; Órgãos Estaduais; Órgãos Federais; Empresas homologadas responsáveis por prover a infraestrutura técnica de integração fiscal.</p>
      <p class="text-[13px] leading-relaxed text-black/75">1.2. A F10 Software não é responsável pelo desenvolvimento, manutenção, estabilidade, disponibilidade ou continuidade dos sistemas de terceiros utilizados para a emissão de documentos fiscais.</p>
    </section>

    <section class="space-y-4">
      <h2 class="text-[16px] font-bold text-black/85">2. Da Dependência de Fornecedores Terceiros e Interrupções</h2>
      <p class="text-[13px] leading-relaxed text-black/75">2.1. O USUÁRIO declara ciência de que os serviços de integração fiscal utilizados para emissão de notas fiscais são prestados por fornecedores terceiros, os quais mantêm contratos próprios com os entes públicos.</p>
      <p class="text-[13px] leading-relaxed text-black/75">2.2. Em razão de fatores alheios à F10 Software, tais como: vencimento contratual; encerramento de contratos; processos de licitação pública; substituição de fornecedores; alterações técnicas, operacionais ou regulatórias; o serviço de integração fiscal poderá ser temporariamente ou definitivamente interrompido, sem qualquer ingerência da F10 Software.</p>
      <p class="text-[13px] leading-relaxed text-black/75">2.3. Nessas hipóteses, poderá ser necessária a implementação de nova integração técnica com o fornecedor eventualmente contratado pela Prefeitura, Estado ou União, o que poderá implicar: prazos adicionais para restabelecimento do serviço; ajustes técnicos no ERP; custos adicionais; indisponibilidade temporária da funcionalidade.</p>
    </section>

    <section class="space-y-4">
      <h2 class="text-[16px] font-bold text-black/85">3. Da Impossibilidade de Emissão de Notas Fiscais</h2>
      <p class="text-[13px] leading-relaxed text-black/75">3.1. Caso o sistema do fornecedor terceiro responsável pela integração fiscal esteja indisponível, instável ou inoperante, não será possível realizar a emissão de notas fiscais por meio do ERP F10 Software.</p>
      <p class="text-[13px] leading-relaxed text-black/75">3.2. A F10 Software não garante a emissão contínua, ininterrupta ou imediata de documentos fiscais, uma vez que tal atividade depende integralmente do funcionamento de sistemas externos.</p>
    </section>

    <section class="space-y-4">
      <h2 class="text-[16px] font-bold text-black/85">4. Da Isenção de Responsabilidade da F10 Software</h2>
      <p class="text-[13px] leading-relaxed text-black/75">4.1. A F10 Software não poderá ser responsabilizada, em nenhuma hipótese, por: falhas na emissão de notas fiscais decorrentes de indisponibilidade de terceiros; atrasos na autorização, validação ou retorno das notas fiscais; rejeições, erros ou inconsistências originadas nos sistemas dos entes públicos ou integradores; prejuízos financeiros, fiscais, operacionais ou legais decorrentes da não emissão ou atraso na emissão de documentos fiscais por motivos alheios à sua atuação.</p>
      <p class="text-[13px] leading-relaxed text-black/75">4.2. A responsabilidade da F10 Software limita-se exclusivamente ao funcionamento do ERP conforme especificações técnicas contratadas, não abrangendo obrigações fiscais, acessórias ou tributárias do USUÁRIO.</p>
    </section>

    <section class="space-y-4">
      <h2 class="text-[16px] font-bold text-black/85">5. Das Obrigações do Usuário</h2>
      <p class="text-[13px] leading-relaxed text-black/75">5.1. O USUÁRIO é o único e exclusivo responsável: pelo cumprimento de suas obrigações fiscais e tributárias; pela conferência das informações enviadas para emissão das notas fiscais; pela verificação da disponibilidade do serviço de emissão; pela adoção de meios alternativos de emissão de documentos fiscais, quando necessário.</p>
      <p class="text-[13px] leading-relaxed text-black/75">5.2. O USUÁRIO reconhece que o ERP F10 Software não substitui sistemas oficiais dos entes públicos, tampouco se responsabiliza por exigências legais específicas de cada município, estado ou órgão federal.</p>
    </section>

    <section class="space-y-4">
      <h2 class="text-[16px] font-bold text-black/85">ANEXO I – DA TABELA DE PREÇOS DA FUNCIONALIDADE DE EMISSÃO DE NOTAS FISCAIS</h2>
      <h3 class="text-[14px] font-semibold text-black/85">1. Da Precificação por Volume de Emissões</h3>
      <p class="text-[13px] leading-relaxed text-black/75">1.1. Pela utilização da funcionalidade de emissão de Notas Fiscais de Produto (NF-e) e/ou Serviço (NFS-e) no ERP F10 Software, o USUÁRIO concorda com a cobrança baseada na quantidade de notas fiscais efetivamente emitidas, conforme a seguinte tabela: R$ 0,50 (cinquenta centavos) por nota fiscal emitida</p>
      <p class="text-[13px] leading-relaxed text-black/75">1.2. O enquadramento do USUÁRIO na respectiva faixa de preço ocorrerá de acordo com o volume total de emissões realizadas no período de apuração definido contratualmente.</p>

      <h3 class="text-[14px] font-semibold text-black/85">2. Das Condições Gerais do Anexo</h3>
      <p class="text-[13px] leading-relaxed text-black/75">2.1. Os valores previstos neste Anexo: referem-se exclusivamente à funcionalidade de emissão de notas fiscais; não incluem tributos, encargos legais, integrações personalizadas ou serviços adicionais; poderão ser reajustados mediante comunicação prévia, conforme previsto no contrato principal.</p>
      <p class="text-[13px] leading-relaxed text-black/75">2.2. A cobrança independe do sucesso na autorização da Nota Fiscal pelos sistemas dos entes públicos, desde que a emissão tenha sido processada e transmitida pelo ERP F10 Software.</p>
      <p class="text-[13px] leading-relaxed text-black/75">2.3. A indisponibilidade de sistemas de terceiros não altera a estrutura de preços, permanecendo válidas as condições deste Anexo.</p>
    </section>
  </div>
</article>
`;