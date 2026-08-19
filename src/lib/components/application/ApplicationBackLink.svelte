<script lang="ts">
  import { ArrowLeft } from "lucide-svelte";

  export let href: string;
  export let label: string;
  export let className = "";
</script>

<a
  {href}
  class={`inline-flex min-h-9 items-center gap-2 rounded-xl px-2.5 text-[11px] font-semibold text-[#626979] transition hover:bg-white hover:text-[#000A57] ${className}`}
>
  <ArrowLeft size={15} aria-hidden="true" />
  <span>{label}</span>
</a>
