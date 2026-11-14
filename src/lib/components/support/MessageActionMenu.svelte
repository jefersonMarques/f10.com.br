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

<div class="mt-2 flex min-w-0 items-center justify-between gap-2">
  <div class="flex flex-wrap items-center gap-1">
    {#each reactions.filter((reaction) => reaction.count > 0) as reaction (reaction.code)}
      <button type="button" disabled={busy} on:click={() => void chooseReaction(reaction.code)}
        aria-label={`${labelOf(reaction.code)}: ${reaction.count}`}
        aria-pressed={myReaction === reaction.code}
        title={labelOf(reaction.code)}
        class="inline-flex min-h-7 items-center gap-1 rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] px-2 text-[12px] text-[var(--app-text)] hover:border-[var(--app-primary)] disabled:opacity-50">
        <span aria-hidden="true">{emojiOf(reaction.code)}</span>
        <span class="font-semibold tabular-nums">{reaction.count}</span>
      </button>
    {/each}
    {#each taskLinks as task (task.id)}
      <a href={`/app/tasks/${task.id}`} title={task.title}
        class="inline-flex min-h-7 items-center gap-1 rounded-full bg-[var(--app-success-bg)] px-2 text-[11px] font-semibold text-[var(--app-success-text)] hover:underline">
        <ListTodo size={13}/>Tarefa gerada
      </a>
    {/each}
  </div>
  <details bind:open={menuOpen} class="relative shrink-0">
    <summary aria-label="Ações da mensagem" title="Ações da mensagem"
      class="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text-muted)] shadow-sm transition hover:text-[var(--app-primary)] focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
      <Ellipsis size={18}/>
    </summary>
    <div class="absolute bottom-9 right-0 z-30 min-w-[192px] rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-2 text-[var(--app-text)] shadow-xl">
      <span class="mb-2 block px-1 text-[12px] font-semibold text-[var(--app-text-muted)]">Reagir</span>
      <div class="flex items-center gap-1">
        {#each choices as choice (choice.code)}
          <button type="button" disabled={busy} aria-label={choice.label} aria-pressed={myReaction === choice.code}
            title={choice.label} on:click={() => void chooseReaction(choice.code)}
            class="flex h-9 w-9 items-center justify-center rounded-lg text-[18px] hover:bg-[var(--app-surface-muted)] disabled:opacity-50">
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
