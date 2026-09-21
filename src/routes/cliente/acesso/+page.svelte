<script lang="ts">
  import { CircleAlert } from "lucide-svelte";
</script>

<svelte:head><title>Link de acesso | F10 Software</title></svelte:head>

<main class="flex min-h-screen items-center justify-center bg-[#F7F8FB] px-5 py-10 text-[#10172A]">
  <section class="w-full max-w-[520px] rounded-[26px] border border-[#E1E4EC] bg-white p-7 text-center shadow-[0_18px_55px_rgba(1,13,40,0.07)] sm:p-9">
    <span class="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF1ED] text-[#A84D39]"><CircleAlert size={22} /></span>
    <h1 class="mt-5 text-[23px] font-semibold tracking-[-0.03em] text-[#010D28]">Link inválido ou expirado</h1>
    <p class="mt-3 text-[11px] leading-5 text-[#777E8D]">Os links da área do cliente são de uso único e expiram em 15 minutos. Solicite um novo acesso usando seu e-mail cadastrado.</p>
    <a href="/cliente" class="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#000A57] px-5 text-[11px] font-semibold text-white">Solicitar novo link</a>
  </section>
</main>
