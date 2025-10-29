<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { cubicOut } from "svelte/easing";

  /** Props:
   * - title: string → título da seção (ex: "O que nossos clientes acham")
   * - quote: string → texto do depoimento
   * - author: string → nome da pessoa
   * - role: string → cargo ou empresa
   * - avatar?: string → URL do avatar (opcional)
   * - index: number → número atual
   * - total: number → total de itens
   * - onPrev?: () => void → callback botão anterior
   * - onNext?: () => void → callback botão próximo
   */
  export let title = "";
  export let quote = "";
  export let author = "";
  export let role = "";
  export let avatar: string | undefined = undefined;
  export let index = 1;
  export let total = 1;
  export let onPrev: (() => void) | undefined;
  export let onNext: (() => void) | undefined;
</script>

<div class="absolute inset-0 flex flex-col justify-between px-2">
  <!-- TÍTULO -->
  <div
    class="flex items-center text-left gap-4 text-[#010d286b] text-[16px]"
    in:fade={{ duration: 250, easing: cubicOut }}
    out:fade={{ duration: 200, easing: cubicOut }}
  >
    <span class="inline-block h-px w-16 bg-[#010d286b]/40"></span>
    <span>{title}</span>
  </div>

  <!-- QUOTE -->
  <div
    class="will-change-[opacity,transform] mt-10"
    in:fade={{ duration: 250, easing: cubicOut }}
    out:fade={{ duration: 200, easing: cubicOut }}
  >
    <div
      class="will-change-[opacity,transform]"
      in:fly={{ y: 10, duration: 280, easing: cubicOut }}
      out:fly={{ y: -10, duration: 220, easing: cubicOut }}
    >
      <blockquote
        class="min-h-[200px] relative text-[#010D28] font-semibold leading-[1.15]
               text-[28px] sm:text-[36px] md:text-[44px] lg:text-[56px] xl:text-[36px]"
      >
        <span aria-hidden="true" class="select-none">“</span>{quote}<span aria-hidden="true" class="select-none">”</span>
      </blockquote>
    </div>
  </div>

  <!-- LINHA INFERIOR (autor + botões) -->
  <div
    class="mt-10 will-change-[opacity,transform] flex items-center justify-between flex-wrap gap-6"
    in:fade={{ duration: 240, delay: 120, easing: cubicOut }}
    out:fade={{ duration: 180, easing: cubicOut }}
  >
    <!-- Autor -->
    <div
      class="flex items-center gap-5 will-change-[opacity,transform]"
      in:fly={{ y: 8, duration: 300, delay: 120, easing: cubicOut }}
      out:fly={{ y: -8, duration: 220, easing: cubicOut }}
    >
      <div
        class="h-20 w-20 rounded-full bg-slate-300 overflow-hidden shrink-0"
        aria-hidden={avatar ? "false" : "true"}
      >
        {#if avatar}
          <img src={avatar} alt="" class="h-full w-full object-cover" loading="lazy" />
        {/if}
      </div>

      <div class="min-w-0">
        <p class="text-[22px] font-semibold text-[#010D28] truncate">{author}</p>
        <p class="text-[16px] text-[#8A9099]">{role}</p>
      </div>
    </div>

    <!-- Botões -->
    <div class="flex items-center gap-12">
      <button
        type="button"
        class="h-[56px] w-[88px] md:h-[56px] md:w-[88px] rounded-full border border-[#0B1020]/30
               text-[#0B1020] hover:bg-[#0B1020]/5 transition focus-visible:outline-none
               focus-visible:ring-2 focus-visible:ring-[#0B1020]/30"
        aria-label="Anterior"
        on:click={() => onPrev && onPrev()}
      >
        <svg viewBox="0 0 24 24" class="mx-auto h-6 w-6" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>

      <div class="text-[18px] md:text-[20px] font-medium tabular-nums">
        <span class="underline underline-offset-4 decoration-2">
          {String(index).padStart(2, "0")}
        </span>
        <span class="text-[#A7AAB3]">/{String(total).padStart(2, "0")}</span>
      </div>

      <button
        type="button"
        class="h-[56px] w-[88px] md:h-[56px] md:w-[88px] rounded-full bg-[#0B1020]
               text-white hover:brightness-110 transition focus-visible:outline-none
               focus-visible:ring-2 focus-visible:ring-[#0B1020]/40"
        aria-label="Próximo"
        on:click={() => onNext && onNext()}
      >
        <svg viewBox="0 0 24 24" class="mx-auto h-6 w-6" aria-hidden="true">
          <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
  </div>
</div>
