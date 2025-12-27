<script lang="ts">
  import { onMount } from "svelte";
  import { ArrowRight, Download, Home, BookOpen, Instagram, Star } from "lucide-svelte";

  const installerUrl = "/download/installer";

  function startDownload() {
    // pt-BR: Tenta disparar download sem tirar o usuário da página.
    // Alguns navegadores podem bloquear auto-download; por isso mantemos botão de fallback.
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = installerUrl;
    document.body.appendChild(iframe);

    // pt-BR: Limpamos depois pra não poluir o DOM.
    window.setTimeout(() => {
      try {
        iframe.remove();
      } catch {}
    }, 10_000);
  }

  onMount(() => {
    startDownload();
  });
</script>

<section class="relative isolate min-h-screen bg-white overflow-x-hidden">
  <div class="container py-10 md:py-14">
    <div class="mx-auto max-w-3xl text-center">
      <div class="mx-auto inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-emerald-700 ring-1 ring-emerald-100">
        <Download size={18} />
        <span class="text-[13px] font-semibold">Download liberado</span>
      </div>

      <h1 class="mt-4 text-[30px] sm:text-[38px] md:text-[44px] font-semibold leading-[1.1] tracking-[-0.03em] text-[#010D28]">
        Obrigado! Seu download deve começar automaticamente.
      </h1>

      <p class="mt-3 text-[15px] md:text-[16px] leading-[1.9] text-[#000A57]/80">
        Se não iniciar em alguns segundos, clique no botão abaixo. Alguns navegadores bloqueiam downloads automáticos por
        segurança.
      </p>

      <div class="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
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
        <!-- Página inicial -->
        <a href="/" class="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition">
          <div class="flex items-center gap-3">
            <span class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-100">
              <Home size={18} />
            </span>
            <div class="min-w-0">
              <p class="font-semibold text-[#010D28] leading-tight">Página inicial</p>
              <p class="text-[13px] text-slate-600">Voltar para o site</p>
            </div>
          </div>
          <div class="mt-4 text-[13px] font-semibold text-[#EA6D0B] group-hover:underline">
            Abrir página <span aria-hidden="true">→</span>
          </div>
        </a>

        <!-- Blog -->
        <a
          href="https://blog.f10.com.br/"
          target="_blank"
          rel="noopener noreferrer"
          class="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition"
        >
          <div class="flex items-center gap-3">
            <span class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-100">
              <BookOpen size={18} />
            </span>
            <div class="min-w-0">
              <p class="font-semibold text-[#010D28] leading-tight">Nosso blog</p>
              <p class="text-[13px] text-slate-600">Conteúdos e novidades do F10</p>
            </div>
          </div>
          <div class="mt-4 text-[13px] font-semibold text-[#EA6D0B] group-hover:underline">
            Abrir página <span aria-hidden="true">→</span>
          </div>
        </a>

        <!-- Instagram -->
        <a
          href="https://www.instagram.com/f10software/"
          target="_blank"
          rel="noopener noreferrer"
          class="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition"
        >
          <div class="flex items-center gap-3">
            <span class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-100">
              <Instagram size={18} />
            </span>
            <div class="min-w-0">
              <p class="font-semibold text-[#010D28] leading-tight">Nosso Instagram</p>
              <p class="text-[13px] text-slate-600">Bastidores e atualizações</p>
            </div>
          </div>
          <div class="mt-4 text-[13px] font-semibold text-[#EA6D0B] group-hover:underline">
            Abrir página <span aria-hidden="true">→</span>
          </div>
        </a>

        <!-- Google Review -->
        <a
          href="https://g.page/r/CXgT5_ElMfztEAE/review"
          target="_blank"
          rel="noopener noreferrer"
          class="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition"
        >
          <div class="flex items-center gap-3">
            <span class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-100">
              <Star size={18} />
            </span>
            <div class="min-w-0">
              <p class="font-semibold text-[#010D28] leading-tight">Avalie no Google</p>
              <p class="text-[13px] text-slate-600">Sua opinião ajuda muito</p>
            </div>
          </div>
          <div class="mt-4 text-[13px] font-semibold text-[#EA6D0B] group-hover:underline">
            Abrir página <span aria-hidden="true">→</span>
          </div>
        </a>
      </div>

      <p class="mt-6 text-center text-[12px] text-slate-500">
        Dica: se o navegador bloquear downloads automáticos, o botão “Baixar novamente” resolve porque vira ação do
        usuário.
      </p>
    </div>
  </div>
</section>
