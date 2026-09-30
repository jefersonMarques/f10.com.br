<script lang="ts">
  type Token = {
    type: "text" | "strong" | "emphasis" | "link";
    value: string;
    href?: string;
  };

  export let tokens: Token[] = [];
</script>

{#each tokens as token}
  {#if token.type === "strong"}
    <strong class="font-semibold text-current">{token.value}</strong>
  {:else if token.type === "emphasis"}
    <em>{token.value}</em>
  {:else if token.type === "link"}
    <a
      href={token.href}
      target={token.href?.startsWith("/") ? undefined : "_blank"}
      rel={token.href?.startsWith("/") ? undefined : "noreferrer"}
      class="font-semibold text-[#000A57] underline decoration-[#C9CFF3] underline-offset-2"
    >{token.value}</a>
  {:else}
    {token.value}
  {/if}
{/each}
