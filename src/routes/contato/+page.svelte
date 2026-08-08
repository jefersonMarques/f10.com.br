<!-- src/routes/contato/+page.svelte -->
<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import SocialLinks from "$lib/components/SocialLinks.svelte";
  import IconClock from "$lib/icons/IconClock.svelte";
  import IconEmail from "$lib/icons/IconEmail.svelte";
  import IconMapPin from "$lib/icons/IconMapPin.svelte";
  import IconWhatsApp from "$lib/icons/IconWhatsApp.svelte";
  import { salesContact } from "$lib/config/contactConfig";
  import { browser } from "$app/environment";

  // ===== Estado dos botões de assunto (tabs) =====
  type Topic = "f10" | "jobs";
  let activeTopic: Topic = "f10";
  const isActive = (t: Topic) => activeTopic === t;

  // ===== Dados estáticos do card de contato =====
  const address =
    "R. Comendador Araújo, 143 – 3º andar\nCentro, Curitiba – PR, 80420-900";
  const phoneAlt = "(41) 99774-2363";
  const email = "vendas@f10.com.br";
  const schedule = "Seg - Sex: 08h15 - 18h | Sáb: 08h15h - 13h";

  const socialLinks = [
    {
      alt: "Facebook",
      src: "/social_facebook.svg",
      href: "https://www.facebook.com/F10Software",
    },
    {
      alt: "LinkedIn",
      src: "/social_linkedin.svg",
      href: "https://www.linkedin.com/company/f10software/",
    },
    {
      alt: "YouTube",
      src: "/social_youtube.svg",
      href: "https://www.youtube.com/@f10software76",
    },
    {
      alt: "Instagram",
      src: "/social_instagram.svg",
      href: "https://www.instagram.com/f10software/",
    },
  ];

  // =========================
  // Helpers
  // =========================
  function normalizePhone(value: string): string {
    const digits = String(value || "").replace(/\D/g, "");
    if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
      return digits.slice(2);
    }
    return digits;
  }

  function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  }

  function currentPath(): string {
    if (!browser) return "/";
    return window.location.pathname || "/";
  }

  // =========================
  // Form: Lead (F10) -> /api/contact/lead (JSON)
  // =========================
  let leadName = "";
  let leadEmail = "";
  let leadPhone = "";
  let leadSchoolName = "";
  let leadMessage = "";

  let leadSubmitting = false;
  let leadSuccess = false;
  let leadError = "";

  async function submitLead() {
    leadError = "";
    leadSuccess = false;

    const name = leadName.trim();
    const email = leadEmail.trim();
    const phone = normalizePhone(leadPhone);
    const message = leadMessage.trim();
    const schoolName = leadSchoolName.trim();

    if (!name) {
      leadError = "Informe seu nome.";
      return;
    }
    if (!isValidEmail(email)) {
      leadError = "Informe um e-mail válido.";
      return;
    }
    if (phone.length < 10) {
      leadError = "Informe um WhatsApp com DDD.";
      return;
    }
    if (!message) {
      leadError = "Escreva uma mensagem.";
      return;
    }

    leadSubmitting = true;

    try {
      const payload = {
        name,
        email,
        phone,
        message,
        schoolName: schoolName || undefined,

        // extras pro Exact e tracking
        source: currentPath(), // o endpoint transforma em URL absoluta usando SITE_URL
        page: currentPath(),
        product: "Software F10",
        subSource: "Contato (página)",
        createdAt: new Date().toISOString(),
      };

      const res = await fetch("/api/contact/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        leadError =
          data?.error || data?.message || "Falha ao enviar. Tente novamente.";
        return;
      }

      leadSuccess = true;

      // reset
      leadName = "";
      leadEmail = "";
      leadPhone = "";
      leadSchoolName = "";
      leadMessage = "";
    } catch (err: any) {
      leadError = err?.message || "Erro inesperado ao enviar.";
    } finally {
      leadSubmitting = false;
    }
  }

  // =========================
  // Form: Jobs -> /api/contact/jobs (multipart + resume)
  // =========================
  let jobName = "";
  let jobEmail = "";
  let jobPhone = "";
  let jobRole = "";
  let jobLinkedin = "";
  let jobPortfolio = "";
  let jobMessage = "";
  let jobResume: File | null = null;

  let jobSubmitting = false;
  let jobSuccess = false;
  let jobError = "";

  function handleResumeChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    jobResume = input.files?.[0] ?? null;
  }

  async function submitJob() {
    jobError = "";
    jobSuccess = false;

    const name = jobName.trim();
    const email = jobEmail.trim();
    const phone = normalizePhone(jobPhone);
    const message = jobMessage.trim();

    if (!name) {
      jobError = "Informe seu nome.";
      return;
    }
    if (!isValidEmail(email)) {
      jobError = "Informe um e-mail válido.";
      return;
    }
    if (phone.length < 10) {
      jobError = "Informe um WhatsApp com DDD.";
      return;
    }
    if (!jobRole.trim()) {
      jobError = "Selecione a área de interesse.";
      return;
    }
    if (!message) {
      jobError = "Escreva uma mensagem.";
      return;
    }
    if (!jobResume) {
      jobError = "Anexe seu currículo (PDF/DOC/DOCX).";
      return;
    }

    jobSubmitting = true;

    try {
      const payload = {
        name,
        email,
        phone,
        role: jobRole.trim(),
        linkedin: jobLinkedin.trim() || undefined,
        portfolio: jobPortfolio.trim() || undefined,
        message,

        source: currentPath(),
        page: currentPath(),
        product: "Trabalhe Conosco",
        subSource: "Contato (página) - Jobs",
        createdAt: new Date().toISOString(),
      };

      const formData = new FormData();
      formData.set("payload", JSON.stringify(payload));
      formData.set("resume", jobResume, jobResume.name); // IMPORTANTE: campo "resume"

      const res = await fetch("/api/contact/jobs", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        jobError =
          data?.error || data?.message || "Falha ao enviar. Tente novamente.";
        return;
      }

      jobSuccess = true;

      // reset
      jobName = "";
      jobEmail = "";
      jobPhone = "";
      jobRole = "";
      jobLinkedin = "";
      jobPortfolio = "";
      jobMessage = "";
      jobResume = null;

      // limpa file input visualmente (hack simples)
      const fileInput = document.getElementById(
        "jobResume",
      ) as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";
    } catch (err: any) {
      jobError = err?.message || "Erro inesperado ao enviar.";
    } finally {
      jobSubmitting = false;
    }
  }
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

