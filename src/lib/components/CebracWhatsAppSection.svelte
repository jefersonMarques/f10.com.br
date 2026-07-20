<script lang="ts">
  import { onMount } from "svelte";
  import {
    CalendarCheck2,
    CheckCircle2,
    MessageCircleMore,
    MessagesSquare,
    Plus,
    UsersRound,
    Workflow,
  } from "lucide-svelte";

  let sectionElement: HTMLElement;

  const channels = [
    {
      title: "CRM de Leads",
      description: "Atendimento comercial com as conversas vinculadas à oportunidade, ao responsável e à etapa do funil.",
      example: "2 números no exemplo",
      icon: Workflow,
    },
    {
      title: "F10",
      description: "Relacionamento com alunos e responsáveis para avisos, orientações, cobranças e acordos.",
      example: "3 números no exemplo",
      icon: UsersRound,
    },
  ];

  onMount(() => {
    const previousSection = document.querySelector<HTMLElement>(".model-whatsapp-section");
    const implantationSection = document.querySelector<HTMLElement>("#implantacao");

    previousSection?.setAttribute("hidden", "");

    if (implantationSection && sectionElement) {
      implantationSection.before(sectionElement);
    }

    return () => {
      previousSection?.removeAttribute("hidden");
    };
  });
</script>

