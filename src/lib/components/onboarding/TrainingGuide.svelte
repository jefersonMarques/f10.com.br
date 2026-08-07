<script lang="ts">
  import { ArrowRight, BookOpenCheck, GraduationCap } from "lucide-svelte";

  const learningPath = [
    "Configurações e cadastros iniciais",
    "Rotinas comerciais e matrículas",
    "Gestão pedagógica da escola",
    "Financeiro, cobranças e relatórios",
  ];
</script>

<section id="training" class="scroll-mt-28 bg-[#F7F8FE] py-16 md:py-24">
  <div class="container grid gap-10 lg:grid-cols-12 lg:items-center">
    <div class="lg:col-span-5">
      <div
        class="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#000A57] ring-1 ring-black/5"
      >
        <GraduationCap size={18} aria-hidden="true" />
        Segundo passo
      </div>

      <h2
        class="mt-5 text-[32px] font-semibold leading-[1.12] tracking-[-0.03em] text-[#010D28] sm:text-[40px]"
      >
        Aprenda o F10 uma rotina de cada vez
      </h2>

      <p class="mt-5 text-[16px] leading-[1.8] text-[#5F6475]">
        Os treinamentos para novos clientes apresentam as rotinas essenciais em
        uma sequência simples. Comece pelas configurações iniciais e avance de
        acordo com a função que você exerce na escola.
      </p>

      <a
        href="/treinamentos"
        class="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-[#000A57] px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_14px_34px_rgba(0,10,87,0.22)] transition hover:bg-[#111B71] focus:outline-none focus:ring-2 focus:ring-[#000A57]/40"
      >
        Acessar treinamentos
        <ArrowRight size={18} aria-hidden="true" />
      </a>
    </div>

    <div class="lg:col-span-7 lg:pl-8">
      <div class="overflow-hidden rounded-[28px] border border-[#E7EAF8] bg-white shadow-[0_24px_60px_rgba(1,13,40,0.08)]">
        <div class="flex items-center gap-3 border-b border-[#EEF0F8] px-6 py-5 sm:px-8">
          <span class="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EA6D0B]/10 text-[#EA6D0B]">
            <BookOpenCheck size={23} aria-hidden="true" />
          </span>
          <div>
            <p class="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#EA6D0B]">
              Trilha recomendada
            </p>
            <h3 class="mt-1 text-[19px] font-semibold text-[#010D28]">
              Treinamento do novo cliente
            </h3>
          </div>
        </div>

        <ol class="divide-y divide-[#EEF0F8]">
          {#each learningPath as item, index}
            <li class="flex items-center gap-4 px-6 py-5 sm:px-8">
              <span
                class="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-[#F3F4FD] text-[13px] font-bold text-[#000A57]"
              >
                {index + 1}
              </span>
              <span class="text-[15px] font-medium leading-relaxed text-[#30364A]">
                {item}
              </span>
            </li>
          {/each}
        </ol>
      </div>
    </div>
  </div>
</section>
