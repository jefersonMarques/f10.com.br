<script lang="ts">
  export let title: string;
  export let section: string | undefined = undefined;
  export let description: string | undefined = undefined;
  export let sticky = true;
  export let contentWidth: "full" | "wide" | "standard" | "narrow" = "full";

  $: widthClass = contentWidth === "wide"
    ? "max-w-[1600px]"
    : contentWidth === "standard"
      ? "max-w-[1440px]"
      : contentWidth === "narrow"
        ? "max-w-[1120px]"
        : "w-full";
</script>

<header class={`application-header border-b border-[#E2E5ED] bg-white ${sticky ? "sticky top-0 z-40" : "relative"}`}>
  <div class={`mx-auto flex w-full items-center justify-between gap-4 px-5 sm:px-7 lg:px-10 ${widthClass}`}>
    <div class="min-w-0 py-2.5">
      <h1 class="application-text-section truncate font-semibold tracking-[-0.02em] text-[#202637]">{title}</h1>
      {#if section || description}
        <p class="application-text-caption mt-0.5 truncate text-[#858B99]">
          {#if section}<span class="font-semibold text-[#EA6D0B]">{section}</span>{/if}{#if section && description}<span class="mx-1">·</span>{/if}{description ?? ""}
        </p>
      {/if}
    </div>

    <div class="flex shrink-0 items-center gap-2 sm:gap-3">
      <slot name="actions" />
    </div>
  </div>
</header>
