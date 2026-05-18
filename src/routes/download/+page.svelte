<script lang="ts">
  import { onMount } from "svelte";
  import {
    ArrowRight,
    Download,
    Home,
    BookOpen,
    Instagram,
    Star,
    X,
  } from "lucide-svelte";

  const installerUrl = "/download/installer";
  const googleReviewUrl = "https://g.page/r/CXgT5_ElMfztEAI/review";
  const googleReviewImageUrl = "/Google-Review-Symbol.webp";
  const reviewCompletedStorageKey = "googleReviewCompleted";

  let isReviewModalOpen = false;
  let hasCompletedReview = false;
  let hasStartedDownload = false;

  function startDownload() {
    if (hasStartedDownload) return;

    hasStartedDownload = true;

    // pt-BR: Dispara o download automaticamente sem sair da página.
    const iframe = document.createElement("iframe");
    iframe.name = "installer-download-frame";
    iframe.style.display = "none";
    iframe.src = installerUrl;

    document.body.appendChild(iframe);

    window.setTimeout(() => {
      try {
        iframe.remove();
      } catch {}
    }, 15_000);
  }

  function openReviewModal() {
    const reviewCompleted = localStorage.getItem(reviewCompletedStorageKey);

    if (reviewCompleted === "true") return;

    isReviewModalOpen = true;
  }

  function closeReviewModal() {
    isReviewModalOpen = false;
  }

  function openGoogleReview() {
    window.open(googleReviewUrl, "_blank", "noopener,noreferrer");
  }

  function toggleReviewCompleted() {
    hasCompletedReview = !hasCompletedReview;

    if (hasCompletedReview) {
      localStorage.setItem(reviewCompletedStorageKey, "true");
      isReviewModalOpen = false;
      return;
    }

    localStorage.removeItem(reviewCompletedStorageKey);
  }

  onMount(() => {
    startDownload();

    hasCompletedReview =
      localStorage.getItem(reviewCompletedStorageKey) === "true";

    window.setTimeout(() => {
      openReviewModal();
    }, 2500);
  });
</script>

