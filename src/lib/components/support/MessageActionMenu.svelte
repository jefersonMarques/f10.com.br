<script lang="ts">
  import { onDestroy } from "svelte";
  import { Ellipsis, ListTodo } from "lucide-svelte";

  type MessageReactionCode = "like" | "heart" | "check" | "eyes";
  type ReactionCount = { code: MessageReactionCode; count: number };

  export let reactions: ReactionCount[] = [];
  export let myReaction: MessageReactionCode | null = null;
  export let onReact: (code: MessageReactionCode) => void | Promise<void>;
  export let canCreateTask = false;
  export let onCreateTask: () => void = () => undefined;
  export let taskLinks: Array<{ id: string; title: string }> = [];

  let triggerButton: HTMLButtonElement;
  let reactionPopover: HTMLDivElement;
  let busy = false;
  let menuOpen = false;

  const choices: Array<{ code: MessageReactionCode; emoji: string; label: string }> = [
    { code: "like", emoji: "👍", label: "Aprovado" },
    { code: "heart", emoji: "❤️", label: "Agradecimento" },
    { code: "check", emoji: "✅", label: "Resolvido" },
    { code: "eyes", emoji: "👀", label: "Verificando" },
  ];

  function labelOf(code: MessageReactionCode): string {
    return choices.find((item) => item.code === code)?.label ?? code;
  }

  function emojiOf(code: MessageReactionCode): string {
    return choices.find((item) => item.code === code)?.emoji ?? "";
  }

  function dismissMenu(): void {
    closeMenu();
  }

  function removeMenuListeners(): void {
    window.removeEventListener("scroll", dismissMenu, true);
    window.removeEventListener("resize", dismissMenu);
  }

  function closeMenu(): void {
    removeMenuListeners();
    if (reactionPopover?.matches(":popover-open")) {
      reactionPopover.hidePopover();
    }
    menuOpen = false;
  }

  function toggleMenu(): void {
    if (!triggerButton || !reactionPopover) return;
    if (reactionPopover.matches(":popover-open")) {
      closeMenu();
      return;
    }

    reactionPopover.style.visibility = "hidden";
    reactionPopover.showPopover();

    const triggerBounds = triggerButton.getBoundingClientRect();
    const popoverBounds = reactionPopover.getBoundingClientRect();
    const availableWidth = window.innerWidth - popoverBounds.width - 8;
    const left = Math.max(8, Math.min(triggerBounds.right - popoverBounds.width, availableWidth));
    const above = triggerBounds.top - popoverBounds.height - 8;
    const below = triggerBounds.bottom + 8;
    const availableHeight = window.innerHeight - popoverBounds.height - 8;
    const top = above >= 8 ? above : Math.max(8, Math.min(below, availableHeight));

    reactionPopover.style.left = `${Math.round(left)}px`;
    reactionPopover.style.top = `${Math.round(top)}px`;
    reactionPopover.style.visibility = "visible";
    menuOpen = true;
    window.addEventListener("scroll", dismissMenu, true);
    window.addEventListener("resize", dismissMenu);
  }

  async function chooseReaction(code: MessageReactionCode): Promise<void> {
    if (busy) return;
    busy = true;
    try {
      await onReact(code);
      closeMenu();
    } finally {
      busy = false;
    }
  }

  function handlePopoverToggle(): void {
    menuOpen = reactionPopover?.matches(":popover-open") ?? false;
    if (!menuOpen) removeMenuListeners();
  }

  onDestroy(() => closeMenu());
</script>

<div class="pointer-events-none absolute -top-3 right-1.5 z-30 flex max-w-full items-start gap-1">
  {#if reactions.some((item) => item.count > 0)}
    <div class="pointer-events-auto flex items-center gap-0.5 rounded-full border border-[#D8DDE6] bg-white px-1 py-0.5 shadow-sm">
      {#each reactions.filter((item) => item.count > 0) as reaction (reaction.code)}
        <button type="button" disabled={busy} on:click={() => void chooseReaction(reaction.code)}
          aria-label={`${labelOf(reaction.code)}: ${reaction.count}`}
          aria-pressed={myReaction === reaction.code}
          title={labelOf(reaction.code)}
          class="inline-flex h-6 items-center gap-0.5 rounded-full px-1 text-[11px] text-[#192237] hover:bg-[#F1F3F8] disabled:opacity-50">
          <span aria-hidden="true">{emojiOf(reaction.code)}</span>
          <span class="font-semibold tabular-nums">{reaction.count}</span>
        </button>
      {/each}
    </div>
  {/if}

  <button bind:this={triggerButton} type="button" on:click={toggleMenu}
    aria-label="Ações da mensagem" aria-haspopup="true" aria-expanded={menuOpen}
    title="Ações da mensagem"
    class="pointer-events-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#D8DDE6] bg-white text-[#485163] shadow-sm transition hover:text-[#000A57] focus-visible:ring-2 focus-visible:ring-[#000A57] md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
    <Ellipsis size={15}/>
  </button>
</div>

<div bind:this={reactionPopover} popover="auto" on:toggle={handlePopoverToggle}
  aria-label="Reações da mensagem"
  class="fixed left-0 top-0 z-[99999] m-0 min-w-[190px] rounded-2xl border border-[#D8DDE6] bg-white p-2 text-[#192237] shadow-[0_16px_48px_rgba(1,13,40,0.24)]"
  style="inset: auto; margin: 0; background-color: #ffffff; color: #192237;">
  <span class="mb-2 block px-1 text-[12px] font-semibold text-[#626B7A]">Reagir</span>
  <div class="flex items-center gap-1">
    {#each choices as choice (choice.code)}
      <button type="button" disabled={busy} aria-label={choice.label}
        aria-pressed={myReaction === choice.code} title={choice.label}
        on:click={() => void chooseReaction(choice.code)}
        class="flex h-10 w-10 items-center justify-center rounded-lg text-[20px] hover:bg-[#F1F3F8] disabled:opacity-50">
        {choice.emoji}
      </button>
    {/each}
  </div>
  {#if canCreateTask}
    <button type="button" on:click={() => { closeMenu(); onCreateTask(); }}
      class="mt-2 flex min-h-10 w-full items-center gap-2 border-t border-[#E6E9EF] px-2 pt-2 text-left text-[13px] font-semibold text-[#192237] hover:text-[#000A57]">
      <ListTodo size={16}/>Gerar tarefa
    </button>
  {/if}
</div>

{#if taskLinks.length > 0}
  <div class="pointer-events-auto absolute -bottom-3 right-2 z-10 flex flex-wrap justify-end gap-1">
    {#each taskLinks as task (task.id)}
      <a href={`/app/tasks/${task.id}`} title={task.title}
        class="inline-flex min-h-6 items-center gap-1 rounded-full border border-[#D8DDE6] bg-[#EAF6EC] px-2 text-[11px] font-semibold text-[#236C3B] shadow-sm hover:underline">
        <ListTodo size={12}/>Tarefa gerada
      </a>
    {/each}
  </div>
{/if}
