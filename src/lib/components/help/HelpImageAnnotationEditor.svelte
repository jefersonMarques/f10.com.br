<script lang="ts">
  import { ArrowUpRight, Hash, Highlighter, Trash2, Type, X } from "lucide-svelte";
  import HelpAnnotatedImage from "$lib/components/help/HelpAnnotatedImage.svelte";
  import type { HelpImageAnnotation, HelpImageAnnotationType } from "$lib/help/helpImageAnnotations";

  export let imageUrl: string;
  export let altText = "";
  export let annotations: HelpImageAnnotation[] = [];
  export let disabled = false;

  type DrawingTool = HelpImageAnnotationType;
  type Point = { x: number; y: number };
  type DrawingState = { tool: DrawingTool; start: Point; pointerId: number };

  let canvas: HTMLDivElement;
  let activeTool: DrawingTool = "numbered";
  let drawing: DrawingState | null = null;
  let draft: HelpImageAnnotation | null = null;

  const toolOptions: Array<{
    type: DrawingTool;
    label: string;
    icon: typeof Hash;
  }> = [
    { type: "numbered", label: "Número", icon: Hash },
    { type: "highlight", label: "Destaque", icon: Highlighter },
    { type: "arrow", label: "Seta", icon: ArrowUpRight },
    { type: "text", label: "Texto", icon: Type },
  ];

  function clamp(value: number): number {
    return Math.max(0, Math.min(1, value));
  }

  function createId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `annotation-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function pointerPosition(event: PointerEvent): Point {
    const rect = canvas.getBoundingClientRect();
    return {
      x: clamp((event.clientX - rect.left) / Math.max(rect.width, 1)),
      y: clamp((event.clientY - rect.top) / Math.max(rect.height, 1)),
    };
  }

  function nextNumber(): number {
    return Math.min(
      99,
      annotations.reduce(
        (highest, annotation) =>
          annotation.type === "numbered" ? Math.max(highest, annotation.number) : highest,
        0,
      ) + 1,
    );
  }

  function rectangle(start: Point, end: Point) {
    return {
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y),
    };
  }

  function buildDraft(tool: DrawingTool, start: Point, end: Point): HelpImageAnnotation {
    const id = draft?.id ?? createId();
    if (tool === "numbered") {
      return { id, type: "numbered", number: draft?.type === "numbered" ? draft.number : nextNumber(), ...rectangle(start, end) };
    }
    if (tool === "highlight") {
      return { id, type: "highlight", ...rectangle(start, end) };
    }
    if (tool === "arrow") {
      return { id, type: "arrow", startX: start.x, startY: start.y, endX: end.x, endY: end.y };
    }

    const rect = rectangle(start, end);
    const width = Math.max(rect.width, 0.18);
    const x = Math.min(rect.x, 1 - width);
    return {
      id,
      type: "text",
      text: draft?.type === "text" ? draft.text : "Texto",
      x,
      y: rect.y,
      width,
    };
  }

  function validDraft(annotation: HelpImageAnnotation): boolean {
    if (annotation.type === "arrow") {
      return Math.hypot(annotation.endX - annotation.startX, annotation.endY - annotation.startY) >= 0.01;
    }
    if (annotation.type === "text") return annotation.width >= 0.05;
    return annotation.width >= 0.01 && annotation.height >= 0.01;
  }

  function handlePointerDown(event: PointerEvent): void {
    if (disabled || event.button !== 0) return;
    event.preventDefault();
    const start = pointerPosition(event);
    drawing = { tool: activeTool, start, pointerId: event.pointerId };
    draft = buildDraft(activeTool, start, start);
    canvas.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent): void {
    if (!drawing || event.pointerId !== drawing.pointerId) return;
    draft = buildDraft(drawing.tool, drawing.start, pointerPosition(event));
  }

  function finishDrawing(event: PointerEvent): void {
    if (!drawing || event.pointerId !== drawing.pointerId) return;
    const finished = buildDraft(drawing.tool, drawing.start, pointerPosition(event));
    if (validDraft(finished)) annotations = [...annotations, finished];
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    drawing = null;
    draft = null;
  }

  function cancelDrawing(): void {
    drawing = null;
    draft = null;
  }

  function removeAnnotation(id: string): void {
    annotations = annotations.filter((annotation) => annotation.id !== id);
  }

  function updateNumber(id: string, value: number): void {
    const number = Math.max(1, Math.min(99, Math.round(value || 1)));
    annotations = annotations.map((annotation) =>
      annotation.id === id && annotation.type === "numbered"
        ? { ...annotation, number }
        : annotation,
    );
  }

  function updateText(id: string, value: string): void {
    annotations = annotations.map((annotation) =>
      annotation.id === id && annotation.type === "text"
        ? { ...annotation, text: value.slice(0, 240) }
        : annotation,
    );
  }

  function annotationLabel(annotation: HelpImageAnnotation): string {
    if (annotation.type === "numbered") return `Marcação ${annotation.number}`;
    if (annotation.type === "highlight") return "Destaque";
    if (annotation.type === "arrow") return "Seta";
    return "Texto";
  }
</script>

<svelte:window on:keydown={(event) => event.key === "Escape" && cancelDrawing()} />

<div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
  <section class="min-w-0 rounded-[20px] border border-[#DDE1EA] bg-[#F7F8FB] p-3 sm:p-4">
    <div class="mb-3 flex flex-wrap items-center gap-2">
      {#each toolOptions as option}
        <button
          type="button"
          disabled={disabled}
          on:click={() => { activeTool = option.type; cancelDrawing(); }}
          class={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-[10px] font-semibold transition ${activeTool === option.type ? "bg-[#000A57] text-white" : "border border-[#DDE1EA] bg-white text-[#4F5667] hover:border-[#B8BECD]"}`}
        >
          <svelte:component this={option.icon} size={14}/>{option.label}
        </button>
      {/each}
      {#if draft}
        <button type="button" on:click={cancelDrawing} class="ml-auto inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-[10px] font-semibold text-[#8A3B3B]"><X size={13}/>Cancelar</button>
      {/if}
    </div>

    <p class="mb-3 text-[10px] leading-5 text-[#777E8E]">
      Selecione uma ferramenta e arraste diretamente sobre a tela. As coordenadas são proporcionais, então as marcações acompanham a imagem em qualquer tamanho.
    </p>

    <div
      bind:this={canvas}
      class={`relative touch-none select-none ${disabled ? "cursor-default" : "cursor-crosshair"}`}
      role="application"
      aria-label="Editor de marcações da imagem"
      on:pointerdown={handlePointerDown}
      on:pointermove={handlePointerMove}
      on:pointerup={finishDrawing}
      on:pointercancel={cancelDrawing}
    >
      <HelpAnnotatedImage
        src={imageUrl}
        alt={altText || "Screenshot para marcação"}
        annotations={draft ? [...annotations, draft] : annotations}
        loading="eager"
        className="overflow-hidden rounded-xl border border-[#CFD4DF] bg-white shadow-sm"
      />
    </div>
  </section>

  <aside class="rounded-[20px] border border-[#E2E5ED] bg-white p-4">
    <div class="flex items-center justify-between gap-3">
      <div><h3 class="text-[12px] font-semibold text-[#303645]">Marcações</h3><p class="mt-1 text-[9px] text-[#8A909D]">{annotations.length} de 40</p></div>
      {#if annotations.length > 0 && !disabled}
        <button type="button" on:click={() => (annotations = [])} class="text-[9px] font-semibold text-[#A34242]">Limpar tudo</button>
      {/if}
    </div>

    {#if annotations.length === 0}
      <div class="mt-4 rounded-xl border border-dashed border-[#D8DCE5] bg-[#FAFAFC] px-3 py-5 text-center text-[9px] leading-5 text-[#8A909D]">Nenhuma marcação. Use Número, Destaque, Seta ou Texto sobre a imagem.</div>
    {:else}
      <div class="mt-4 space-y-2">
        {#each annotations as annotation, index (annotation.id)}
          <div class="rounded-xl border border-[#E3E6ED] bg-[#FAFAFC] p-3">
            <div class="flex items-center justify-between gap-2">
              <strong class="text-[10px] text-[#414858]">{index + 1}. {annotationLabel(annotation)}</strong>
              {#if !disabled}<button type="button" on:click={() => removeAnnotation(annotation.id)} class="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#A34242] hover:bg-[#FFF0F0]" aria-label="Excluir marcação"><Trash2 size={13}/></button>{/if}
            </div>

            {#if annotation.type === "numbered"}
              <label class="mt-2 block"><span class="mb-1 block text-[8px] font-semibold uppercase tracking-[0.06em] text-[#858B98]">Número</span><input type="number" min="1" max="99" value={annotation.number} disabled={disabled} on:input={(event) => updateNumber(annotation.id, Number((event.currentTarget as HTMLInputElement).value))} class="h-8 w-full rounded-lg border border-[#DDE1EA] bg-white px-2 text-[10px]"/></label>
            {:else if annotation.type === "text"}
              <label class="mt-2 block"><span class="mb-1 block text-[8px] font-semibold uppercase tracking-[0.06em] text-[#858B98]">Texto</span><input maxlength="240" value={annotation.text} disabled={disabled} on:input={(event) => updateText(annotation.id, (event.currentTarget as HTMLInputElement).value)} class="h-8 w-full rounded-lg border border-[#DDE1EA] bg-white px-2 text-[10px]"/></label>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </aside>
</div>
