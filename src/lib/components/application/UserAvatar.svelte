<script lang="ts">
  export let userId: string | null = null;
  export let name: string;
  export let hasAvatar = false;
  export let size: "xs" | "sm" | "md" | "lg" = "sm";
  export let className = "";

  let failedImageId: string | null = null;

  $: sizeClass = size === "xs"
    ? "h-7 w-7 text-[10px]"
    : size === "md"
      ? "h-12 w-12 text-[14px]"
      : size === "lg"
        ? "h-16 w-16 text-[18px]"
        : "h-10 w-10 text-[12px]";

  $: initials = name.trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "?";

  $: imageUrl = userId && hasAvatar && failedImageId !== userId
    ? `/api/app/users/${encodeURIComponent(userId)}/avatar`
    : null;
</script>

<span
  class={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--app-info-bg)] font-semibold text-[var(--app-primary)] ${sizeClass} ${className}`}
  role="img" aria-label={`Foto de ${name}`}
>
  {initials}
  {#if imageUrl}
    <img src={imageUrl} alt="" loading="lazy" decoding="async"
      class="absolute inset-0 h-full w-full object-cover"
      on:error={() => (failedImageId = userId)}/>
  {/if}
</span>
