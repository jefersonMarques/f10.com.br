<script lang="ts">
  import { showForm } from "$lib/stores/formPopup";
  import { onDestroy, onMount } from "svelte";
  import SchoolForm from "$lib/components/forms/SchoolForm.svelte";

  let isOpen = false;
  const unsubscribe = showForm.subscribe((v) => (isOpen = v));
  onDestroy(unsubscribe);

  function closeModal() {
    showForm.set(false);
  }

  let modalEl: HTMLDivElement;

  // ===== Cria o portal manualmente =====
  onMount(() => {
    if (modalEl && modalEl.parentNode !== document.body) {
      document.body.appendChild(modalEl);
    }
  });
</script>

{#if isOpen}
  <div
    bind:this={modalEl}
    class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]"
  >
    <div class="bg-white rounded-2xl max-w-5xl w-[90%] overflow-hidden shadow-2xl animate-fadeIn">
      <div class="flex items-center justify-between border-b px-8 py-5">
        <h2 class="text-[#010D28] font-semibold text-lg">Quero uma demonstração</h2>
        <button on:click={closeModal} class="text-gray-400 hover:text-gray-600 text-2xl">×</button>
      </div>

      <div class="grid md:grid-cols-2 gap-8 p-8">
        <div>
          <h3 class="text-2xl md:text-3xl font-semibold text-[#F36C21] mb-4 leading-snug">
            Transforme a rotina da sua escola com tecnologia inteligente
          </h3>

          <img src="/form_img.webp" alt="Equipe" class="rounded-xl w-full mb-6 shadow-md" />

          <p class="text-[#5A5E75] leading-relaxed text-[15px]">
            Conheça todos os módulos da F10 na prática, com a orientação de um dos nossos especialistas.
            Sem compromisso, direto ao ponto e personalizado para a sua realidade.
          </p>
        </div>

        <div class="rounded-xl flex items-center justify-center">
          <SchoolForm />
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.96);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .animate-fadeIn {
    animation: fadeIn 0.25s ease-out;
  }
</style>
