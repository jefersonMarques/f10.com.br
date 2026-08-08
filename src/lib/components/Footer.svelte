<script lang="ts">
  import IconArrowRight from "$lib/icons/IconArrowRight.svelte";
  import IconEmail from "$lib/icons/IconEmail.svelte";
  import IconPhone from "$lib/icons/IconPhone.svelte";
  import IconWhatsApp from "$lib/icons/IconWhatsApp.svelte";
  import f10LogoUrl from "$lib/assets/brand/f10-logo.svg?url&no-inline";
  import facebookIconUrl from "$lib/assets/brand/facebook-icon.svg?url&no-inline";
  import instagramIconUrl from "$lib/assets/brand/instagram-icon.svg?url&no-inline";
  import linkedinIconUrl from "$lib/assets/brand/linkedin-icon.svg?url&no-inline";
  import youtubeIconUrl from "$lib/assets/brand/youtube-icon.svg?url&no-inline";
  import { salesContact } from "$lib/config/contactConfig";
  import SocialLinks from "./SocialLinks.svelte";

  type FooterLeadPayload = {
    name: string;
    email: string;
    phone: string;
    createdAt: string;
    source: string;
    page: string;
    product: string;
    subSource: string;
    description: string;
  };

  type FbqFunction = (
    command: "track" | "trackCustom" | "init",
    eventName: string,
    parameters?: Record<string, unknown>,
  ) => void;

  const socialLinks = [
    {
      alt: "Facebook",
      src: facebookIconUrl,
      href: "https://www.facebook.com/F10Software",
    },
    {
      alt: "LinkedIn",
      src: linkedinIconUrl,
      href: "https://www.linkedin.com/company/f10software/",
    },
    {
      alt: "YouTube",
      src: youtubeIconUrl,
      href: "https://www.youtube.com/@f10software76",
    },
    {
      alt: "Instagram",
      src: instagramIconUrl,
      href: "https://www.instagram.com/f10software/",
    },
  ];

  let name = "";
  let email = "";
  let phone = "";
  let isSubmitting = false;
  let isSuccess = false;
  let errorMessage = "";

  function normalizePhone(rawPhone: string): string {
    const digits = rawPhone.replace(/\D/g, "");
    if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
      return digits.slice(2);
    }
    return digits;
  }

  function formatPhone(value: string): string {
    const digits = normalizePhone(value).slice(0, 11);

    if (digits.length <= 10) {
      return digits.replace(/(\d{0,2})(\d{0,4})(\d{0,4})/, (_, a, b, c) =>
        [a && `(${a}`, a && ") ", b, c && `-${c}`]
          .filter(Boolean)
          .join(""),
      );
    }

    return digits.replace(/(\d{2})(\d{1})(\d{4})(\d{4})/, "($1) $2$3-$4");
  }

  function onPhoneInput(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    phone = formatPhone(input.value);
  }

  function validateEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  function getCurrentPath(): string {
    if (typeof window === "undefined") return "/";
    return window.location?.pathname || "/";
  }

  function trackFooterLead(payload: FooterLeadPayload) {
    if (typeof window === "undefined") return;

    const fbq = (window as Window & { fbq?: FbqFunction }).fbq;
    if (!fbq) return;

    fbq("track", "Lead", {
      content_name: payload.product,
      content_category: "footer_lead_form",
      source: payload.source,
      page_path: payload.page,
      sub_source: payload.subSource,
    });
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();

    errorMessage = "";
    isSuccess = false;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const normalizedPhone = normalizePhone(phone);
    const currentPath = getCurrentPath();

    if (
      !trimmedName ||
      !validateEmail(trimmedEmail) ||
      normalizedPhone.length < 10
    ) {
      errorMessage =
        "Preencha nome, e-mail válido e WhatsApp com DDD.";
      return;
    }

    const payload: FooterLeadPayload = {
      name: trimmedName,
      email: trimmedEmail,
      phone: normalizedPhone,
      createdAt: new Date().toISOString(),
      source: currentPath,
      page: currentPath,
      product: "Footer – Transformar escola",
      subSource: "Formulário do rodapé",
      description:
        "Lead capturado pelo formulário do rodapé do site F10.",
    };

    isSubmitting = true;

    try {
      const response = await fetch("/api/contact-modal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);

        errorMessage =
          body?.error ||
          "Não conseguimos registrar seus dados agora. Tente novamente em instantes.";
        return;
      }

      trackFooterLead(payload);

      name = "";
      email = "";
      phone = "";
      isSuccess = true;
    } catch (error) {
      console.error("[Footer] Erro ao enviar lead:", error);

      errorMessage =
        "Erro de conexão ao enviar seus dados. Verifique sua internet e tente novamente.";
    } finally {
      isSubmitting = false;
    }
  }
</script>

<footer
  class="deferred-section relative flex flex-col items-center py-16 gap-16 bg-white/20 overflow-hidden"
  style="font-family: 'Plus Jakarta Sans', sans-serif;"