<section class="relative isolate min-h-screen overflow-x-hidden bg-white">
  {#if isReviewModalOpen}
    <div
      class="fixed left-0 top-0 z-[9999] grid h-[100dvh] w-screen place-items-center overflow-y-auto bg-[#010D28]/60 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
    >
      <div
        class="relative mx-auto w-full max-w-[430px] overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_30px_100px_rgba(1,13,40,0.28)]"
      >
        <button
          type="button"
          on:click={closeReviewModal}
          class="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
          aria-label="Fechar modal"
        >
          <X size={18} />
        </button>

        <div class="px-7 pb-7 pt-9 text-center">
          <img
            src={googleReviewImageUrl}
            alt="Google Reviews"
            class="mx-auto h-16 w-auto object-contain"
          />

          <h2
            id="review-modal-title"
            class="mt-5 text-[24px] font-semibold leading-tight tracking-[-0.03em] text-[#010D28]"
          >
            Gostando do F10?
          </h2>

          <p class="mt-3 text-[15px] leading-[1.75] text-slate-600">
            Aproveite para nos avaliar no Google, é muito importante 😊
          </p>

          <div class="mt-6 flex flex-col gap-3">
            <button
              type="button"
              on:click={openGoogleReview}
              class="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#EA6D0B] px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_14px_40px_rgba(234,109,11,0.32)] transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/50"
            >
              <Star size={18} fill="currentColor" />
              <span>Avaliar no Google</span>
              <ArrowRight size={18} />
            </button>

            <button
              type="button"
              on:click={closeReviewModal}
              class="inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-[14px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300/60"
            >
              Agora não
            </button>

            <label
              class="mx-auto mt-1 inline-flex cursor-pointer items-center justify-center gap-2 text-[12px] font-medium text-slate-400 transition hover:text-slate-600"
            >
              <input
                type="checkbox"
                checked={hasCompletedReview}
                on:change={toggleReviewCompleted}
                class="h-3.5 w-3.5 rounded border-slate-300 text-[#EA6D0B] focus:ring-1 focus:ring-[#EA6D0B]"
              />

              <span>Já fiz minha avaliação</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <div class="container py-10 md:py-14">
    <div class="mx-auto max-w-3xl text-center">
      <div
        class="mx-auto inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-emerald-700 ring-1 ring-emerald-100"
      >
        <Download size={18} />
        <span class="text-[13px] font-semibold">Download liberado</span>
      </div>

      <h1
        class="mt-4 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-[#010D28] sm:text-[38px] md:text-[44px]"
      >
        Obrigado! Seu download deve começar automaticamente.
      </h1>

      <p
        class="mt-3 text-[15px] leading-[1.9] text-[#000A57]/80 md:text-[16px]"
      >
        Se não iniciar em alguns segundos, clique no botão abaixo. Alguns
        navegadores bloqueiam downloads automáticos por segurança.
      </p>

      <div
        class="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row"
      >
        <a
          href={installerUrl}
          class="inline-flex items-center justify-center gap-2 rounded-full bg-[#EA6D0B] px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_14px_40px_rgba(234,109,11,0.35)] hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/50"
        >
          <Download size={18} />
          <span>Baixar novamente</span>
          <ArrowRight size={18} />
        </a>

        <a
          href="/"
          class="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-7 py-3.5 text-[15px] font-semibold text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300/60"
        >
          <Home size={18} />
          <span>Voltar para Home</span>
        </a>
      </div>
    </div>

    <div class="mx-auto mt-10 max-w-5xl">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <a
          href="/"
          class="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <div class="flex items-center gap-3">
            <span
              class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-100"
            >
              <Home size={18} />
            </span>

            <div class="min-w-0">
              <p class="font-semibold leading-tight text-[#010D28]">
                Página inicial
              </p>
              <p class="text-[13px] text-slate-600">Voltar para o site</p>
            </div>
          </div>

          <div
            class="mt-4 text-[13px] font-semibold text-[#EA6D0B] group-hover:underline"
          >
            Abrir página <span aria-hidden="true">→</span>
          </div>
        </a>

        <a
          href="https://blog.f10.com.br/"
          target="_blank"
          rel="noopener noreferrer"
          class="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <div class="flex items-center gap-3">
            <span
              class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-100"
            >
              <BookOpen size={18} />
            </span>

            <div class="min-w-0">
              <p class="font-semibold leading-tight text-[#010D28]">
                Nosso blog
              </p>
              <p class="text-[13px] text-slate-600">
                Conteúdos e novidades do F10
              </p>
            </div>
          </div>

          <div
            class="mt-4 text-[13px] font-semibold text-[#EA6D0B] group-hover:underline"
          >
            Abrir página <span aria-hidden="true">→</span>
          </div>
        </a>

        <a
          href="https://www.instagram.com/f10software/"
          target="_blank"
          rel="noopener noreferrer"
          class="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <div class="flex items-center gap-3">
            <span
              class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-100"
            >
              <Instagram size={18} />
            </span>

            <div class="min-w-0">
              <p class="font-semibold leading-tight text-[#010D28]">
                Nosso Instagram
              </p>
              <p class="text-[13px] text-slate-600">
                Bastidores e atualizações
              </p>
            </div>
          </div>

          <div
            class="mt-4 text-[13px] font-semibold text-[#EA6D0B] group-hover:underline"
          >
            Abrir página <span aria-hidden="true">→</span>
          </div>
        </a>

        <a
          href={googleReviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="group rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-white p-5 shadow-sm transition hover:shadow-md"
        >
          <div class="flex items-center gap-3">
            <span
              class="inline-flex h-10 min-w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500 ring-1 ring-amber-100"
            >
              <Star size={18} fill="currentColor" />
            </span>

            <div class="min-w-0">
              <p class="font-semibold leading-tight text-[#010D28]">
                Gostou do F10?
              </p>
              <p class="text-[13px] leading-snug text-slate-600">
                Avalie nossa empresa no Google.
              </p>
            </div>
          </div>

          <div class="mt-4 flex items-center justify-between gap-3">
            <div
              class="text-[15px] leading-none text-amber-400"
              aria-label="Avaliação cinco estrelas"
            >
              ★★★★★
            </div>

            <span
              class="text-[13px] font-semibold text-[#EA6D0B] group-hover:underline"
            >
              Avaliar agora <span aria-hidden="true">→</span>
            </span>
          </div>
        </a>
      </div>

      <p class="mt-6 text-center text-[12px] text-slate-500">
        Dica: se o navegador bloquear downloads automáticos, o botão “Baixar
        novamente” resolve porque vira ação do usuário.
      </p>
    </div>
  </div>
</section>
