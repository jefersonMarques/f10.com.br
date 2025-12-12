<script lang="ts">
  import IconArrowRight from "$lib/icons/IconArrowRight.svelte";
  import IconEmail from "$lib/icons/IconEmail.svelte";
  import IconPhone from "$lib/icons/IconPhone.svelte";
  import IconWhatsApp from "$lib/icons/IconWhatsApp.svelte";
  import SocialLinks from "./SocialLinks.svelte";

  const socialLinks = [
    {
      alt: "Facebook",
      src: "/social_facebook.svg",
      href: "https://www.facebook.com/F10Software",
    },
    {
      alt: "LinkedIn",
      src: "/social_linkedin.svg",
      href: "linkedin.com/company/f10software/",
    },
    {
      alt: "YouTube",
      src: "/social_youtube.svg",
      href: "https://www.youtube.com/@f10software76",
    },
    {
      alt: "Instagram",
      src: "/social_instagram.svg",
      href: "https://www.instagram.com/f10software/",
    },
  ];
</script>

<footer
  class="relative flex flex-col items-center py-16 gap-16 bg-white/20 overflow-hidden"
  style="font-family: 'Plus Jakarta Sans', sans-serif;"
>
  <!-- ===== BLOCO SUPERIOR: Newsletter ===== -->
  <div
    class="relative z-10 flex flex-col items-center gap-12 w-full max-w-[1300px] bg-[#000A57] lg:rounded-[24px] py-16 px-12"
  >
    <h2
      class="text-white text-[40px] font-semibold leading-[130%] tracking-[-0.03em] text-center"
    >
      Quer transformar a sua escola?
    </h2>

    <!-- Formulário -->
    <form
      class="flex flex-wrap justify-center items-center gap-6 w-full max-w-[1152px]"
      on:submit|preventDefault={() => {}}
    >
      <input
        type="text"
        placeholder="Nome"
        class="flex-1 min-w-[260px] max-w-[387px] h-[56px] px-6 rounded-[20px]
               bg-white/30 border border-white/50 text-white placeholder-white/70 font-semibold text-[16px]
               focus:outline-none focus:ring-2 focus:ring-white/60"
      />

      <input
        type="email"
        placeholder="E-mail"
        class="flex-1 min-w-[260px] max-w-[387px] h-[56px] px-6 rounded-[20px]
               bg-white/30 border border-white/50 text-white placeholder-white/70 font-semibold text-[16px]
               focus:outline-none focus:ring-2 focus:ring-white/60"
      />

      <button
        type="submit"
        class="flex justify-center items-center gap-3 h-[56px] px-8 bg-[#EA6D0B]
               text-white font-bold text-[16px] rounded-[70px] transition hover:bg-[#FF7F20]"
      >
        <span>Receber nossas novidades</span>
        <IconArrowRight size={24} />
      </button>
    </form>
  </div>

  <!-- Linha divisória -->
  <div class="relative z-10 w-full max-w-[1280px] h-[1px] bg-[#AEB3D9]"></div>

  <!-- ===== BLOCO INFERIOR ===== -->
  <div
    class="px-8 lg:px-0 relative z-10 grid grid-cols-1 md:grid-cols-[1.2fr_0.6fr_0.6fr_1fr] gap-12 w-full max-w-[1280px] text-[#000A57]"
  >
    <!-- Coluna 1 -->
    <div class="flex flex-col items-start gap-6">
      <img
        src="/logo_f10.svg"
        alt="F10 Software"
        class="h-[60px] w-auto object-contain"
      />
      <p
        class="font-bold text-[14px] leading-[24px] text-[#000A57] max-w-[420px]"
      >
        F10 Software – Soluções Digitais para Gestão Escolar<br />
        <span class="font-normal text-[#9B9B9C]">
          Transforme a administração da sua escola com tecnologia de ponta.
        </span>
      </p>
      <SocialLinks links={socialLinks} />
    </div>

    <!-- Coluna 2 -->
    <div class="flex flex-col gap-3">
      <h4 class="text-[18px] font-semibold">Acesso rápido</h4>
      <ul class="text-[#9B9B9C] text-[14px] leading-[24px]">
        <li><a href="/" class="hover:text-[#EA6D0B]">Início</a></li>
        <li><a href="/solucoes" class="hover:text-[#EA6D0B]">Soluções</a></li>
        <li>
          <a href="https://blog.f10.com.br" class="hover:text-[#EA6D0B]">Blog</a
          >
        </li>
        <li>
          <a href="https://ajuda.f10.com.br/kb" class="hover:text-[#EA6D0B]"
            >Central de Ajuda</a
          >
        </li>
        <li><a href="/contato" class="hover:text-[#EA6D0B]">Contato</a></li>
      </ul>
    </div>

    <!-- Coluna 3 -->
    <div class="flex flex-col gap-3">
      <h4 class="text-[18px] font-semibold">Outros links</h4>
      <ul class="text-[#9B9B9C] text-[14px] leading-[24px]">
        <li>
          <a href="/termos-de-uso" class="hover:text-[#EA6D0B]">Termos de uso</a>
        </li>
        <li>
          <a href="/politica-de-privacidade" class="hover:text-[#EA6D0B]"
            >Políticas de privacidade</a
          >
        </li>
      </ul>
    </div>

    <!-- Coluna 4 -->
    <div class="flex flex-col gap-3 text-[#9B9B9C] text-[14px]">
      <div class="flex items-center gap-2">
        <IconPhone size={19} />
        <span>(41) 99294-3443</span>
      </div>

      <div class="flex items-center gap-2">
        <IconEmail size={20} />
        <span>vendas@f10.com.br</span>
      </div>

      <div class="flex items-center gap-2">
        <IconWhatsApp size={20} />

        <a href="https://wa.me/5541992943443" class="hover:underline"
          ><span>Fale com o vendas</span></a
        >
      </div>
    </div>
  </div>
</footer>
