<script lang="ts">
  import { onMount } from "svelte";
  import {
    CalendarDays,
    History,
    MessageCircle,
    MessagesSquare,
    Smartphone,
    Users,
  } from "lucide-svelte";
  import "../../../cebrac-presentation.css";
  import "../../../cebrac-journey.css";
  import "../../../cebrac-whatsapp-section.css";

  let whatsappSection: HTMLElement;

  onMount(() => {
    const shell = document.querySelector<HTMLElement>(
      ".cebrac-presentation-route .page-shell",
    );

    if (!shell || !whatsappSection) {
      return;
    }

    const previousWhatsappSection = shell.querySelector<HTMLElement>(
      "#whatsapp, .model-whatsapp-section",
    );
    const investmentSection = shell.querySelector<HTMLElement>("#investimento");
    const implementationSection = shell.querySelector<HTMLElement>("#implantacao");
    const investmentNavLink = shell.querySelector<HTMLAnchorElement>(
      'a[href="#investimento"]',
    );

    if (previousWhatsappSection && previousWhatsappSection !== whatsappSection) {
      previousWhatsappSection.remove();
    }

    investmentSection?.remove();

    if (investmentNavLink) {
      investmentNavLink.href = "#whatsapp";
      investmentNavLink.textContent = "WhatsApp";
    }

    whatsappSection.id = "whatsapp";

    if (implementationSection) {
      implementationSection.before(whatsappSection);
    } else {
      shell.appendChild(whatsappSection);
    }

    whatsappSection.classList.remove("whatsapp-section-pending");

    const revealSelector = [
      "#motivo .section-label",
      "#motivo .section-title",
      "#motivo .journey-panel",
      "#modelo .section-label",
      "#modelo h2",
      "#modelo .feature-line",
      "#beneficios .section-label",
      "#beneficios .section-title",
      "#beneficios .benefit-column",
      "#comparacao .comparison-row",
      "#whatsapp .cebrac-whatsapp-heading",
      "#whatsapp .cebrac-whatsapp-visual",
      "#whatsapp .cebrac-whatsapp-details",
      "#implantacao .implementation-step",
    ].join(",");

    const elements = Array.from(
      shell.querySelectorAll<HTMLElement>(revealSelector),
    );
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    elements.forEach((element, index) => {
      element.classList.add("cebrac-reveal");
      element.style.setProperty(
        "--cebrac-reveal-delay",
        `${(index % 4) * 70}ms`,
      );
    });

    if (reduceMotion || !("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -8% 0px",
      },
    );

    requestAnimationFrame(() => {
      elements.forEach((element) => observer.observe(element));
    });

    return () => observer.disconnect();
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
      <header class="cebrac-whatsapp-heading">
        <p class="cebrac-whatsapp-kicker">
          <img src="/icon_whatsapp_color.svg" alt="" aria-hidden="true" />
          <span>WhatsApp integrado ao F10</span>
        </p>

        <h2 id="cebrac-whatsapp-title">
          Atendimento organizado no sistema e a conversa acompanhada também pelo celular.
        </h2>

        <p>
          A equipe visualiza as conversas em uma lista centralizada, atende alunos e responsáveis e mantém o histórico disponível para dar continuidade ao relacionamento.
        </p>
      </header>

      <figure class="cebrac-whatsapp-visual">
        <div class="cebrac-whatsapp-visual-stage">
          <img
            class="cebrac-whatsapp-list-image"
            src="/apresentacao/cebrac-crm-whatsapp/lista_chat_whatsapp_f10.png"
            alt="Lista de conversas do WhatsApp integrada à tela do sistema F10"
            loading="lazy"
            decoding="async"
          />

          <img
            class="cebrac-whatsapp-phone-image"
            src="/apresentacao/cebrac-crm-whatsapp/celular_chat_f10.png"
            alt="Conversa de um aluno no WhatsApp exibida em um smartphone"
            loading="lazy"
            decoding="async"
          />
        </div>

        <figcaption>
          A lista permanece ao fundo para representar a operação da unidade, enquanto o smartphone mostra a experiência do aluno ou responsável.
        </figcaption>
      </figure>

      <div
        class="cebrac-whatsapp-details"
        role="table"
        aria-label="Detalhes do WhatsApp integrado"
      >
        <div class="cebrac-whatsapp-detail" role="cell">
          <span class="cebrac-whatsapp-detail-icon">
            <MessagesSquare size={23} strokeWidth={1.8} />
          </span>
          <div>
            <span>Números incluídos</span>
            <strong>5 por unidade</strong>
          </div>
        </div>

        <div class="cebrac-whatsapp-detail" role="cell">
          <span class="cebrac-whatsapp-detail-icon">
            <Users size={23} strokeWidth={1.8} />
          </span>
          <div>
            <span>Atendimento</span>
            <strong>Compartilhado pela equipe</strong>
          </div>
        </div>

        <div class="cebrac-whatsapp-detail" role="cell">
          <span class="cebrac-whatsapp-detail-icon">
            <History size={23} strokeWidth={1.8} />
          </span>
          <div>
            <span>Histórico</span>
            <strong>Preservado no sistema</strong>
          </div>
        </div>

        <div class="cebrac-whatsapp-detail" role="cell">
          <span class="cebrac-whatsapp-detail-icon">
            <CalendarDays size={23} strokeWidth={1.8} />
          </span>
          <div>
            <span>Disponibilidade no F10</span>
            <strong>Agosto de 2026</strong>
          </div>
        </div>
      </div>

      <div class="cebrac-whatsapp-distribution">
        <span class="cebrac-whatsapp-distribution-icon">
          <Smartphone size={24} strokeWidth={1.8} />
        </span>
        <p>
          <strong>Distribuição flexível.</strong> Os cinco números poderão ser organizados entre o CRM de Leads e o F10 durante a implantação, conforme a estrutura de atendimento de cada unidade.
        </p>
        <MessageCircle size={28} strokeWidth={1.7} aria-hidden="true" />
      </div>
    </div>
  </section>
</div>
