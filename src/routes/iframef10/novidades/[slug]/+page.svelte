<script lang="ts">
  import IframeF10PublishedContent from "$lib/components/iframef10/IframeF10PublishedContent.svelte";
  import type { PageData } from "./$types";
  export let data: PageData;
</script>

<svelte:head><title>{data.content.title} | Atualizações F10</title></svelte:head>
<IframeF10PublishedContent content={data.content} backHref="/iframef10/novidades" eyebrow="Atualização F10"/>
