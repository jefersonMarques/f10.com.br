<script lang="ts">
  import { Building2, ShieldCheck } from "lucide-svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;
</script>

<svelte:head>
  <title>Selecione o grupo | Área do Cliente F10</title>
  <meta
    name="description"
    content="Escolha o grupo F10 que será usado como filtro inicial da sua área de suporte."
  />
</svelte:head>

<main class="min-h-screen bg-[#F7F8FB] px-5 py-8 text-[#10172A] sm:py-14">
  <div class="mx-auto max-w-[760px]">
    <section class="overflow-hidden rounded-[28px] border border-[#E1E4EC] bg-white shadow-[0_18px_55px_rgba(1,13,40,0.07)]">
      <header class="bg-[#010D28] px-6 py-7 text-white sm:px-8">
        <span class="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-[#FF9A4B]"><ShieldCheck size={21} /></span>
        <p class="application-text-caption mt-5 font-bold uppercase tracking-[0.14em] text-[#FF9A4B]">Área do Cliente F10</p>
        <h1 class="mt-2 text-[28px] font-semibold tracking-[-0.04em] sm:text-[34px]">Qual grupo você quer visualizar primeiro?</h1>
        <p class="mt-3 text-[12px] leading-6 text-white/65">
          Sua conta possui acesso a mais de um grupo. Esta escolha define apenas o filtro inicial dos chamados e poderá ser alterada depois, sem novo login.
        </p>
      </header>

      <div class="px-6 py-7 sm:px-8">
        {#if form?.message}
          <div class="mb-5 rounded-2xl border border-[#F0D0C8] bg-[#FFF7F4] px-4 py-3 text-[11px] leading-5 text-[#8A493A]">{form.message}</div>
        {/if}

        <div class="grid gap-3 sm:grid-cols-2">
          {#each data.customer.groups as group}
            <form method="POST" action="?/selectGroup">
              <input type="hidden" name="groupId" value={group.grupo_id} />
              <input
                type="hidden"
                name="returnTo"
                value={form && "returnTo" in form ? form.returnTo ?? data.returnTo : data.returnTo}
              />
              <button
                type="submit"
                class="flex min-h-[112px] w-full items-start gap-4 rounded-2xl border border-[#E1E4EC] bg-white p-4 text-left transition hover:border-[#AEB7D4] hover:bg-[#FBFBFE] hover:shadow-[0_8px_24px_rgba(1,13,40,0.05)]"
              >
                <span class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><Building2 size={18} /></span>
                <span class="min-w-0">
                  <strong class="block text-[13px] font-semibold leading-5 text-[#202737]">{group.grupo}</strong>
                  <span class="application-text-meta mt-1.5 block text-[#8C93A2]">
                    {group.unidades.length} {group.unidades.length === 1 ? "escola disponível" : "escolas disponíveis"}
                  </span>
                </span>
              </button>
            </form>
          {/each}
        </div>

        <p class="application-text-meta mt-5 text-center leading-5 text-[#9298A5]">
          A seleção não limita suas permissões. Você continuará podendo consultar todos os grupos e escolas autorizados nos filtros da área de suporte.
        </p>
      </div>
    </section>
  </div>
</main>
