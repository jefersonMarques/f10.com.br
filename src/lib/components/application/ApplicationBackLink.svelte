<script lang="ts">
  import { ArrowLeft } from "lucide-svelte";

  export let href: string;
  export let label: string;
  export let className = "";
</script>

<a
  {href}
  class={`application-text-caption inline-flex min-h-9 items-center gap-2 rounded-xl px-2.5 font-semibold text-app-text-muted transition hover:bg-app-surface hover:text-app-primary ${className}`}
>
  <ArrowLeft size={15} aria-hidden="true" />
  <span>{label}</span>
</a>
