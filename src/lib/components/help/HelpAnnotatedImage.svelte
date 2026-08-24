<script lang="ts">
  import type { HelpImageAnnotation } from "$lib/help/helpImageAnnotations";

  export let src: string;
  export let alt = "";
  export let annotations: HelpImageAnnotation[] = [];
  export let loading: "eager" | "lazy" = "lazy";
  export let className = "";

  function position(value: number): string {
    return `${Math.max(0, Math.min(1, value)) * 100}%`;
  }
</script>

<div class={`relative isolate w-full ${className}`}>
  <img
    {src}
    {alt}
    {loading}
    class="block h-auto w-full object-contain"
  />

  {#each annotations as annotation (annotation.id)}
    {#if annotation.type === "numbered" || annotation.type === "highlight"}
      <div
        class="pointer-events-none absolute border-[3px] border-[#E53935]"
        style={`left:${position(annotation.x)};top:${position(annotation.y)};width:${position(annotation.width)};height:${position(annotation.height)};`}
        aria-hidden="true"
      ></div>
      {#if annotation.type === "numbered"}
        <span
          class="pointer-events-none absolute flex h-6 min-w-6 -translate-x-[38%] -translate-y-[38%] items-center justify-center rounded-full bg-[#E53935] px-1 text-[11px] font-bold leading-none text-white shadow-sm"
          style={`left:${position(annotation.x)};top:${position(annotation.y)};`}
          aria-hidden="true"
        >{annotation.number}</span>
      {/if}
    {:else if annotation.type === "text"}
      <div
        class="pointer-events-none absolute rounded-md border border-[#E53935] bg-white/95 px-2 py-1 text-[11px] font-semibold leading-4 text-[#B71C1C] shadow-sm"
        style={`left:${position(annotation.x)};top:${position(annotation.y)};width:${position(annotation.width)};`}
      >{annotation.text}</div>
    {/if}
  {/each}

  {#if annotations.some((annotation) => annotation.type === "arrow")}
    <svg
      class="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <marker id="help-image-arrow-head" markerWidth="8" markerHeight="8" refX="7" refY="3.5" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="#E53935"></path>
        </marker>
      </defs>
      {#each annotations as annotation (annotation.id)}
        {#if annotation.type === "arrow"}
          <line
            x1={annotation.startX * 100}
            y1={annotation.startY * 100}
            x2={annotation.endX * 100}
            y2={annotation.endY * 100}
            stroke="#E53935"
            stroke-width="3"
            vector-effect="non-scaling-stroke"
            marker-end="url(#help-image-arrow-head)"
          ></line>
        {/if}
      {/each}
    </svg>
  {/if}
</div>