<section bind:this={sectionElement} id="whatsapp" class="whatsapp-section scroll-mt-16">
  <div class="whatsapp-container">
    <header class="whatsapp-heading">
      <div class="whatsapp-heading-icon" aria-hidden="true">
        <MessageCircleMore size={28} strokeWidth={1.9} />
      </div>
      <span>WhatsApp integrado</span>
      <h2>Cinco números incluídos para conectar a operação comercial e o relacionamento da unidade.</h2>
      <p>
        Cada unidade poderá distribuir os cinco números entre o CRM de Leads e o F10 conforme sua estrutura de atendimento. A configuração será definida durante a implantação.
      </p>
    </header>

    <div class="whatsapp-main">
      <article class="whatsapp-included">
        <div class="included-icon" aria-hidden="true">
          <MessagesSquare size={30} strokeWidth={1.8} />
        </div>
        <span>Incluído no upgrade</span>
        <div class="included-count">
          <strong>5</strong>
          <div>
            <b>números de WhatsApp</b>
            <small>por unidade</small>
          </div>
        </div>
        <p>Os números podem ser usados no CRM, no F10 ou divididos entre as duas operações.</p>
        <div class="availability-badge">
          <CalendarCheck2 size={18} strokeWidth={2} />
          Disponível a partir de agosto de 2026
        </div>
      </article>

      <article class="whatsapp-distribution">
        <div class="distribution-heading">
          <div>
            <span>Distribuição flexível</span>
            <h3>A unidade define onde cada número será utilizado.</h3>
          </div>
          <div class="distribution-total">5 números</div>
        </div>

        <div class="channel-grid">
          {#each channels as channel}
            <div class="channel-item">
              <div class="channel-icon" aria-hidden="true">
                <svelte:component this={channel.icon} size={23} strokeWidth={1.9} />
              </div>
              <div>
                <span>{channel.example}</span>
                <h4>{channel.title}</h4>
                <p>{channel.description}</p>
              </div>
            </div>
          {/each}
        </div>

        <div class="number-distribution" aria-label="Exemplo com dois números no CRM e três números no F10">
          <div class="number-group number-group-crm">
            <span>CRM</span>
            <div><b>01</b><b>02</b></div>
          </div>
          <div class="number-divider" aria-hidden="true">
            <Workflow size={22} strokeWidth={1.8} />
          </div>
          <div class="number-group number-group-f10">
            <span>F10</span>
            <div><b>03</b><b>04</b><b>05</b></div>
          </div>
        </div>

        <p class="distribution-note">
          <CheckCircle2 size={18} strokeWidth={2.1} />
          A divisão 2 + 3 é apenas um exemplo. Os cinco números podem ser distribuídos em qualquer combinação necessária.
        </p>
      </article>
    </div>

    <div class="whatsapp-facts">
      <article>
        <div class="fact-icon"><Workflow size={23} strokeWidth={1.9} /></div>
        <div>
          <span>Na operação comercial</span>
          <strong>Conversas dentro do contexto do lead</strong>
          <p>O histórico acompanha a oportunidade e permanece disponível para a equipe e para a gestão.</p>
        </div>
      </article>

      <article>
        <div class="fact-icon"><MessageCircleMore size={23} strokeWidth={1.9} /></div>
        <div>
          <span>No relacionamento</span>
          <strong>Comunicação com alunos e responsáveis</strong>
          <p>Avisos, orientações, cobranças e acordos passam a fazer parte da operação do F10.</p>
        </div>
      </article>

      <article>
        <div class="fact-icon"><Plus size={23} strokeWidth={2} /></div>
        <div>
          <span>Números adicionais</span>
          <strong>R$ 49,00 por número/mês</strong>
          <p>Os números extras também poderão ser utilizados no CRM de Leads ou no F10.</p>
        </div>
      </article>
    </div>
  </div>
</section>

<style>
  .whatsapp-section {
    padding: 5rem 1.25rem;
    background: #eef2fb;
    color: #2b4091;
  }

  .whatsapp-container {
    width: 100%;
    max-width: 1480px;
    margin: 0 auto;
  }

  .whatsapp-heading {
    max-width: 920px;
    margin: 0 auto 3rem;
    text-align: center;
  }

  .whatsapp-heading-icon {
    display: flex;
    width: 54px;
    height: 54px;
    align-items: center;
    justify-content: center;
    margin: 0 auto 0.9rem;
    border-radius: 999px;
    background: rgba(81, 184, 76, 0.14);
    color: #51b84c;
  }

  .whatsapp-heading > span,
  .whatsapp-included > span,
  .distribution-heading span,
  .channel-item span,
  .whatsapp-facts article span {
    font-size: 0.72rem;
    font-weight: 850;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .whatsapp-heading > span {
    color: #51b84c;
  }

  .whatsapp-heading h2 {
    margin-top: 0.7rem;
    color: #17356f;
    font-size: clamp(2.15rem, 4vw, 3.55rem);
    font-weight: 700;
    letter-spacing: -0.045em;
    line-height: 1.08;
  }

  .whatsapp-heading p {
    max-width: 820px;
    margin: 1rem auto 0;
    color: rgba(43, 64, 145, 0.7);
    font-size: 1.05rem;
    line-height: 1.85rem;
  }

  .whatsapp-main {
    display: grid;
    grid-template-columns: minmax(300px, 0.72fr) minmax(0, 1.28fr);
    gap: 1.5rem;
    align-items: stretch;
  }

  .whatsapp-included,
  .whatsapp-distribution,
  .whatsapp-facts article {
    border-radius: 24px;
    box-shadow: 0 18px 45px rgba(43, 64, 145, 0.1);
  }

  .whatsapp-included {
    display: flex;
    min-height: 500px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: clamp(2rem, 4vw, 3.6rem) 2rem;
    background: #51b84c;
    color: white;
    text-align: center;
  }

  .included-icon {
    display: flex;
    width: 78px;
    height: 78px;
    align-items: center;
    justify-content: center;
    margin-bottom: 1.2rem;
    border: 1px solid rgba(255, 255, 255, 0.35);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.16);
  }

  .whatsapp-included > span {
    color: rgba(255, 255, 255, 0.9);
  }

  .included-count {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-top: 1.1rem;
  }

  .included-count > strong {
    color: white;
    font-size: clamp(5rem, 8vw, 7.4rem);
    font-weight: 760;
    letter-spacing: -0.08em;
    line-height: 0.85;
  }

  .included-count > div {
    display: grid;
    gap: 0.2rem;
    text-align: left;
  }

  .included-count b {
    max-width: 170px;
    color: white;
    font-size: 1.45rem;
    line-height: 1.55rem;
  }

  .included-count small {
    color: rgba(255, 255, 255, 0.75);
    font-size: 0.95rem;
    font-weight: 650;
  }

  .whatsapp-included > p {
    max-width: 380px;
    margin-top: 1.5rem;
    color: rgba(255, 255, 255, 0.84);
    font-size: 0.98rem;
    line-height: 1.65rem;
  }

  .availability-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.55rem;
    margin-top: 1.6rem;
    padding: 0.75rem 1rem;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.14);
    color: white;
    font-size: 0.82rem;
    font-weight: 750;
  }

  .whatsapp-distribution {
    overflow: hidden;
    border: 1px solid rgba(43, 64, 145, 0.12);
    background: white;
  }

  .distribution-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
    padding: 1.6rem 1.8rem;
    border-bottom: 1px solid rgba(43, 64, 145, 0.1);
    background: #2b4091;
    color: white;
  }

  .distribution-heading span {
    color: #ffcd40;
  }

  .distribution-heading h3 {
    margin-top: 0.3rem;
    color: white;
    font-size: 1.25rem;
    font-weight: 700;
    line-height: 1.65rem;
  }

  .distribution-total {
    flex: 0 0 auto;
    padding: 0.65rem 0.9rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-size: 0.82rem;
    font-weight: 800;
  }

  .channel-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0;
    padding: 0 1.8rem;
  }

  .channel-item {
    display: grid;
    grid-template-columns: 46px minmax(0, 1fr);
    gap: 1rem;
    padding: 1.8rem 1.5rem 1.8rem 0;
    border-bottom: 1px solid rgba(43, 64, 145, 0.1);
  }

  .channel-item + .channel-item {
    padding-right: 0;
    padding-left: 1.5rem;
    border-left: 1px solid rgba(43, 64, 145, 0.1);
  }

  .channel-icon,
  .fact-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 14px;
    background: rgba(81, 184, 76, 0.13);
    color: #51b84c;
  }

  .channel-icon {
    width: 46px;
    height: 46px;
  }

  .channel-item span,
  .whatsapp-facts article span {
    color: rgba(43, 64, 145, 0.5);
    font-size: 0.66rem;
  }

  .channel-item h4 {
    margin-top: 0.25rem;
    color: #17356f;
    font-size: 1.15rem;
    font-weight: 750;
  }

  .channel-item p {
    margin-top: 0.5rem;
    color: rgba(43, 64, 145, 0.66);
    font-size: 0.88rem;
    line-height: 1.5rem;
  }

  .number-distribution {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 1.2rem;
    align-items: center;
    margin: 1.6rem 1.8rem;
    padding: 1.35rem;
    border: 1px solid rgba(43, 64, 145, 0.1);
    border-radius: 18px;
    background: #f6f8fc;
  }

  .number-group {
    display: grid;
    gap: 0.65rem;
  }

  .number-group > span {
    color: rgba(43, 64, 145, 0.52);
    font-size: 0.68rem;
    font-weight: 850;
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }

  .number-group > div {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .number-group b {
    display: flex;
    width: 44px;
    height: 44px;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    font-size: 0.78rem;
    font-weight: 850;
  }

  .number-group-crm b {
    background: #2b4091;
    color: white;
  }

  .number-group-f10 b {
    background: #51b84c;
    color: white;
  }

  .number-divider {
    display: flex;
    width: 42px;
    height: 42px;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: #ffcd40;
    color: #2b4091;
  }

  .distribution-note {
    display: flex;
    gap: 0.65rem;
    align-items: flex-start;
    margin: 0 1.8rem 1.8rem;
    color: rgba(43, 64, 145, 0.65);
    font-size: 0.82rem;
    line-height: 1.4rem;
  }

  .distribution-note :global(svg) {
    flex: 0 0 auto;
    margin-top: 0.1rem;
    color: #51b84c;
  }

  .whatsapp-facts {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1.25rem;
    margin-top: 1.5rem;
  }

  .whatsapp-facts article {
    display: grid;
    grid-template-columns: 52px minmax(0, 1fr);
    gap: 1rem;
    min-height: 170px;
    align-content: center;
    padding: 1.5rem;
    border: 1px solid rgba(43, 64, 145, 0.1);
    background: white;
  }

  .fact-icon {
    width: 52px;
    height: 52px;
  }

  .whatsapp-facts article strong {
    display: block;
    margin-top: 0.3rem;
    color: #17356f;
    font-size: 1rem;
    font-weight: 750;
    line-height: 1.4rem;
  }

  .whatsapp-facts article p {
    margin-top: 0.45rem;
    color: rgba(43, 64, 145, 0.62);
    font-size: 0.82rem;
    line-height: 1.4rem;
  }

  @media (max-width: 1023px) {
    .whatsapp-main {
      grid-template-columns: minmax(0, 1fr);
    }

    .whatsapp-included {
      min-height: 0;
    }

    .whatsapp-facts {
      grid-template-columns: minmax(0, 1fr);
    }

    .whatsapp-facts article {
      min-height: 0;
    }
  }

  @media (max-width: 767px) {
    .whatsapp-section {
      padding: 4rem 1.25rem;
    }

    .whatsapp-heading {
      margin-bottom: 2.2rem;
      text-align: left;
    }

    .whatsapp-heading-icon {
      margin-left: 0;
    }

    .whatsapp-heading h2 {
      font-size: 2.15rem;
    }

    .included-count {
      align-items: flex-end;
    }

    .included-count > strong {
      font-size: 5rem;
    }

    .included-count b {
      font-size: 1.15rem;
      line-height: 1.3rem;
    }

    .availability-badge {
      border-radius: 16px;
    }

    .distribution-heading {
      align-items: flex-start;
      flex-direction: column;
      gap: 0.8rem;
      padding: 1.35rem 1.25rem;
    }

    .channel-grid {
      grid-template-columns: minmax(0, 1fr);
      padding: 0 1.25rem;
    }

    .channel-item,
    .channel-item + .channel-item {
      padding: 1.35rem 0;
      border-left: 0;
    }

    .number-distribution {
      grid-template-columns: minmax(0, 1fr);
      margin: 1.25rem;
    }

    .number-divider {
      transform: rotate(90deg);
    }

    .distribution-note {
      margin: 0 1.25rem 1.4rem;
    }

    .whatsapp-facts article {
      grid-template-columns: 46px minmax(0, 1fr);
      padding: 1.25rem;
      border-radius: 20px;
    }

    .fact-icon {
      width: 46px;
      height: 46px;
    }
  }
</style>
