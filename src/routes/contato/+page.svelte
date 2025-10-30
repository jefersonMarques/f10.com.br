<!-- src/routes/contato/+page.svelte -->
<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import ContactForm from "$lib/components/forms/ContactForm.svelte";
  import SocialLinks from "$lib/components/SocialLinks.svelte";
  import IconClock from "$lib/icons/IconClock.svelte";
  import IconEmail from "$lib/icons/IconEmail.svelte";
  import IconMapPin from "$lib/icons/IconMapPin.svelte";
  import IconWhatsApp from "$lib/icons/IconWhatsApp.svelte";

  // ===== Estado dos botões de assunto (tabs) =====
  type Topic = "f10" | "jobs";
  let activeTopic: Topic = "f10";

  // IDS ou URLs do formulário (ex.: RD Station, HubSpot, n8n etc.)
  // Troque quando integrar de fato
  const forms = {
    f10: {
      type: "rd-iframe",
      src: "https://www.exemplo.com/rd/form-fale-sobre-f10",
    },
    jobs: {
      type: "rd-iframe",
      src: "https://www.exemplo.com/rd/form-trabalhe-conosco",
    },
  } as const;

  // ===== Dados estáticos do card de contato =====
  const address =
    "R. Comendador Araújo, 143 – 3º andar\nCentro, Curitiba – PR, 80420-900";
  const phoneMain = "(41) 99228-4422";
  const phoneAlt = "(41) 99774-2363";
  const email = "comercial@f10.com.br";
  const schedule = "Seg - Sex: 08h15 - 18h | Sáb: 08h15h - 13h";

  // ===== Helpers visuais =====
  const isActive = (t: Topic) => activeTopic === t;
  function socialIcon(name: string): string {
    const color = "#000A57";
    if (name === "facebook")
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 8h-2a2 2 0 00-2 2v2H9v3h2v6h3v-6h2.2L17 12h-3v-1.5c0-.3.2-.5.5-.5H17V8h-2z" fill="${color}"/></svg>`;
    if (name === "linkedin")
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6.94 9H4V20h2.94V9zM5.47 7.67a1.83 1.83 0 110-3.66 1.83 1.83 0 010 3.66zM20 20h-3v-5.6c0-1.33-.47-2.24-1.66-2.24-.9 0-1.43.6-1.66 1.18-.09.22-.11.52-.11.83V20h-3s.04-9.73 0-10.73h3v1.52c.39-.6 1.08-1.46 2.62-1.46 1.92 0 3.38 1.25 3.38 3.95V20z" fill="${color}"/></svg>`;
    if (name === "youtube")
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M22 12s0-3.4-.43-4.9a2.6 2.6 0 00-1.84-1.84C17.22 4.8 12 4.8 12 4.8s-5.22 0-7.73.46A2.6 2.6 0 002.43 7.1C2 8.6 2 12 2 12s0 3.4.43 4.9a2.6 2.6 0 001.84 1.84c2.51.46 7.73.46 7.73.46s5.22 0 7.73-.46a2.6 2.6 0 001.84-1.84C22 15.4 22 12 22 12z" stroke="${color}" stroke-width="1.4"/><path d="M10 9.75L15 12l-5 2.25V9.75z" fill="${color}"/></svg>`;
    if (name === "instagram")
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4" stroke="${color}" stroke-width="1.4"/><circle cx="12" cy="12" r="3.2" stroke="${color}" stroke-width="1.4"/><circle cx="17.3" cy="6.7" r="1" fill="${color}"/></svg>`;
    return "";
  }

  const socialLinks = [
    {
      alt: "Facebook",
      src: "/social_facebook.svg",
      href: "https://facebook.com",
    },
    {
      alt: "LinkedIn",
      src: "/social_linkedin.svg",
      href: "https://linkedin.com",
    },
    { alt: "YouTube", src: "/social_youtube.svg", href: "https://youtube.com" },
    {
      alt: "Instagram",
      src: "/social_instagram.svg",
      href: "https://instagram.com",
    },
  ];
</script>

<svelte:head>
  <title>Contato — F10 Software</title>
  <meta
    name="description"
    content="Fale com nossos especialistas. Atendimento para escolas independentes e redes educacionais. Suporte, comercial e oportunidades."
  />
  <meta property="og:title" content="Contato — F10 Software" />
  <meta
    property="og:description"
    content="Fale com especialistas da F10. Tecnologia acessível, segura e inteligente para gestão escolar."
  />
</svelte:head>

