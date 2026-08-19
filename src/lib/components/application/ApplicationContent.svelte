<script lang="ts">
  export let width: "full" | "wide" | "standard" | "narrow" = "wide";
  export let density: "compact" | "normal" = "compact";
  export let className = "";

  $: widthClass = `application-content--${width}`;
  $: densityClass = density === "normal" ? "application-content--normal" : "";
</script>

<div class={`application-content ${widthClass} ${densityClass} ${className}`}>
  <slot />
</div>
