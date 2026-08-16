<script lang="ts">
  type MentionUser = {
    id: string;
    name: string;
    email: string;
  };

  export let users: MentionUser[] = [];
  export let name = "body";
  export let rows = 4;
  export let maxlength = 5000;
  export let placeholder = "Escreva uma mensagem...";
  export let className = "";

  let textarea: HTMLTextAreaElement;
  let value = "";
  let query = "";
  let mentionStart = -1;
  let open = false;
  let selectedMentions: Array<{ id: string; token: string }> = [];

  function normalize(value: string): string {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function handleFor(user: MentionUser): string {
    const emailLocal = user.email.split("@")[0] ?? "";
    const base = emailLocal || user.name;
    const handle = normalize(base).replace(/[^a-z0-9._-]+/g, "").slice(0, 40);
    return handle || `user-${user.id.slice(0, 8)}`;
  }

  $: suggestions = query
    ? users
        .filter((user) => {
          const haystack = normalize(`${handleFor(user)} ${user.name} ${user.email}`);
          return haystack.includes(normalize(query));
        })
        .slice(0, 7)
    : users.slice(0, 7);

  $: activeMentionIds = selectedMentions
    .filter((mention) => value.includes(mention.token))
    .map((mention) => mention.id);

  function refreshMentionState(): void {
    const cursor = textarea?.selectionStart ?? value.length;
    const left = value.slice(0, cursor);
    const match = left.match(/(?:^|\s)@([a-zA-Z0-9._-]*)$/);

    if (!match) {
      open = false;
      query = "";
      mentionStart = -1;
      return;
    }

    query = match[1] ?? "";
    mentionStart = cursor - query.length - 1;
    open = true;
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

    open = false;
    query = "";
    mentionStart = -1;

    requestAnimationFrame(() => {
      const nextCursor = start + token.length + 1;
      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") open = false;
  }
</script>

<div class="relative">
  <textarea
    bind:this={textarea}
    bind:value
    {name}
    {rows}
    {maxlength}
    {placeholder}
    required
    class={className}
    on:input={refreshMentionState}
    on:click={refreshMentionState}
    on:keyup={refreshMentionState}
    on:keydown={handleKeydown}
  ></textarea>
  <input type="hidden" name="mentionedUserIds" value={JSON.stringify(activeMentionIds)} />

  {#if open && suggestions.length > 0}
    <div class="absolute left-0 right-0 z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border border-[#DDE1EA] bg-white p-1.5 shadow-xl shadow-slate-900/10">
      {#each suggestions as user (user.id)}
        <button
          type="button"
          class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-[#F6F7FB] focus:bg-[#F6F7FB] focus:outline-none"
          on:mousedown|preventDefault={() => selectUser(user)}
        >
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEF0FF] text-[10px] font-bold text-[#000A57]">
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <span class="min-w-0">
            <strong class="block truncate text-[11px] font-semibold text-[#2F3545]">{user.name}</strong>
            <small class="block truncate text-[9px] text-[#858B99]">@{handleFor(user)} · {user.email}</small>
          </span>
        </button>
      {/each}
    </div>
  {/if}
</div>
