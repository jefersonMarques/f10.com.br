<script lang="ts">
  let name = "";
  let email = "";
  let whatsapp = "";
  let schoolName = "";

  function handleSubmit(e: Event) {
    e.preventDefault();
    console.log({ name, email, whatsapp, schoolName });
    // Aqui você pode enviar os dados para Supabase, RD Station ou outro endpoint.
  }
</script>

<form
  on:submit={handleSubmit}
  class="w-full flex flex-col gap-4 bg-white p-6 rounded-xl shadow-sm"
>
  <label class="flex flex-col text-sm text-gray-700 font-medium">
    Nome
    <input
      type="text"
      bind:value={name}
      required
      class="mt-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#F36C21] focus:outline-none"
      placeholder="Seu nome completo"
    />
  </label>

  <label class="flex flex-col text-sm text-gray-700 font-medium">
    E-mail
    <input
      type="email"
      bind:value={email}
      required
      class="mt-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#F36C21] focus:outline-none"
      placeholder="seuemail@exemplo.com"
    />
  </label>

  <label class="flex flex-col text-sm text-gray-700 font-medium">
    WhatsApp
    <input
      type="tel"
      bind:value={whatsapp}
      required
      class="mt-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#F36C21] focus:outline-none"
      placeholder="(00) 00000-0000"
    />
  </label>

  <label class="flex flex-col text-sm text-gray-700 font-medium">
    Nome da escola
    <input
      type="text"
      bind:value={schoolName}
      required
      class="mt-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#F36C21] focus:outline-none"
      placeholder="Nome da instituição"
    />
  </label>

  <button
    type="submit"
    class="bg-[#F36C21] text-white py-3 rounded-lg font-semibold hover:bg-[#d35b15] transition"
  >
    Enviar
  </button>
</form>
