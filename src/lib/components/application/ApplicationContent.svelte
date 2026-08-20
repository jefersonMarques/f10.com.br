<script lang="ts">
  export let width: "full" | "wide" | "standard" | "narrow" = "wide";
  export let density: "compact" | "normal" = "compact";
  export let padding: "default" | "none" = "default";
  export let className = "";

  $: widthClass = `application-content--${width}`;
  $: densityClass = density === "normal" ? "application-content--normal" : "";
  $: paddingClass = padding === "none" ? "application-content--flush" : "";
</script>

<div class={`application-content ${widthClass} ${densityClass} ${paddingClass} ${className}`}>
  <slot />
</div>
