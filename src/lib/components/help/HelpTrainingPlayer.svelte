<script lang="ts">
  import { enhance } from "$app/forms";
  import { onMount } from "svelte";
  import type { SubmitFunction } from "@sveltejs/kit";
  import {
    ArrowLeft,
    LoaderCircle,
    Play,
    Sparkles,
  } from "lucide-svelte";
  import HelpTrainingTutor from "$lib/components/help/HelpTrainingTutor.svelte";
  import { claimTrainingPipWindow } from "$lib/help/trainingPipBridge";
  import { trainingMarkupToHtml } from "$lib/help/trainingMarkup";

  type TrainingPlayerStep = {
    id: string;
    title: string;
    question?: string;
    instruction: string;
    expectedResult: string;
    successMessage: string;
    primaryActionLabel: string;
    interactionMode: "presentation" | "action";
    videoStartSeconds: number;
    images: Array<{ assetId: string; altText: string }>;
    videoUrl: string | null;
  };

  type PipMode = "guide" | "video";
  type DocumentPictureInPictureController = {
    requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>;
  };

  export let mode: "preview" | "invite" | "public";
  export let trainingTitle: string;
  export let sourceContentSlug: string;
  export let step: TrainingPlayerStep;
  export let assetBasePath: string;
  export let canGoBack = false;
  export let successMessage = "";
  export let formMessage = "";
  export let successAction = "";
  export let backAction = "";
  export let onAdvance: (() => void) | null = null;
  export let onBack: (() => void) | null = null;

  let trackedStepId = step.id;
  let pipOpening = false;
  let pipWindow: Window | null = null;
  let pipMode: PipMode = "guide";
  let fallbackOpen = false;
  let successForm: HTMLFormElement | null = null;
  let backForm: HTMLFormElement | null = null;
  let isSubmitting = false;
  let pipVideoElement: HTMLVideoElement | null = null;
  let pipVideoFrame: HTMLIFrameElement | null = null;

  $: currentImage = step.images[0] ?? null;

  $: if (step.id !== trackedStepId) {
    trackedStepId = step.id;
    stopPipMedia();
    pipMode = "guide";
    if (pipWindow && !pipWindow.closed) renderPip();
  }

  $: if (pipWindow && !pipWindow.closed) {
    step.id;
    step.title;
    step.instruction;
    step.videoStartSeconds;
    canGoBack;
    isSubmitting;
    successMessage;
    formMessage;
    pipMode;
    renderPip();
  }

  onMount(() => {
    const pending = claimTrainingPipWindow();
    if (pending) {
      void pending.then((claimed) => {
        if (claimed) adoptPipWindow(claimed);
        else fallbackOpen = true;
      });
    }

    return () => {
      stopPipMedia();
      if (pipWindow && !pipWindow.closed) pipWindow.close();
    };
  });

  const enhanceNavigation: SubmitFunction = () => {
    if (isSubmitting) return () => undefined;
    isSubmitting = true;
    return async ({ update }) => {
      try {
        await update({ reset: false, invalidateAll: true });
      } finally {
        isSubmitting = false;
      }
    };
  };

  function triggerAdvance(): void {
    if (isSubmitting) return;
    if (mode === "preview") onAdvance?.();
    else successForm?.requestSubmit();
  }

  function triggerBack(): void {
    if (isSubmitting || !canGoBack) return;
    if (mode === "preview") onBack?.();
    else backForm?.requestSubmit();
  }

  function formatSeconds(value: number): string {
    const seconds = Math.max(0, Math.round(value || 0));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }

  function getDocumentPictureInPicture(): DocumentPictureInPictureController | null {
    if (typeof window === "undefined") return null;
    return (window as Window & {
      documentPictureInPicture?: DocumentPictureInPictureController;
    }).documentPictureInPicture ?? null;
  }

  function stopPipMedia(): void {
    if (pipVideoElement) {
      try {
        pipVideoElement.pause();
        pipVideoElement.removeAttribute("src");
        pipVideoElement.load();
      } catch {
        // A janela pode já ter sido encerrada pelo navegador.
      }
      pipVideoElement = null;
    }

    if (pipVideoFrame) {
      try {
        pipVideoFrame.src = "about:blank";
      } catch {
        // A janela pode já ter sido encerrada pelo navegador.
      }
      pipVideoFrame = null;
    }
  }

  function adoptPipWindow(windowRef: Window): void {
    pipWindow = windowRef;
    pipMode = "guide";
    fallbackOpen = false;
    pipWindow.addEventListener("pagehide", () => {
      stopPipMedia();
      pipWindow = null;
      pipMode = "guide";
    }, { once: true });
    renderPip();
  }

  async function openGuide(): Promise<void> {
    const controller = getDocumentPictureInPicture();
    if (!controller || pipOpening) {
      fallbackOpen = true;
      return;
    }

    pipOpening = true;
    try {
      const availableHeight = Number.isFinite(window.screen?.availHeight)
        ? window.screen.availHeight
        : 760;
      const opened = await controller.requestWindow({
        width: 430,
        height: Math.max(620, availableHeight - 40),
      });
      adoptPipWindow(opened);
    } catch {
      fallbackOpen = true;
    } finally {
      pipOpening = false;
    }
  }

  function returnToGuide(): void {
    stopPipMedia();
    pipMode = "guide";
    renderPip();
  }

  function openVideoHelp(): void {
    if (!step.videoUrl) return;

    if (pipWindow && !pipWindow.closed) {
      stopPipMedia();
      pipMode = "video";
      renderPip();
      return;
    }

    const controller = getDocumentPictureInPicture();
    if (!controller || pipOpening) {
      fallbackOpen = true;
      return;
    }

    pipOpening = true;
    void controller.requestWindow({ width: 560, height: 430 })
      .then((opened) => {
        pipWindow = opened;
        pipMode = "video";
        fallbackOpen = false;
        pipWindow.addEventListener("pagehide", () => {
          stopPipMedia();
          pipWindow = null;
          pipMode = "guide";
        }, { once: true });
        renderPip();
      })
      .catch(() => {
        fallbackOpen = true;
      })
      .finally(() => {
        pipOpening = false;
      });
  }

  function trainingVideoAssetId(value: string | null): string | null {
    if (!value?.startsWith("asset:")) return null;
    const id = value.slice("asset:".length);
    return /^[0-9a-f-]{36}$/i.test(id) ? id : null;
  }

  function youtubeEmbedUrl(value: string | null): string | null {
    if (!value || value.startsWith("asset:")) return null;
    try {
      const url = new URL(value);
      let id = "";
      if (url.hostname === "youtu.be") id = url.pathname.slice(1).split("/")[0] ?? "";
      if (url.hostname.endsWith("youtube.com")) {
        if (url.pathname === "/watch") id = url.searchParams.get("v") ?? "";
        else if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) {
          id = url.pathname.split("/")[2] ?? "";
        }
      }
      return id
        ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&start=${Math.max(0, Math.round(step.videoStartSeconds || 0))}`
        : null;
    } catch {
      return null;
    }
  }

  function appendText(
    doc: Document,
    parent: HTMLElement,
    tag: "p" | "h1" | "strong" | "span",
    className: string,
    value: string,
  ): HTMLElement {
    const node = doc.createElement(tag);
    node.className = className;
    node.textContent = value;
    parent.append(node);
    return node;
  }

  function appendMarkup(doc: Document, parent: HTMLElement, className: string, value: string): HTMLElement {
    const node = doc.createElement("div");
    node.className = className;
    node.innerHTML = trainingMarkupToHtml(value);
    parent.append(node);
    return node;
  }

  function pipButton(
    doc: Document,
    label: string,
    className: string,
    handler: () => void,
    disabled = false,
  ): HTMLButtonElement {
    const node = doc.createElement("button");
    node.type = "button";
    node.className = className;
    node.textContent = label;
    node.disabled = disabled;
    if (!disabled) node.addEventListener("click", handler);
    return node;
  }

  function appendPipStyles(doc: Document): void {
    const style = doc.createElement("style");
    style.textContent = `
      :root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#07132d;background:#f8f9fc}
      *{box-sizing:border-box}body{margin:0;height:100vh;overflow:hidden;background:#f8f9fc}
      .guide{height:100vh;display:grid;grid-template-rows:auto minmax(0,1fr) auto}.top{display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid #e5e8ef;background:#fff;padding:12px 15px}.brand{display:flex;min-width:0;align-items:center;gap:9px}.logo{font-size:21px;font-weight:900;letter-spacing:-.07em;color:#f36b00}.training{max-width:230px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9px;font-weight:700;color:#687184}
      .content{overflow-y:auto;padding:24px 22px 30px}.eyebrow{margin:0 0 9px;font-size:9px;font-weight:850;letter-spacing:.13em;text-transform:uppercase;color:#ea6d0b}.title{margin:0;color:#07132d;font-size:28px;line-height:1.08;letter-spacing:-.045em}
      .rich{margin-top:18px;color:#4a556b;font-size:15px;line-height:1.68}.rich p{margin:0 0 12px}.rich strong{color:#07132d;font-weight:850}.rich em{color:#596579}.rich code{display:inline-block;border-radius:7px;background:#eef0f5;padding:2px 7px;color:#000a57;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.9em;font-weight:850}.rich ul,.rich ol{margin:10px 0 14px;padding-left:22px}.rich li{margin:7px 0}.rich h2,.rich h3{margin:18px 0 8px;color:#07132d;line-height:1.25}.rich h2{font-size:16px}.rich h3{font-size:14px}.rich blockquote{margin:14px 0;border-left:3px solid #ea6d0b;border-radius:0 10px 10px 0;background:#fff7f0;padding:10px 12px;color:#6f4e35}.rich hr{margin:18px 0;border:0;border-top:1px solid #e5e8ef}
      .video-help{width:100%;margin-top:20px;border:1px solid #ffc99e;border-radius:14px;background:#fff7f0;color:#b94e00;min-height:48px;font-size:11px;font-weight:850;cursor:pointer}.success{margin-top:14px;border-radius:12px;background:#eef8f1;padding:10px 12px;color:#2f7045;font-size:10px;font-weight:700}.error{margin-top:14px;border-radius:12px;background:#fff2f2;padding:10px 12px;color:#9b2c2c;font-size:10px}
      .footer{display:grid;grid-template-columns:1fr 1.45fr;gap:9px;border-top:1px solid #e5e8ef;background:#fff;padding:12px 14px}.neutral,.positive{min-height:50px;border-radius:14px;font-size:12px;font-weight:850;cursor:pointer}.neutral{border:1px solid #d9dee8;background:#fff;color:#596174}.neutral:disabled{opacity:.38}.positive{border:1px solid #2f7d4c;background:#2f7d4c;color:#fff;box-shadow:0 10px 24px rgba(47,125,76,.20)}.positive:disabled{opacity:.55}
      .video-shell{height:100vh;display:grid;grid-template-rows:auto minmax(0,1fr);background:#000}.video-top{display:flex;align-items:center;justify-content:space-between;gap:10px;background:#010d28;padding:11px 13px;color:#fff}.video-meta{min-width:0}.video-meta span{display:block;font-size:8px;font-weight:850;letter-spacing:.12em;text-transform:uppercase;color:#ff9a4b}.video-meta strong{display:block;max-width:360px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:3px;font-size:11px}.back-guide{min-height:34px;border:1px solid rgba(255,255,255,.16);border-radius:10px;background:rgba(255,255,255,.08);padding:0 11px;color:#fff;font-size:9px;font-weight:750;cursor:pointer}.video-content{min-height:0;display:flex;align-items:center;justify-content:center;background:#000}.video-content video,.video-content iframe{width:100%;height:100%;border:0;background:#000;object-fit:contain}.video-link{display:inline-flex;min-height:44px;align-items:center;border-radius:999px;background:#fff;padding:0 18px;color:#000a57;font-size:10px;font-weight:800;text-decoration:none}
    `;
    doc.head.append(style);
  }

  function renderGuide(doc: Document): void {
    const root = doc.createElement("main");
    root.className = "guide";

    const top = doc.createElement("header");
    top.className = "top";
    const brand = doc.createElement("div");
    brand.className = "brand";
    appendText(doc, brand, "strong", "logo", "F10");
    appendText(doc, brand, "span", "training", trainingTitle);
    top.append(brand);
    root.append(top);

    const content = doc.createElement("section");
    content.className = "content";
    appendText(doc, content, "p", "eyebrow", "Etapa da trilha");
    appendText(doc, content, "h1", "title", step.title);
    appendMarkup(doc, content, "rich", step.instruction);

    if (step.videoUrl) {
      content.append(pipButton(
        doc,
        `▶ Ajuda em vídeo · trecho ${formatSeconds(step.videoStartSeconds)}`,
        "video-help",
        openVideoHelp,
      ));
    }

    if (successMessage) appendText(doc, content, "p", "success", successMessage);
    if (formMessage) appendText(doc, content, "p", "error", formMessage);
    root.append(content);

    const footer = doc.createElement("footer");
    footer.className = "footer";
    footer.append(pipButton(doc, "← Voltar", "neutral", triggerBack, !canGoBack || isSubmitting));
    footer.append(pipButton(
      doc,
      step.primaryActionLabel?.trim() || "Continuar",
      "positive",
      triggerAdvance,
      isSubmitting,
    ));
    root.append(footer);

    doc.body.append(root);
  }

  function renderVideo(doc: Document): void {
    const root = doc.createElement("main");
    root.className = "video-shell";

    const top = doc.createElement("header");
    top.className = "video-top";
    const meta = doc.createElement("div");
    meta.className = "video-meta";
    appendText(doc, meta, "span", "", `Ajuda em vídeo · ${formatSeconds(step.videoStartSeconds)}`);
    appendText(doc, meta, "strong", "", step.title);
    top.append(meta);
    top.append(pipButton(doc, "← Voltar à orientação", "back-guide", returnToGuide));
    root.append(top);

    const content = doc.createElement("section");
    content.className = "video-content";
    const assetId = trainingVideoAssetId(step.videoUrl);
    const youtubeUrl = youtubeEmbedUrl(step.videoUrl);

    if (assetId) {
      const video = doc.createElement("video");
      pipVideoElement = video;
      video.src = `${assetBasePath}/${assetId}`;
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      video.addEventListener("loadedmetadata", () => {
        try {
          video.currentTime = Math.max(0, step.videoStartSeconds || 0);
          void video.play().catch(() => undefined);
        } catch {
          // Mantém a reprodução normal quando o seek não estiver disponível.
        }
      }, { once: true });
      content.append(video);
    } else if (youtubeUrl) {
      const iframe = doc.createElement("iframe");
      pipVideoFrame = iframe;
      iframe.src = youtubeUrl;
      iframe.title = `Ajuda em vídeo: ${step.title}`;
      iframe.allow = "autoplay; encrypted-media; picture-in-picture";
      iframe.allowFullscreen = true;
      content.append(iframe);
    } else if (step.videoUrl) {
      const link = doc.createElement("a");
      link.className = "video-link";
      link.href = step.videoUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Abrir vídeo";
      content.append(link);
    }

    root.append(content);
    doc.body.append(root);
  }

  function renderPip(): void {
    if (!pipWindow || pipWindow.closed) return;
    const doc = pipWindow.document;

    if (pipMode === "guide") stopPipMedia();

    doc.title = pipMode === "video" ? `Vídeo | ${step.title}` : `${step.title} | Trilha F10`;
    doc.head.replaceChildren();
    doc.body.replaceChildren();
    appendPipStyles(doc);
    if (pipMode === "video") renderVideo(doc);
    else renderGuide(doc);
  }
</script>

{#if mode !== "preview"}
  <form bind:this={successForm} method="POST" action={successAction} use:enhance={enhanceNavigation} class="hidden"></form>
  <form bind:this={backForm} method="POST" action={backAction} use:enhance={enhanceNavigation} class="hidden"></form>
{/if}

<div class="fixed inset-0 z-[80] h-[100dvh] overflow-hidden bg-[#F5F6FA] text-[#061333]">
  <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_7%_16%,rgba(234,109,11,0.10),transparent_24%),radial-gradient(circle_at_90%_75%,rgba(0,10,87,0.05),transparent_26%)]"></div>

  <header class="relative z-20 flex min-h-16 items-center justify-between gap-3 border-b border-[#E4E7EE] bg-white/94 px-4 py-2 backdrop-blur sm:px-8 lg:px-[max(2rem,calc((100vw-1520px)/2))]">
    <div class="flex min-w-0 items-center gap-3">
      <span class="text-[28px] font-black tracking-[-0.08em] text-[#F36B00]">F10</span>
      <span class="h-7 w-px bg-[#D9DDE7]"></span>
      <strong class="truncate text-[11px] font-semibold text-[#1E2942] sm:text-[12px]">{trainingTitle}</strong>
    </div>
    <span class="hidden text-[8px] font-semibold uppercase tracking-[0.09em] text-[#8D93A0] sm:block">Trilha guiada</span>
  </header>

  <main class="relative z-10 h-[calc(100dvh-4rem)] overflow-y-auto px-4 py-5 sm:px-7 sm:py-7">
    <div class="mx-auto grid min-h-full w-full max-w-[1520px] items-center gap-7 lg:grid-cols-[minmax(0,1fr)_430px] lg:gap-8">
      <section class="flex min-h-[360px] items-center justify-start lg:min-h-[calc(100dvh-8rem)]">
        {#if currentImage}
          <div class="flex max-h-[82dvh] min-h-[330px] w-full items-center justify-center overflow-hidden rounded-[30px] bg-white shadow-[0_26px_76px_rgba(12,23,52,0.11)] ring-1 ring-[#E1E5ED] lg:min-h-[560px]">
            <img
              src={`${assetBasePath}/${currentImage.assetId}`}
              alt={currentImage.altText || step.title}
              class="max-h-[82dvh] w-full object-contain"
            />
          </div>
        {:else}
          <div class="visual-fallback w-full max-w-[980px] overflow-hidden rounded-[30px] border border-[#E1E5ED] bg-white shadow-[0_26px_76px_rgba(12,23,52,0.10)]">
            <div class="border-b border-[#E9ECF2] bg-[#FAFBFD] px-7 py-5 sm:px-10">
              <p class="text-[9px] font-bold uppercase tracking-[0.16em] text-[#EA6D0B]">Visão da etapa</p>
              <h2 class="mt-2 text-[26px] font-semibold tracking-[-0.04em] text-[#07132D] sm:text-[34px]">{step.title}</h2>
            </div>
            <div class="visual-markup px-7 py-7 sm:px-10 sm:py-9">
              {@html trainingMarkupToHtml(step.instruction)}
            </div>
          </div>
        {/if}
      </section>

      <aside class="flex min-h-[280px] items-center justify-center lg:min-h-[calc(100dvh-8rem)]">
        {#if !pipWindow || pipWindow.closed}
          <div class="w-full max-w-[400px] text-center">
            <span class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#000A57] text-[12px] font-black text-white">F10</span>
            <p class="mt-7 text-[9px] font-bold uppercase tracking-[0.18em] text-[#F36B00]">Trilha em andamento</p>
            <h1 class="mt-3 text-balance text-[34px] font-semibold tracking-[-0.045em] text-[#061333] sm:text-[40px]">Continuar trilha</h1>
            <p class="mx-auto mt-4 max-w-[340px] text-[12px] leading-6 text-[#667086]">A orientação continua exatamente no ponto em que você parou.</p>
            <button
              type="button"
              on:click={() => void openGuide()}
              disabled={pipOpening}
              class="training-resume mt-7 inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#F36B00] px-8 text-[12px] font-bold text-white shadow-[0_18px_40px_rgba(243,107,0,0.24)] disabled:opacity-60"
            >
              {#if pipOpening}<LoaderCircle size={16} class="animate-spin"/>{:else}<Sparkles size={16}/>{/if}
              Continuar trilha
            </button>
          </div>
        {:else}
          <div class="h-full w-full"></div>
        {/if}
      </aside>
    </div>
  </main>
</div>

{#if fallbackOpen}
  <div class="fixed inset-0 z-[140] flex items-end justify-center bg-[#07132D]/60 p-3 backdrop-blur-[3px] sm:items-center">
    <section class="max-h-[88dvh] w-full max-w-[520px] overflow-y-auto rounded-[26px] bg-white p-5 shadow-2xl sm:p-6">
      <p class="text-[8px] font-bold uppercase tracking-[0.13em] text-[#EA6D0B]">Etapa da trilha</p>
      <h2 class="mt-2 text-[26px] font-semibold tracking-[-0.04em] text-[#061333]">{step.title}</h2>
      <div class="training-rich mt-4 text-[13px] leading-6 text-[#5E687E]">{@html trainingMarkupToHtml(step.instruction)}</div>
      {#if step.videoUrl}
        <button type="button" on:click={openVideoHelp} class="mt-5 min-h-11 w-full rounded-xl border border-[#FFD1B0] bg-[#FFF7F0] text-[10px] font-bold text-[#B94E00]"><Play size={13} class="mr-1 inline"/>Ajuda em vídeo · {formatSeconds(step.videoStartSeconds)}</button>
      {/if}
      <div class="mt-5 grid grid-cols-[1fr_1.45fr] gap-2">
        <button type="button" on:click={triggerBack} disabled={!canGoBack || isSubmitting} class="min-h-12 rounded-xl border border-[#D8DDE7] bg-white text-[10px] font-semibold text-[#596174] disabled:opacity-40"><ArrowLeft size={14} class="mr-1 inline"/>Voltar</button>
        <button type="button" on:click={triggerAdvance} disabled={isSubmitting} class="min-h-12 rounded-xl bg-[#2F7D4C] text-[10px] font-bold text-white">{step.primaryActionLabel?.trim() || "Continuar"}</button>
      </div>
      <button type="button" on:click={() => (fallbackOpen = false)} class="mt-3 min-h-9 w-full text-[9px] font-semibold text-[#737B8C]">Fechar</button>
    </section>
  </div>
{/if}

<HelpTrainingTutor {mode} {sourceContentSlug} />

<style>
  .training-resume {
    animation: training-resume-float 3.2s ease-in-out infinite;
    transition: transform 180ms ease, box-shadow 180ms ease;
  }

  :global(.training-rich p),
  :global(.visual-markup p) { margin: 0.32rem 0; }

  :global(.training-rich strong),
  :global(.visual-markup strong) { font-weight: 800; color: #061333; }

  :global(.training-rich code),
  :global(.visual-markup code) {
    display: inline-block;
    border-radius: 0.4rem;
    background: #edf0f5;
    padding: 0.04rem 0.4rem;
    color: #000a57;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.92em;
    font-weight: 800;
  }

  :global(.training-rich ul),
  :global(.training-rich ol),
  :global(.visual-markup ul),
  :global(.visual-markup ol) {
    margin: 0.65rem 0;
    padding-left: 1.4rem;
  }

  :global(.training-rich li),
  :global(.visual-markup li) { margin: 0.32rem 0; }

  :global(.visual-markup) {
    color: #4A556B;
    font-size: 15px;
    line-height: 1.75;
  }

  :global(.visual-markup h2),
  :global(.visual-markup h3) {
    margin: 1rem 0 0.5rem;
    color: #07132D;
    line-height: 1.25;
  }

  :global(.visual-markup h2) { font-size: 20px; }
  :global(.visual-markup h3) { font-size: 16px; }

  :global(.visual-markup blockquote) {
    margin: 1rem 0;
    border-left: 3px solid #EA6D0B;
    border-radius: 0 12px 12px 0;
    background: #FFF7F0;
    padding: 0.8rem 1rem;
    color: #6F4E35;
  }

  @keyframes training-resume-float {
    0%, 100% { transform: translateY(0); box-shadow: 0 18px 40px rgba(243,107,0,0.22); }
    50% { transform: translateY(-5px); box-shadow: 0 24px 46px rgba(243,107,0,0.30); }
  }

  @media (prefers-reduced-motion: reduce) {
    .training-resume { animation: none; transition: none; }
  }
</style>
