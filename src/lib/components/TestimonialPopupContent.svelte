<script lang="ts">
  import { testimonialPopupData, showTestimonialPopup } from "$lib/stores/testimonialPopup";
  import { onDestroy, onMount } from "svelte";
  import { tick } from "svelte";

  let videoEl: HTMLVideoElement | null = null;
  let needsUserSound = false;

  function closeModal() {
    showTestimonialPopup.set(false);
  }

  async function tryPlayWithSoundFirst() {
    if (!$testimonialPopupData?.videoSrc || !videoEl) return;

    needsUserSound = false;

    // tenta com som
    videoEl.currentTime = 0;
    videoEl.muted = false;
    videoEl.volume = 1;

    try {
      await videoEl.play();
      return; // ✅ tocou com som
    } catch (err) {
      // ❌ bloqueou autoplay com som
      needsUserSound = true;

      // fallback: toca mudo pra já "rodar"
      try {
        videoEl.muted = true;
        await videoEl.play();
      } catch {
        // até mudo pode falhar em alguns cenários — usuário dá play manual
      }
    }
  }

  async function enableSoundNow() {
    if (!videoEl) return;

    try {
      videoEl.muted = false;
      videoEl.volume = 1;
      await videoEl.play();
      needsUserSound = false;
    } catch {
      // se falhar, o usuário pode clicar no play do próprio player
    }
  }

  onMount(async () => {
    await tick();
    await tryPlayWithSoundFirst();
  });

  onDestroy(() => {
    try {
      if (videoEl) {
        videoEl.pause();
        videoEl.currentTime = 0;
      }
    } catch {
      // ignore
    }
  });
</script>

{#if $testimonialPopupData}
  <div class="p-6 md:p-10 max-h-[90vh]">
    <!-- Header -->
    <div class="flex items-start gap-4">
      {#if $testimonialPopupData.avatar}
        <img
          src={$testimonialPopupData.avatar}
          alt={$testimonialPopupData.author ?? "Avatar"}
          class="h-12 w-12 rounded-full object-cover ring-1 ring-black/10"
          loading="lazy"
        />
      {/if}

      <div class="min-w-0">
        <h3 class="text-[18px] md:text-[20px] font-semibold text-[#000A57] leading-tight">
          {$testimonialPopupData.title}
        </h3>

        {#if $testimonialPopupData.author}
          <p class="mt-1 text-[13px] md:text-[14px] text-[#000A57]/70">
            <span class="font-medium text-[#000A57]/85">{$testimonialPopupData.author}</span>
            {#if $testimonialPopupData.role}
              <span class="mx-2 text-[#000A57]/30">•</span>
              <span>{$testimonialPopupData.role}</span>
            {/if}
          </p>
        {/if}
      </div>
    </div>

    <!-- Vídeo -->
    {#if $testimonialPopupData.videoSrc}
      {@const isPortrait = $testimonialPopupData.videoOrientation === "portrait"}

      <div class="mt-6">
        <div
          class={`relative w-auto overflow-hidden rounded-2xl bg-black/5 ring-1 ring-black/10 shadow-sm ${
            isPortrait ? "max-w-[300px] mx-auto" : ""
          }`}
        >
          <div class={isPortrait ? "aspect-[8/12]" : "aspect-video"}>
            <video
              bind:this={videoEl}
              class="h-full w-full object-cover object-top"
              controls
              playsinline
              autoplay
              preload="auto"
              poster={$testimonialPopupData.poster}
            >
              <source
                src={$testimonialPopupData.videoSrc}
                type={$testimonialPopupData.videoType ?? "video/mp4"}
              />
              <track kind="captions" />
              Seu navegador não suporta reprodução de vídeo.
            </video>

            <!-- Overlay “Ativar som” quando o autoplay com áudio for bloqueado -->
            {#if needsUserSound}
              <div class="absolute inset-0 flex items-end justify-center p-4 pointer-events-none">
                <button
                  type="button"
                  on:click={enableSoundNow}
                  class="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-[13px] font-semibold text-[#0B1020]
                         ring-1 ring-black/10 shadow-sm hover:bg-white transition"
                >
                  Ativar som
                  <span aria-hidden="true">🔊</span>
                </button>
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    <!-- Texto -->
    <div class="mt-6 text-[#000A57]/85">
      {#if ($testimonialPopupData.fullText ?? "").trim().length === 0}
        <p class="text-[14px] md:text-[15px] leading-relaxed text-[#000A57]/70">

        </p>
      {:else}
        {#each $testimonialPopupData.fullText.split("\n") as line}
          {#if line.trim().length}
            <p class="text-[14px] md:text-[15px] leading-relaxed">{line}</p>
          {:else}
            <div class="h-3"></div>
          {/if}
        {/each}
      {/if}
    </div>

    <!-- Footer -->
    <div class="mt-8 flex justify-end">
      <button
        on:click={closeModal}
        class="inline-flex items-center rounded-full bg-[#000A57] px-5 py-2.5 text-[13px] font-semibold text-white hover:opacity-90 transition"
      >
        Fechar
      </button>
    </div>
  </div>
{/if}
