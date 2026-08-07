<script lang="ts">
  import {
    ArrowRight,
    CheckCircle2,
    Download,
    MonitorCheck,
  } from "lucide-svelte";

  const installationSteps = [
    "Clique em Baixar F10 e aguarde o download terminar.",
    "Abra o arquivo InstaladorF10.exe no computador Windows.",
    "Siga as instruções do instalador até concluir.",
    "Abra o F10 e utilize os dados de acesso fornecidos na implantação.",
  ];
</script>

<section id="download" class="scroll-mt-28 bg-white py-16 md:py-24">
  <div class="container grid gap-10 lg:grid-cols-12 lg:items-center">
    <div class="lg:col-span-6">
      <div
        class="inline-flex items-center gap-2 rounded-full bg-[#EA6D0B]/10 px-4 py-2 text-[13px] font-semibold text-[#C95717]"
      >
        <Download size={17} aria-hidden="true" />
        Primeiro passo
      </div>

      <h2
        class="mt-5 text-[32px] font-semibold leading-[1.12] tracking-[-0.03em] text-[#010D28] sm:text-[40px]"
      >
        Baixe e instale o F10 no seu computador
      </h2>

      <p class="mt-5 max-w-2xl text-[16px] leading-[1.8] text-[#5F6475]">
        O instalador do F10 está disponível para Windows. O download direto
        mantém este guia aberto para que você acompanhe cada etapa da
        instalação.
      </p>

      <div class="mt-8 flex flex-col gap-3 sm:flex-row">
        <a
          href="/download/installer"
          class="inline-flex items-center justify-center gap-2 rounded-full bg-[#EA6D0B] px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_14px_34px_rgba(234,109,11,0.3)] transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
        >
          <Download size={18} aria-hidden="true" />
          Baixar F10 agora
          <ArrowRight size={17} aria-hidden="true" />
        </a>

        <a
          href="/download"
          class="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3.5 text-[15px] font-semibold text-[#010D28] transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300/60"
        >
          Abrir página de download
        </a>
      </div>

      <p class="mt-5 text-[14px] leading-relaxed text-[#5F6475]">
        Sempre que precisar instalar novamente, acesse
        <a href="/download" class="font-semibold text-[#000A57] underline decoration-[#EA6D0B]/50 underline-offset-4">
          f10.com.br/download
        </a>.
      </p>
    </div>

    <div class="lg:col-span-6">
      <div
        class="rounded-[28px] border border-[#E7EAF8] bg-[#F7F8FE] p-6 shadow-[0_24px_60px_rgba(1,13,40,0.08)] sm:p-8"
      >
        <div class="flex items-center gap-3">
          <span
            class="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#000A57] shadow-sm ring-1 ring-black/5"
          >
            <MonitorCheck size={23} aria-hidden="true" />
          </span>

          <div>
            <p class="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#EA6D0B]">
              Instalação guiada
            </p>
            <h3 class="mt-1 text-[20px] font-semibold text-[#010D28]">
              Como instalar o F10
            </h3>
          </div>
        </div>

        <ol class="mt-7 space-y-5">
          {#each installationSteps as step, index}
            <li class="flex items-start gap-4">
              <span
                class="mt-0.5 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-white text-[12px] font-bold text-[#EA6D0B] ring-1 ring-[#EA6D0B]/20"
              >
                {index + 1}
              </span>
              <p class="text-[15px] leading-[1.65] text-[#41475A]">{step}</p>
            </li>
          {/each}
        </ol>

        <div class="mt-7 flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
          <CheckCircle2 class="mt-0.5 min-w-5 text-emerald-600" size={20} aria-hidden="true" />
          <p class="text-[13px] leading-[1.65] text-[#5F6475]">
            Mantenha o F10 atualizado utilizando sempre o instalador disponível
            no site oficial.
          </p>
        </div>
      </div>
    </div>
  </div>
</section>