>
  <!-- ===== BLOCO SUPERIOR: Captura de Lead ===== -->
  <div
    class="relative z-10 flex flex-col items-center gap-8 w-full max-w-[1300px] bg-[#000A57] lg:rounded-[24px] py-16 px-6 sm:px-12"
  >
    <div class="flex flex-col items-center gap-3 text-center">
      <h2
        class="text-white text-[32px] md:text-[40px] font-semibold leading-[130%] tracking-[-0.03em]"
      >
        Quer transformar a sua escola?
      </h2>

      <p class="max-w-[680px] text-white/70 text-[14px] md:text-[16px] leading-relaxed">
        Preencha seus dados e nossa equipe comercial entra em contato para
        apresentar a solução ideal para sua instituição.
      </p>
    </div>

    <form
      class="flex flex-wrap justify-center items-start gap-4 md:gap-6 w-full max-w-[1152px]"
      on:submit={handleSubmit}
      novalidate
    >
      <div class="flex-1 min-w-[260px] max-w-[340px]">
        <input
          type="text"
          placeholder="Nome"
          bind:value={name}
          autocomplete="name"
          class="w-full h-[56px] px-6 rounded-[20px]
                 bg-white/30 border border-white/50 text-white placeholder-white/70 font-semibold text-[16px]
                 focus:outline-none focus:ring-2 focus:ring-white/60"
        />
      </div>

      <div class="flex-1 min-w-[260px] max-w-[340px]">
        <input
          type="email"
          placeholder="E-mail"
          bind:value={email}
          autocomplete="email"
          class="w-full h-[56px] px-6 rounded-[20px]
                 bg-white/30 border border-white/50 text-white placeholder-white/70 font-semibold text-[16px]
                 focus:outline-none focus:ring-2 focus:ring-white/60"
        />
      </div>

      <div class="flex-1 min-w-[260px] max-w-[340px]">
        <input
          type="tel"
          placeholder="WhatsApp"
          bind:value={phone}
          on:input={onPhoneInput}
          inputmode="tel"
          autocomplete="tel"
          maxlength="15"
          class="w-full h-[56px] px-6 rounded-[20px]
                 bg-white/30 border border-white/50 text-white placeholder-white/70 font-semibold text-[16px]
                 focus:outline-none focus:ring-2 focus:ring-white/60"
        />
      </div>

      <button
        type="submit"
        class="flex justify-center items-center gap-3 h-[56px] px-8 bg-[#EA6D0B]
               text-[#010D28] font-bold text-[16px] rounded-[70px] transition hover:bg-[#FF7F20]
               disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isSubmitting}
      >
        <span>
          {#if isSubmitting}
            Enviando...
          {:else}
            Quero saber mais
          {/if}
        </span>
        <IconArrowRight size={24} />
      </button>

      {#if errorMessage}
        <p class="w-full text-center text-[13px] text-red-200 font-medium">
          {errorMessage}
        </p>
      {/if}

      {#if isSuccess}
        <p class="w-full text-center text-[13px] text-emerald-200 font-medium">
          Dados recebidos com sucesso. Nossa equipe comercial entrará em contato.
        </p>
      {/if}
    </form>
  </div>

  <!-- Linha divisória -->
  <div class="relative z-10 w-full max-w-[1280px] h-[1px] bg-[#AEB3D9]"></div>

  <!-- ===== BLOCO INFERIOR ===== -->
  <div
    class="px-8 lg:px-0 relative z-10 grid grid-cols-1 md:grid-cols-[1.2fr_0.6fr_0.6fr_1fr] gap-12 w-full max-w-[1280px] text-[#000A57]"
  >
    <!-- Coluna 1 -->
    <div class="flex flex-col items-start gap-6">
      <img
        src={f10LogoUrl}
        alt="F10 Software"
        width="106"
        height="60"
        class="h-[60px] w-auto object-contain"
      />

      <p
        class="font-bold text-[14px] leading-[24px] text-[#000A57] max-w-[420px]"
      >
        F10 Software – Soluções Digitais para Gestão Escolar<br />
        <span class="font-normal text-[#5F6475]">
          Transforme a administração da sua escola com tecnologia de ponta.
        </span>
      </p>

      <SocialLinks links={socialLinks} />
    </div>

    <!-- Coluna 2 -->
    <div class="flex flex-col gap-3">
      <h3 class="text-[18px] font-semibold">Acesso rápido</h3>

      <ul class="text-[#5F6475] text-[14px] leading-[24px]">
        <li><a href="/" class="hover:text-[#EA6D0B]">Início</a></li>

        <li><a href="/solucoes" class="hover:text-[#EA6D0B]">Soluções</a></li>

        <li>
          <a href="https://blog.f10.com.br" class="hover:text-[#EA6D0B]">
            Blog
          </a>
        </li>

        <li>
          <a href="https://ajuda.f10.com.br/kb" class="hover:text-[#EA6D0B]">
            Central de Ajuda
          </a>
        </li>

        <li><a href="/contato" class="hover:text-[#EA6D0B]">Contato</a></li>
      </ul>
    </div>

    <!-- Coluna 3 -->
    <div class="flex flex-col gap-3">
      <h3 class="text-[18px] font-semibold">Outros links</h3>

      <ul class="text-[#5F6475] text-[14px] leading-[24px]">
        <li>
          <a href="/termos-de-uso" class="hover:text-[#EA6D0B]">
            Termos de uso
          </a>
        </li>

        <li>
          <a href="/politica-de-privacidade" class="hover:text-[#EA6D0B]">
            Políticas de privacidade
          </a>
        </li>
      </ul>
    </div>

    <!-- Coluna 4 -->
    <div class="flex flex-col gap-3 text-[#5F6475] text-[14px]">
      <div class="flex items-center gap-2">
        <IconPhone size={19} />
        <span>{salesContact.whatsappDisplay}</span>
      </div>

      <div class="flex items-center gap-2">
        <IconEmail size={20} />
        <span>vendas@f10.com.br</span>
      </div>

      <div class="flex items-center gap-2">
        <IconWhatsApp size={20} />

        <a href={salesContact.whatsappUrl} class="hover:underline">
          <span>Fale com o vendas</span>
        </a>
      </div>
    </div>
  </div>
</footer>
