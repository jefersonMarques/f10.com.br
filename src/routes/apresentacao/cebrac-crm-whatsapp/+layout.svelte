<script lang="ts">
  import { onMount } from "svelte";
  import { FileText, MessagesSquare, UserCheck, Workflow } from "lucide-svelte";
  import "../../../cebrac-whatsapp-section.css";

  let whatsappSection: HTMLElement;

  onMount(() => {
    const shell = document.querySelector<HTMLElement>(".cebrac-presentation-route .page-shell");
    const investmentSection = shell?.querySelector<HTMLElement>("#investimento");
    const previousSection = shell?.querySelector<HTMLElement>("#whatsapp, .model-whatsapp-section");

    if (!shell || !investmentSection || !whatsappSection) {
      return;
    }

    if (previousSection && previousSection !== whatsappSection) {
      previousSection.remove();
    }

    whatsappSection.id = "whatsapp";
    investmentSection.before(whatsappSection);
    whatsappSection.classList.remove("whatsapp-section-pending");
  });
</script>

<svelte:head>
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="F10 Software" />
  <meta property="og:title" content="CRM e WhatsApp integrados | Rede Cebrac + F10" />
  <meta
    property="og:description"
    content="Uma nova rotina comercial para acompanhar leads até a matrícula e manter o relacionamento com alunos dentro do F10."
  />
  <meta property="og:url" content="https://f10.com.br/apresentacao/cebrac-crm-whatsapp" />
  <meta property="og:image" content="https://f10.com.br/cebrac-crm-whatsapp-og.jpg" />
  <meta property="og:image:secure_url" content="https://f10.com.br/cebrac-crm-whatsapp-og.jpg" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="600" />
  <meta property="og:image:height" content="315" />
  <meta
    property="og:image:alt"
    content="CRM e WhatsApp integrados para a Rede Cebrac e F10"
  />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="CRM e WhatsApp integrados | Rede Cebrac + F10" />
  <meta
    name="twitter:description"
    content="Uma nova rotina comercial para acompanhar leads até a matrícula e manter o relacionamento com alunos dentro do F10."
  />
  <meta name="twitter:image" content="https://f10.com.br/cebrac-crm-whatsapp-og.jpg" />
</svelte:head>

<div class="cebrac-presentation-route">
  <slot />

  <section
    bind:this={whatsappSection}
    class="cebrac-whatsapp-section whatsapp-section-pending scroll-mt-16"
    aria-labelledby="cebrac-whatsapp-title"
  >
    <div class="cebrac-whatsapp-container">
      <div class="cebrac-whatsapp-heading">
        <div>
          <p class="cebrac-whatsapp-kicker">
            <img src="/icon_whatsapp_color.svg" alt="" aria-hidden="true" />
            <span>WhatsApp integrado · incluído no upgrade</span>
          </p>

          <h2 id="cebrac-whatsapp-title">
            Cinco números incluídos para atender em equipe e manter cada conversa dentro da operação.
          </h2>
        </div>

        <div class="cebrac-whatsapp-intro">
          <p>
            Os números poderão ser distribuídos entre o CRM de Leads e o F10 conforme a rotina da unidade. O atendimento deixa de depender de um aparelho específico e passa a ter histórico centralizado, continuidade entre usuários e identificação de quem respondeu.
          </p>

          <div class="cebrac-whatsapp-highlights">
            <div class="cebrac-whatsapp-highlight">
              <span class="cebrac-whatsapp-highlight-icon">
                <UserCheck size={21} strokeWidth={1.9} />
              </span>
              <span>
                <strong>Atendimento compartilhado.</strong> Usuários autorizados acompanham o mesmo número sem disputar o celular.
              </span>
            </div>

            <div class="cebrac-whatsapp-highlight">
              <span class="cebrac-whatsapp-highlight-icon">
                <FileText size={21} strokeWidth={1.9} />
              </span>
              <span>
                <strong>Histórico preservado.</strong> A equipe e a gestão continuam cada conversa com contexto e responsabilidade.
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="cebrac-whatsapp-package">
        <div class="cebrac-whatsapp-total">
          <strong>5</strong>
          <span>Números incluídos</span>
          <small>por unidade</small>
        </div>

        <article class="cebrac-whatsapp-channel">
          <span class="cebrac-whatsapp-channel-icon">
            <MessagesSquare size={24} strokeWidth={1.8} />
          </span>
          <div>
            <small>No CRM de Leads</small>
            <h3>Atendimento comercial</h3>
            <p>
              Leads, negociações e follow-ups ficam vinculados à oportunidade, com o contexto preservado durante toda a jornada até a matrícula.
            </p>
          </div>
        </article>

        <article class="cebrac-whatsapp-channel">
          <span class="cebrac-whatsapp-channel-icon">
            <Workflow size={24} strokeWidth={1.8} />
          </span>
          <div>
            <small>No F10</small>
            <h3>Relacionamento e rotina da unidade</h3>
            <p>
              Alunos e responsáveis podem ser atendidos em cobranças, secretaria, avisos, documentos, matrículas e relacionamento pós-matrícula.
            </p>
          </div>
        </article>
      </div>

      <div class="cebrac-whatsapp-meta" aria-label="Condições do WhatsApp integrado">
        <div>
          <span>Distribuição dos cinco números</span>
          <strong>Definida com a unidade durante a implantação</strong>
        </div>
        <div>
          <span>Disponibilidade no F10</span>
          <strong>Agosto de 2026</strong>
        </div>
        <div>
          <span>Número adicional</span>
          <strong>R$ 49,00 por número/mês · CRM ou F10</strong>
        </div>
      </div>
    </div>
  </section>
</div>
