<script lang="ts">
  export let width: "full" | "wide" | "standard" | "narrow" = "wide";
  export let density: "compact" | "normal" = "compact";
  export let className = "";

  $: widthClass = width === "full"
    ? "max-w-none"
    : width === "standard"
      ? "max-w-[1440px]"
      : width === "narrow"
        ? "max-w-[1120px]"
        : "max-w-[1600px]";
  $: spacingClass = density === "normal"
    ? "px-4 py-5 sm:px-6 sm:py-6"
    : "px-4 py-4 sm:px-5 sm:py-5 xl:px-6";
</script>

<div class={`mx-auto w-full ${widthClass} ${spacingClass} ${className}`}>
  <slot />
</div>