<!-- ===== BACKGROUND / CONTAINER GERAL ===== -->
<section class="relative isolate overflow-hidden bg-white/80">
  <!-- ruído/texture sutil de fundo (pode trocar o asset) -->
  <div
    aria-hidden="true"
    class="pointer-events-none absolute inset-0 -z-10"
  ></div>

  <!-- ===== BREADCRUMB ===== -->
  <div>
    <Breadcrumb
      baseUrl="https://f10.com.br"
      items={[{ label: "HOME", href: "/" }, { label: "CONTATO" }]}
    />
  </div>

  <!-- ===== BANNER COM OVERLAY ===== -->
  <div class="container pt-6">
    <div
      class="relative h-[200px] sm:h-[260px] md:h-[313px] w-full overflow-hidden rounded-[30px] ring-1 ring-black/5 shadow-[0_20px_60px_rgba(1,13,40,0.18)]"
      aria-label="Equipe de atendimento da F10"
    >
      <!-- imagem de fundo -->
      <img
        src="/bg_contact.webp"
        alt="Equipe de atendimento trabalhando com headsets em escritório"
        class="absolute inset-0 h-full w-full object-cover"
        loading="eager"
      />
      <!-- overlay âmbar como no Figma -->
      <div class="absolute inset-0 bg-[rgba(234,109,11,0.38)]"></div>
      <!-- borda interna sutil -->
      <div
        class="pointer-events-none absolute inset-0 rounded-[30px] ring-1 ring-inset ring-white/10"
      ></div>
    </div>
  </div>

  <!-- ===== GRID PRINCIPAL ===== -->
  <div class="container py-10 md:py-16">
    <div class="grid gap-8 lg:grid-cols-12">
      <!-- ===== COLUNA ESQUERDA ===== -->
      <div class="lg:col-span-6 xl:col-span-5">
        <h1
          class="text-[#010D28] font-semibold tracking-[-0.03em] leading-[1.3] text-[38px] md:text-[48px]"
        >
          Fale com nossos especialistas e tire suas dúvidas
        </h1>

        <p class="mt-6 text-[16px] leading-[1.8] text-[#7E82A2]">
          Seja você uma escola independente, uma rede de franquias ou um
          educador buscando inovação, vamos conversar. Estamos aqui para apoiar
          a educação brasileira com tecnologia acessível, segura e inteligente.
          Preencha o formulário ao lado ou entre em contato pelos nossos canais
          oficiais:
        </p>

        <!-- Card de contato -->
        <div
          class="mt-10 rounded-[20px] border border-[#F0F2FD] bg-white p-8 shadow-sm"
          aria-label="Canais oficiais de contato"
        >
          <p class="text-[22px] font-semibold text-[#000A57]">Contato</p>

          <div class="mt-6 space-y-4 text-[14px] leading-[1.3] text-[#7E82A2]">
            <!-- Endereço -->
            <div class="flex items-start gap-3">
              <IconMapPin size={24} classType="mt-1 pr-1" />
              <p class="whitespace-pre-line text-[14px]">{address}</p>
            </div>

            <!-- WhatsApp/Telefones -->
            <div class="flex items-start gap-3">
              <IconWhatsApp size={18} />
              <div>
                <p>Fale com a nossa equipe de vendas:</p>
                <p class="text-[#000A57] font-semibold">
                  <a href="https://wa.me/5541992284422" class="hover:underline"
                    >{phoneMain}</a
                  >
                  <span class="text-[#7E82A2]"> • </span>
                  <a href="https://wa.me/5541997742363" class="hover:underline"
                    >{phoneAlt}</a
                  >
                </p>
              </div>
            </div>

            <!-- E-mail -->
            <div class="flex items-start gap-3">
              <IconEmail size={20} classType={"mt-0"} />
              <a href="mailto:{email}" class="text-[#000A57] hover:underline"
                >{email}</a
              >
            </div>

            <!-- Horário -->
            <div class="flex items-start gap-3">
              <IconClock size={20} />
              <p>{schedule}</p>
            </div>
          </div>

          <!-- Redes sociais -->
          <div class="mt-8">
            <p class="font-bold text-[#EA6D0B]">Redes Sociais:</p>
            <p class="text-[12px] text-[#7E82A2]">
              Siga a F10 e fique por dentro de novidades e conteúdos exclusivos:
            </p>

            <div class="mt-4 flex gap-3">
              <SocialLinks links={socialLinks} />
            </div>
          </div>
        </div>
      </div>

      <!-- ===== COLUNA DIREITA ===== -->
      <div class="lg:col-span-6 xl:col-span-7 mt-8">
        <div class="rounded-[20px] border border-[#F0F2FD] bg-white p-6 md:p-8">
          <h2
            class="text-[26px] font-semibold tracking-[-0.03em] text-[#010D28]"
          >
            Sobre o que você deseja falar?
          </h2>

          <!-- Botões / Tabs -->
          <div class="mt-4 flex gap-4">
            <button
              class="flex-1 rounded-full px-6 py-3 text-[16px] font-bold transition
                     ring-1 ring-inset
                     {isActive('f10')
                ? 'bg-[#EA6D0B] text-white ring-transparent'
                : 'bg-transparent text-[#000A57] ring-[#000A57]'}"
              on:click={() => (activeTopic = "f10")}
              aria-pressed={isActive("f10")}
            >
              Falar sobre o F10
            </button>

            <button
              class="flex-1 rounded-full px-6 py-3 text-[16px] font-bold transition
                     ring-1 ring-inset
                     {isActive('jobs')
                ? 'bg-[#EA6D0B] text-white ring-transparent'
                : 'bg-transparent text-[#000A57] ring-[#000A57]'}"
              on:click={() => (activeTopic = "jobs")}
              aria-pressed={isActive("jobs")}
            >
              Trabalhe conosco
            </button>
          </div>

          <!-- Área do formulário -->
          <div class="mt-6 rounded-[16px] bg-white p-0">
            {#if activeTopic === "f10"}
              <ContactForm
                endpoint="/api/contact"
                topic="f10"
                title="Falar sobre o F10"
                subtitle="Conte sobre sua escola e como podemos ajudar."
                withCredentials="same-origin"
                on:submitted={() => {
                  /* analytics/GA4, toast, etc. */
                }}
              />
            {:else}
              <ContactForm
                endpoint="/api/contact-jobs"
                topic="jobs"
                title="Trabalhe conosco"
                subtitle="Envie seus dados e fale com nosso time de pessoas e cultura."
                withCredentials="same-origin"
              />
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ===== SVGs inline (leve, sem dependências) ===== -->

<!-- Ícones das redes (somente traço/navy) -->
{@html `
  <template id="social-icons">
    <!-- placeholders -->
  </template>
`}

<style>
  /* Nenhum CSS extra é obrigatório: tudo está em Tailwind.
     Mantido vazio para facilitar customizações locais se necessário. */
</style>
