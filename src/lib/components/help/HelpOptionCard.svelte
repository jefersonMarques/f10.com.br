<script lang="ts">
  import {
    ArrowRight,
    BookOpen,
    Boxes,
    Download,
    GraduationCap,
    KeyRound,
    LifeBuoy,
    Megaphone,
    UserRoundCog,
    WalletCards,
  } from "lucide-svelte";
  import type {
    HelpIconName,
    HelpOption,
  } from "$lib/help/helpDecisionTree";

  export let option: HelpOption;
  export let compact = false;
  export let onSelect: (option: HelpOption) => void = () => undefined;

  const iconComponents = {
    access: KeyRound,
    book: BookOpen,
    classes: GraduationCap,
    download: Download,
    finance: WalletCards,
    help: LifeBuoy,
    operations: Boxes,
    sales: Megaphone,
    support: LifeBuoy,
    team: UserRoundCog,
  } satisfies Record<HelpIconName, typeof KeyRound>;

  $: IconComponent = iconComponents[option.icon];
</script>

<button
  type="button"
  class={`group flex w-full items-center gap-3 rounded-[20px] border border-[#DFE3ED] bg-white text-left shadow-[0_12px_34px_rgba(1,13,40,0.06)] transition hover:-translate-y-0.5 hover:border-[#EA6D0B]/50 hover:shadow-[0_18px_40px_rgba(1,13,40,0.1)] focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40 focus:ring-offset-2 ${compact ? "min-h-[88px] p-3.5 sm:min-h-[104px] sm:p-4" : "min-h-[112px] p-4 sm:min-h-[148px] sm:flex-col sm:items-start sm:p-5"}`}
  on:click={() => onSelect(option)}
>
  <span
    class={`inline-flex shrink-0 items-center justify-center rounded-2xl bg-[#FFF0E4] text-[#D65B0A] transition group-hover:bg-[#EA6D0B] group-hover:text-white ${compact ? "h-11 w-11" : "h-12 w-12"}`}
  >
    <svelte:component
      this={IconComponent}
      size={compact ? 21 : 24}
      aria-hidden="true"
    />
  </span>

  <span class="min-w-0 flex-1">
    <span
      class={`block font-semibold leading-snug text-[#010D28] ${compact ? "text-[13px] sm:text-[15px]" : "text-[15px] sm:text-[17px]"}`}
    >
      {option.label}
    </span>
    <span
      class={`mt-1 leading-[1.5] text-[#686E7F] ${compact ? "hidden text-[12px] sm:block" : "block text-[12px] sm:text-[13px]"}`}
    >
      {option.description}
    </span>
  </span>

  <ArrowRight
    class="shrink-0 text-[#EA6D0B] transition group-hover:translate-x-1"
    size={18}
    aria-hidden="true"
  />
</button>
