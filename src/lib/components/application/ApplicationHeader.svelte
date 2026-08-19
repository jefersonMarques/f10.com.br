<script lang="ts">
  export let title: string;
  export let section: string | undefined = undefined;
  export let description: string | undefined = undefined;
  export let sticky = true;
</script>

<header class={`application-header flex min-h-[68px] items-center justify-between gap-4 border-b border-[#E2E5ED] bg-white px-4 sm:px-5 lg:px-6 ${sticky ? "sticky top-0 z-40" : "relative"}`}>
  <div class="min-w-0 py-2.5">
    <h1 class="truncate text-[16px] font-semibold tracking-[-0.02em] text-[#202637]">{title}</h1>
    {#if section || description}
      <p class="mt-0.5 truncate text-[11px] text-[#858B99]">
        {#if section}<span class="font-semibold text-[#EA6D0B]">{section}</span>{/if}{#if section && description}<span class="mx-1">·</span>{/if}{description ?? ""}
      </p>
    {/if}
  </div>

  <div class="flex shrink-0 items-center gap-2 sm:gap-3">
    <slot name="actions" />
  </div>
</header>