<section class="relative isolate overflow-hidden bg-white/80">
  <div
    aria-hidden="true"
    class="pointer-events-none absolute inset-0 -z-10"
  ></div>

  <div>
    <Breadcrumb
      baseUrl="https://f10.com.br"
      items={[{ label: "HOME", href: "/" }, { label: "CONTATO" }]}
    />
  </div>

  <div class="container pt-6">
    <div
      class="relative h-[200px] sm:h-[260px] md:h-[313px] w-full overflow-hidden rounded-[30px] ring-1 ring-black/5 shadow-[0_20px_60px_rgba(1,13,40,0.18)]"
      aria-label="Equipe de atendimento da F10"
    >
      <img
        src="/bg_contact.webp"
        alt="Equipe de atendimento trabalhando com headsets em escritório"
        class="absolute inset-0 h-full w-full object-cover"
        loading="eager"
      />
      <div class="absolute inset-0 bg-[rgba(234,109,11,0.38)]"></div>
      <div
        class="pointer-events-none absolute inset-0 rounded-[30px] ring-1 ring-inset ring-white/10"
      ></div>
    </div>
  </div>

  <div class="container py-10 md:py-16">
    <div class="grid gap-8 lg:grid-cols-12">
      <!-- COLUNA ESQUERDA -->
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

        <div
          class="mt-10 rounded-[20px] border border-[#F0F2FD] bg-white p-8 shadow-sm"
          aria-label="Canais oficiais de contato"
        >
          <p class="text-[22px] font-semibold text-[#000A57]">Contato</p>

          <div class="mt-6 space-y-4 text-[14px] leading-[1.3] text-[#7E82A2]">
            <div class="flex items-start gap-3">
              <IconMapPin size={24} classType="mt-1 pr-1" />
              <p class="whitespace-pre-line text-[14px]">{address}</p>
            </div>

            <div class="flex items-start gap-3">
              <IconWhatsApp size={18} />
              <div>
                <p>Fale com a nossa equipe de vendas:</p>
                <p class="text-[#000A57] font-semibold">
                  <a href={salesContact.whatsappUrl} class="hover:underline"
                    >{salesContact.whatsappDisplay}</a
                  >
                </p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <IconEmail size={20} classType={"mt-0"} />
              <a href="mailto:{email}" class="text-[#000A57] hover:underline"
                >{email}</a
              >
            </div>

            <div class="flex items-start gap-3">
              <IconClock size={20} />
              <p>{schedule}</p>
            </div>
          </div>

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

      <!-- COLUNA DIREITA -->
      <div class="lg:col-span-6 xl:col-span-7 mt-8">
        <div class="rounded-[20px] border border-[#F0F2FD] bg-white p-6 md:p-8">
          <h2
            class="text-[26px] font-semibold tracking-[-0.03em] text-[#010D28]"
          >
            Sobre o que você deseja falar?
          </h2>

          <div class="mt-4 flex gap-4">
            <button
              class="flex-1 rounded-full px-6 py-3 text-[16px] font-bold transition ring-1 ring-inset
                {isActive('f10')
                ? 'bg-[#EA6D0B] text-white ring-transparent'
                : 'bg-transparent text-[#000A57] ring-[#000A57]'}"
              on:click={() => (activeTopic = "f10")}
              aria-pressed={isActive("f10")}
            >
              Falar sobre o F10
            </button>

            <button
              class="flex-1 rounded-full px-6 py-3 text-[16px] font-bold transition ring-1 ring-inset
                {isActive('jobs')
                ? 'bg-[#EA6D0B] text-white ring-transparent'
                : 'bg-transparent text-[#000A57] ring-[#000A57]'}"
              on:click={() => (activeTopic = "jobs")}
              aria-pressed={isActive("jobs")}
            >
              Trabalhe conosco
            </button>
          </div>

          <div class="mt-6 rounded-[16px] bg-white p-0">
            {#if activeTopic === "f10"}
              <!-- FORM LEAD -->
              <div class="mb-6">
                <p class="text-[22px] font-semibold text-[#010D28]">
                  Falar sobre o F10
                </p>
                <p class="mt-1 text-[14px] leading-[1.6] text-[#7E82A2]">
                  Conte sobre sua escola e como podemos ajudar.
                </p>
              </div>

              {#if leadError}
                <div
                  class="mb-4 rounded-[14px] border border-red-200 bg-red-50 p-4"
                >
                  <p class="text-[14px] text-red-800">{leadError}</p>
                </div>
              {/if}

              {#if leadSuccess}
                <div
                  class="mb-4 rounded-[14px] border border-emerald-200 bg-emerald-50 p-4"
                >
                  <p class="font-semibold text-emerald-900">Enviado!</p>
                  <p class="mt-1 text-[14px] text-emerald-800">
                    Recebemos sua mensagem e vamos retornar em breve.
                  </p>
                </div>
              {/if}

              <form class="space-y-4" on:submit|preventDefault={submitLead}>
                <div>
                  <label
                    for="leadName"
                    class="mb-1 block text-[13px] font-semibold text-[#010D28]"
                    >Nome *</label
                  >
                  <input
                    id="leadName"
                    class="w-full rounded-[14px] border border-[#E7EAF8] bg-white px-4 py-3 text-[14px] text-[#010D28] outline-none transition focus:border-[#EA6D0B]"
                    placeholder="Seu nome"
                    bind:value={leadName}
                  />
                </div>

                <div>
                  <label
                    for="leadEmail"
                    class="mb-1 block text-[13px] font-semibold text-[#010D28]"
                    >E-mail *</label
                  >
                  <input
                    id="leadEmail"
                    type="email"
                    class="w-full rounded-[14px] border border-[#E7EAF8] bg-white px-4 py-3 text-[14px] text-[#010D28] outline-none transition focus:border-[#EA6D0B]"
                    placeholder="voce@exemplo.com"
                    bind:value={leadEmail}
                  />
                </div>

                <div>
                  <label
                    for="leadPhone"
                    class="mb-1 block text-[13px] font-semibold text-[#010D28]"
                    >WhatsApp *</label
                  >
                  <input
                    id="leadPhone"
                    class="w-full rounded-[14px] border border-[#E7EAF8] bg-white px-4 py-3 text-[14px] text-[#010D28] outline-none transition focus:border-[#EA6D0B]"
                    placeholder="(DDD) 9xxxx-xxxx"
                    bind:value={leadPhone}
                  />
                </div>

                <div>
                  <label
                    for="leadSchoolName"
                    class="mb-1 block text-[13px] font-semibold text-[#010D28]"
                    >Nome da escola (opcional)</label
                  >
                  <input
                    id="leadSchoolName"
                    class="w-full rounded-[14px] border border-[#E7EAF8] bg-white px-4 py-3 text-[14px] text-[#010D28] outline-none transition focus:border-[#EA6D0B]"
                    placeholder="Ex: Escola Alfa"
                    bind:value={leadSchoolName}
                  />
                </div>

                <div>
                  <label
                    for="leadMessage"
                    class="mb-1 block text-[13px] font-semibold text-[#010D28]"
                    >Mensagem *</label
                  >
                  <textarea
                    id="leadMessage"
                    class="w-full rounded-[14px] border border-[#E7EAF8] bg-white px-4 py-3 text-[14px] text-[#010D28] outline-none transition focus:border-[#EA6D0B]"
                    rows="5"
                    placeholder="Conte seu cenário, necessidade, número de alunos, etc."
                    bind:value={leadMessage}
                  ></textarea>
                </div>

                <button
                  type="submit"
                  class="mt-2 w-full rounded-full bg-[#EA6D0B] px-6 py-3 text-[16px] font-bold text-white transition hover:opacity-95 disabled:opacity-60"
                  disabled={leadSubmitting}
                >
                  {leadSubmitting ? "Enviando..." : "Enviar mensagem"}
                </button>

                <p class="text-center text-[12px] text-[#7E82A2]">
                  Enviamos seu contato para nosso time e registramos no CRM para
                  retorno.
                </p>
              </form>
            {:else}
              <!-- FORM JOBS -->
              <div class="mb-6">
                <p class="text-[22px] font-semibold text-[#010D28]">
                  Trabalhe conosco
                </p>
                <p class="mt-1 text-[14px] leading-[1.6] text-[#7E82A2]">
                  Envie seus dados e currículo. Nosso time avalia e retorna se
                  houver match.
                </p>
              </div>

              {#if jobError}
                <div
                  class="mb-4 rounded-[14px] border border-red-200 bg-red-50 p-4"
                >
                  <p class="text-[14px] text-red-800">{jobError}</p>
                </div>
              {/if}

              {#if jobSuccess}
                <div
                  class="mb-4 rounded-[14px] border border-emerald-200 bg-emerald-50 p-4"
                >
                  <p class="font-semibold text-emerald-900">
                    Currículo enviado!
                  </p>
                  <p class="mt-1 text-[14px] text-emerald-800">
                    Recebemos sua candidatura. Obrigado!
                  </p>
                </div>
              {/if}

              <form class="space-y-4" on:submit|preventDefault={submitJob}>
                <div>
                  <label
                    for="jobName"
                    class="mb-1 block text-[13px] font-semibold text-[#010D28]"
                    >Nome completo *</label
                  >
                  <input
                    id="jobName"
                    class="w-full rounded-[14px] border border-[#E7EAF8] bg-white px-4 py-3 text-[14px] text-[#010D28] outline-none transition focus:border-[#EA6D0B]"
                    placeholder="Seu nome"
                    bind:value={jobName}
                  />
                </div>

                <div>
                  <label
                    for="jobEmail"
                    class="mb-1 block text-[13px] font-semibold text-[#010D28]"
                    >E-mail *</label
                  >
                  <input
                    id="jobEmail"
                    type="email"
                    class="w-full rounded-[14px] border border-[#E7EAF8] bg-white px-4 py-3 text-[14px] text-[#010D28] outline-none transition focus:border-[#EA6D0B]"
                    placeholder="voce@exemplo.com"
                    bind:value={jobEmail}
                  />
                </div>

                <div>
                  <label
                    for="jobPhone"
                    class="mb-1 block text-[13px] font-semibold text-[#010D28]"
                    >WhatsApp *</label
                  >
                  <input
                    id="jobPhone"
                    class="w-full rounded-[14px] border border-[#E7EAF8] bg-white px-4 py-3 text-[14px] text-[#010D28] outline-none transition focus:border-[#EA6D0B]"
                    placeholder="(DDD) 9xxxx-xxxx"
                    bind:value={jobPhone}
                  />
                </div>

                <div>
                  <label
                    for="jobRole"
                    class="mb-1 block text-[13px] font-semibold text-[#010D28]"
                    >Área de interesse *</label
                  >
                  <select
                    id="jobRole"
                    class="w-full rounded-[14px] border border-[#E7EAF8] bg-white px-4 py-3 text-[14px] text-[#010D28] outline-none transition focus:border-[#EA6D0B]"
                    bind:value={jobRole}
                  >
                    <option value="" disabled>Selecione a área</option>
                    <option value="support">Suporte</option>
                    <option value="sales">Comercial</option>
                    <option value="product">Produto</option>
                    <option value="engineering">Desenvolvimento</option>
                    <option value="marketing">Marketing</option>
                    <option value="admin_finance"
                      >Administrativo/Financeiro</option
                    >
                    <option value="other">Outra</option>
                  </select>
                </div>

                <div>
                  <label
                    for="jobLinkedin"
                    class="mb-1 block text-[13px] font-semibold text-[#010D28]"
                    >LinkedIn (opcional)</label
                  >
                  <input
                    id="jobLinkedin"
                    class="w-full rounded-[14px] border border-[#E7EAF8] bg-white px-4 py-3 text-[14px] text-[#010D28] outline-none transition focus:border-[#EA6D0B]"
                    placeholder="https://linkedin.com/in/..."
                    bind:value={jobLinkedin}
                  />
                </div>

                <div>
                  <label
                    for="jobPortfolio"
                    class="mb-1 block text-[13px] font-semibold text-[#010D28]"
                    >Portfólio/GitHub (opcional)</label
                  >
                  <input
                    id="jobPortfolio"
                    class="w-full rounded-[14px] border border-[#E7EAF8] bg-white px-4 py-3 text-[14px] text-[#010D28] outline-none transition focus:border-[#EA6D0B]"
                    placeholder="https://github.com/..."
                    bind:value={jobPortfolio}
                  />
                </div>

                <div>
                  <label
                    for="jobMessage"
                    class="mb-1 block text-[13px] font-semibold text-[#010D28]"
                    >Mensagem *</label
                  >
                  <textarea
                    id="jobMessage"
                    class="w-full rounded-[14px] border border-[#E7EAF8] bg-white px-4 py-3 text-[14px] text-[#010D28] outline-none transition focus:border-[#EA6D0B]"
                    rows="5"
                    placeholder="Conte rapidinho sobre você, experiência e o que busca."
                    bind:value={jobMessage}
                  ></textarea>
                </div>

                <div>
                  <label
                    for="jobResume"
                    class="mb-1 block text-[13px] font-semibold text-[#010D28]"
                    >Currículo (PDF/DOC/DOCX) *</label
                  >
                  <input
                    id="jobResume"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    class="w-full rounded-[14px] border border-[#E7EAF8] bg-white px-4 py-3 text-[14px] text-[#010D28] outline-none transition file:mr-4 file:rounded-full file:border-0 file:bg-[#000A57] file:px-4 file:py-2 file:text-[12px] file:font-bold file:text-white hover:file:opacity-90"
                    on:change={handleResumeChange}
                  />
                  <p class="mt-1 text-[12px] text-[#7E82A2]">
                    Anexe seu currículo.
                  </p>
                </div>

                <button
                  type="submit"
                  class="mt-2 w-full rounded-full bg-[#EA6D0B] px-6 py-3 text-[16px] font-bold text-white transition hover:opacity-95 disabled:opacity-60"
                  disabled={jobSubmitting}
                >
                  {jobSubmitting ? "Enviando..." : "Enviar currículo"}
                </button>

                <p class="text-center text-[12px] text-[#7E82A2]">
                  Registramos sua candidatura e enviamos para o time
                  responsável.
                </p>
              </form>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

{@html `
  <template id="social-icons">
    <!-- placeholders -->
  </template>
`}
