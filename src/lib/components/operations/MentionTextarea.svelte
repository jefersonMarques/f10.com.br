<script lang="ts">
  import { browser } from "$app/environment";
  import { onDestroy, tick } from "svelte";

  type MentionUser = {
    id: string;
    name: string;
    email: string;
  };

  export let users: MentionUser[] = [];
  export let name = "body";
  export let rows = 4;
  export let required = true;
  export let maxlength = 5000;
  export let placeholder = "Escreva uma mensagem...";
  export let className = "";
  export let autoGrow = false;
  export let suggestionsAbove = false;
  export let value = "";

  let textarea: HTMLTextAreaElement;
  let suggestionsPopover: HTMLDivElement;
  let query = "";
  let mentionStart = -1;
  let open = false;
  let selectedIndex = 0;
  let selectedMentions: Array<{ id: string; token: string }> = [];

  function normalize(value: string): string {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function handleFor(user: MentionUser): string {
    const emailLocal = user.email.split("@")[0] ?? "";
    const base = emailLocal || user.name;
    const handle = normalize(base).replace(/[^a-z0-9._-]+/g, "").slice(0, 40);
    return handle || `user-${user.id.slice(0, 8)}`;
  }

  $: suggestions = (query
    ? users.filter((user) => {
        const haystack = normalize(`${handleFor(user)} ${user.name} ${user.email}`);
        return haystack.includes(normalize(query));
      })
    : users
  ).slice(0, 7);

  $: activeMentionIds = selectedMentions
    .filter((mention) => value.includes(mention.token))
    .map((mention) => mention.id);

  $: if (browser && textarea && suggestionsPopover) {
    if (open && suggestions.length > 0) {
      void showSuggestions(query, suggestionsAbove);
    } else {
      hideSuggestions();
    }
  }

  function resizeTextarea(): void {
    if (!autoGrow || !textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 144)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 144 ? "auto" : "hidden";
  }

  function handleInput(): void {
    refreshMentionState();
    resizeTextarea();
  }

  function refreshMentionState(): void {
    const cursor = textarea?.selectionStart ?? value.length;
    const left = value.slice(0, cursor);
    const match = left.match(/(?:^|\s)@([a-zA-Z0-9._-]*)$/);

    if (!match) {
      closeSuggestions();
      return;
    }

    const nextQuery = match[1] ?? "";
    if (query !== nextQuery) selectedIndex = 0;
    query = nextQuery;
    mentionStart = cursor - query.length - 1;
    open = true;
  }

  function closeSuggestions(): void {
    open = false;
    query = "";
    mentionStart = -1;
    hideSuggestions();
  }

  function hideSuggestions(): void {
    if (suggestionsPopover?.matches(":popover-open")) {
      suggestionsPopover.hidePopover();
    }
    if (!browser) return;
    window.removeEventListener("scroll", positionSuggestions, true);
    window.removeEventListener("resize", positionSuggestions);
    window.removeEventListener("pointerdown", handleOutsidePointerDown, true);
  }

  function positionSuggestions(): void {
    if (!textarea || !suggestionsPopover?.matches(":popover-open")) return;

    const anchor = textarea.getBoundingClientRect();
    const width = Math.min(Math.max(anchor.width, 220), window.innerWidth - 16);
    const left = Math.max(8, Math.min(anchor.left, window.innerWidth - width - 8));
    const availableAbove = Math.max(0, anchor.top - 16);
    const availableBelow = Math.max(0, window.innerHeight - anchor.bottom - 16);
    const placeAbove = suggestionsAbove
      ? availableAbove >= 100 || availableAbove > availableBelow
      : availableBelow < 170 && availableAbove > availableBelow;
    const availableHeight = placeAbove ? availableAbove : availableBelow;
    const maxHeight = Math.max(60, Math.min(240, availableHeight));

    suggestionsPopover.style.width = `${width}px`;
    suggestionsPopover.style.maxHeight = `${maxHeight}px`;

    const height = suggestionsPopover.getBoundingClientRect().height;
    const top = placeAbove
      ? Math.max(8, anchor.top - height - 8)
      : Math.min(anchor.bottom + 8, window.innerHeight - height - 8);

    suggestionsPopover.style.left = `${Math.round(left)}px`;
    suggestionsPopover.style.top = `${Math.round(Math.max(8, top))}px`;
  }

  async function showSuggestions(_query: string, _preferAbove: boolean): Promise<void> {
    await tick();
    if (!open || !suggestions.length || !textarea || !suggestionsPopover) return;

    if (!suggestionsPopover.matches(":popover-open")) {
      suggestionsPopover.showPopover();
      window.addEventListener("scroll", positionSuggestions, true);
      window.addEventListener("resize", positionSuggestions);
      window.addEventListener("pointerdown", handleOutsidePointerDown, true);
    }
    positionSuggestions();
  }

  function handleOutsidePointerDown(event: PointerEvent): void {
    const target = event.target as Node | null;
    if (target && !textarea.contains(target) && !suggestionsPopover.contains(target)) {
      closeSuggestions();
    }
  }

  function selectUser(user: MentionUser): void {
    if (mentionStart < 0) return;

    const start = mentionStart;
    const cursor = textarea.selectionStart ?? value.length;
    const token = `@${handleFor(user)}`;
    value = `${value.slice(0, start)}${token} ${value.slice(cursor)}`;

    if (!selectedMentions.some((mention) => mention.id === user.id && mention.token === token)) {
      selectedMentions = [...selectedMentions, { id: user.id, token }];
    }

    closeSuggestions();

    requestAnimationFrame(() => {
      const nextCursor = start + token.length + 1;
      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
      resizeTextarea();
    });
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      closeSuggestions();
      return;
    }

    if (!open || suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      selectedIndex = (selectedIndex + 1) % suggestions.length;
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      selectedIndex = (selectedIndex - 1 + suggestions.length) % suggestions.length;
    } else if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      selectUser(suggestions[selectedIndex] ?? suggestions[0]);
    }
  }

  function handleKeyup(event: KeyboardEvent): void {
    if (["Escape", "Enter", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    refreshMentionState();
  }

  onDestroy(() => hideSuggestions());
</script>

<div class="relative">
  <textarea
    bind:this={textarea}
    bind:value
    {name}
    {rows}
    {maxlength}
    {placeholder}
    {required}
    class={className}
    on:input={handleInput}
    on:click={refreshMentionState}
    on:focus={resizeTextarea}
    on:keyup={handleKeyup}
    on:keydown={handleKeydown}
  ></textarea>
  <input type="hidden" name="mentionedUserIds" value={JSON.stringify(activeMentionIds)}/>
</div>

<div
  bind:this={suggestionsPopover}
  popover="manual"
  role="listbox"
  aria-label="Selecionar pessoa para mencionar"
  class="fixed left-0 top-0 z-[99999] m-0 overflow-y-auto overscroll-contain rounded-xl border border-[#D6DDEA] bg-white p-1.5 text-[#25304A] shadow-[0_16px_48px_rgba(1,13,40,0.22)]"
  style="inset: auto; margin: 0; background-color: #ffffff; color: #25304a;"
>
  {#each suggestions as user, index (user.id)}
    <button
      type="button"
      role="option"
      aria-selected={selectedIndex === index}
      class={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-[#F0F3FA] focus:bg-[#F0F3FA] focus:outline-none ${selectedIndex === index ? "bg-[#F0F3FA]" : ""}`}
      on:pointerdown|preventDefault={() => selectUser(user)}
    >
      <span class="application-text-caption flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEF0FF] font-bold text-[#000A57]">
        {user.name.slice(0, 1).toUpperCase()}
      </span>
      <span class="min-w-0">
        <strong class="application-text-caption block truncate font-semibold text-[#2F3545]">{user.name}</strong>
        <small class="application-text-meta block truncate text-[#858B99]">@{handleFor(user)} · {user.email}</small>
      </span>
    </button>
  {/each}
</div>
