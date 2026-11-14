<script lang="ts">
  import { Ellipsis, ListTodo } from "lucide-svelte";
  type MessageReactionCode = "like" | "heart" | "check" | "eyes";

  type ReactionCount = { code: MessageReactionCode; count: number };

  export let reactions: ReactionCount[] = [];
  export let myReaction: MessageReactionCode | null = null;
  export let onReact: (code: MessageReactionCode) => void | Promise<void>;
  export let canCreateTask = false;
  export let onCreateTask: () => void = () => undefined;
  export let taskLinks: Array<{ id: string; title: string }> = [];

  let busy = false;
  let menuOpen = false;

  const choices: Array<{ code: MessageReactionCode; emoji: string; label: string }> = [
    { code: "like", emoji: "👍", label: "Aprovado" },
    { code: "heart", emoji: "❤️", label: "Agradecimento" },
    { code: "check", emoji: "✅", label: "Resolvido" },
    { code: "eyes", emoji: "👀", label: "Verificando" },
  ];

  async function chooseReaction(code: MessageReactionCode): Promise<void> {
    if (busy) return;
    busy = true;
    try {
      await onReact(code);
      menuOpen = false;
    } finally {
      busy = false;
    }
  }

  function labelOf(code: MessageReactionCode): string {
    return choices.find((option) => option.code === code)?.label ?? code;
  }

  function emojiOf(code: MessageReactionCode): string {
    return choices.find((option) => option.code === code)?.emoji ?? "";
  }
</script>

<div class="pointer-events-none absolute -top-3 right-1.5 z-30 flex max-w-full items-start gap-1">
  {#if reactions.some((item) => item.count > 0)}
    <div class="pointer-events-auto flex items-center gap-0.5 rounded-full border border-[var(--app-border)] bg-white px-1 py-0.5 shadow-sm">
      {#each reactions.filter((item) => item.count > 0) as reaction (reaction.code)}
        <button type="button" disabled={busy} on:click={() => void chooseReaction(reaction.code)}
          aria-label={`${labelOf(reaction.code)}: ${reaction.count}`}
          aria-pressed={myReaction === reaction.code}
          title={labelOf(reaction.code)}
          class="inline-flex h-6 items-center gap-0.5 rounded-full px-1 text-[11px] text-[var(--app-text)] hover:bg-[var(--app-surface-muted)] disabled:opacity-50">
          <span aria-hidden="true">{emojiOf(reaction.code)}</span>
          <span class="font-semibold tabular-nums">{reaction.count}</span>
        </button>
      {/each}
    </div>
  {/if}

  <details bind:open={menuOpen} class="pointer-events-auto relative shrink-0">
    <summary aria-label="Ações da mensagem" title="Ações da mensagem"
      class="flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded-full border border-[var(--app-border)] bg-white text-[#485163] shadow-sm transition hover:text-[#000A57] focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
      <Ellipsis size={15}/>
    </summary>

    <div class="absolute bottom-9 right-0 z-[70] min-w-[188px] rounded-xl border border-[#D9DEE8] bg-white p-2 text-[#192237] shadow-[0_14px_44px_rgba(1,13,40,0.22)]" style="background-color: #ffffff; color: #192237;">
      <span class="mb-2 block px-1 text-[12px] font-semibold text-[var(--app-text-muted)]">Reagir</span>
      <div class="flex items-center gap-1">
        {#each choices as choice (choice.code)}
          <button type="button" disabled={busy} aria-label={choice.label}
            aria-pressed={myReaction === choice.code} title={choice.label}
            on:click={() => void chooseReaction(choice.code)}
            class="flex h-9 w-9 items-center justify-center rounded-lg text-[18px] hover:bg-[#F2F4F9] disabled:opacity-50">
            {choice.emoji}
          </button>
        {/each}
      </div>
      {#if canCreateTask}
        <button type="button" on:click={() => { menuOpen = false; onCreateTask(); }}
          class="mt-2 flex min-h-10 w-full items-center gap-2 border-t border-[var(--app-border)] px-2 pt-2 text-left text-[13px] font-semibold hover:text-[var(--app-primary)]">
          <ListTodo size={16}/>Gerar tarefa
        </button>
      {/if}
    </div>
  </details>
</div>

{#if taskLinks.length > 0}
  <div class="pointer-events-auto absolute -bottom-3 right-2 z-10 flex flex-wrap justify-end gap-1">
    {#each taskLinks as task (task.id)}
      <a href={`/app/tasks/${task.id}`} title={task.title}
        class="inline-flex min-h-6 items-center gap-1 rounded-full border border-[var(--app-border)] bg-[var(--app-success-bg)] px-2 text-[11px] font-semibold text-[var(--app-success-text)] shadow-sm hover:underline">
        <ListTodo size={12}/>Tarefa gerada
      </a>
    {/each}
  </div>
{/if}
