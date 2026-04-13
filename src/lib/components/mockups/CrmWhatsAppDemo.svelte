<script lang="ts">
  import {
    MessageCircleMore,
    CalendarDays,
    Phone,
    Check,
    SquarePen,
  } from "lucide-svelte";
</script>

<!-- MOCKUP DO WHATSAPP INTEGRADO AO CRM -->
<div class="flex justify-center">
  <div class="relative w-full max-w-[690px]">
    <!-- Fundo cinza rotacionado (efeito de profundidade) -->
    <div
      class="pointer-events-none absolute inset-0 rounded-[32px] bg-[#F3F4F6]/50 rotate-[10deg]"
      aria-hidden="true"
    ></div>

    <figure
      class="relative mx-auto rounded-[24px] overflow-hidden bg-[#020617] ring-1 ring-black/5"
    >
      <!-- Ruído sutil de fundo -->
      <div
        class="pointer-events-none absolute inset-0 opacity-[0.10] mix-blend-overlay bg-[url('/noise.svg')] bg-repeat [background-size:250px_250px]"
        aria-hidden="true"
      ></div>

      <div class="relative flex flex-col">
        <!-- Tela do sistema -->
        <div class="relative bg-white">
          <div class="overflow-hidden rounded-[24px] bg-white">
            <div class="grid min-h-[460px] bg-[#EFF4F2]">
              <!-- Layout dividido: Histórico | Chat WhatsApp -->
              <div
                class="grid min-h-[460px] grid-cols-1 lg:grid-cols-[1fr_0.92fr]"
              >
                <!-- Coluna esquerda: Histórico -->
                <div
                  class="border-b border-[#D6DEDA] bg-[#EEF2F0] p-4 lg:border-b-0 lg:border-r"
                >
                  <div class="mb-4">
                    <h3 class="text-[18px] font-medium text-[#404846]">
                      Histórico
                    </h3>
                  </div>
                  <div class="relative">
                    <div
                      class="absolute left-[15px] top-2 bottom-2 w-px bg-[#AEB9B4]"
                    ></div>
                    <div class="space-y-3">
                      <!-- Mensagem 1 -->
                      <div class="grid grid-cols-[30px_minmax(0,1fr)] gap-3">
                        <div
                          class="relative flex items-start justify-center pt-3"
                        >
                          <div
                            class="z-10 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#E5EBE8]"
                          >
                            <MessageCircleMore
                              class="h-3.5 w-3.5 text-[#69736F]"
                            />
                          </div>
                        </div>
                        <div
                          class="rounded-[8px] border border-[#CCD6D1] bg-[#F8FAF9] px-4 py-3"
                        >
                          <div class="flex items-center gap-2">
                            <span
                              class="text-[13px] font-semibold text-[#2E3432]"
                              >Rafa SDR</span
                            >
                            <span class="text-[11px] text-[#6F7975]"
                              >02/04/26 às 10:08</span
                            >
                          </div>
                          <p class="mt-1 text-[13px] text-[#49504D]">
                            Iniciou a conversa com o lead pelo novo número de
                            WhatsApp.
                          </p>
                        </div>
                      </div>

                      <!-- Mensagem 2 -->
                      <div class="grid grid-cols-[30px_minmax(0,1fr)] gap-3">
                        <div
                          class="relative flex items-start justify-center pt-3"
                        >
                          <div
                            class="z-10 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#E5EBE8]"
                          >
                            <MessageCircleMore
                              class="h-3.5 w-3.5 text-[#69736F]"
                            />
                          </div>
                        </div>
                        <div
                          class="rounded-[8px] border border-[#CCD6D1] bg-[#F8FAF9] px-4 py-3"
                        >
                          <div class="flex items-center gap-2">
                            <span
                              class="text-[13px] font-semibold text-[#2E3432]"
                              >Rafa SDR</span
                            >
                            <span class="text-[11px] text-[#6F7975]"
                              >02/04/26 às 10:11</span
                            >
                          </div>
                          <p class="mt-1 text-[13px] text-[#49504D]">
                            Lead respondeu e confirmou continuidade do
                            atendimento.
                          </p>
                        </div>
                      </div>

                      <!-- Agendamento -->
                      <div class="grid grid-cols-[30px_minmax(0,1fr)] gap-3">
                        <div
                          class="relative flex items-start justify-center pt-3"
                        >
                          <div
                            class="z-10 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#E5EEF8]"
                          >
                            <CalendarDays class="h-3.5 w-3.5 text-[#357EE8]" />
                          </div>
                        </div>
                        <div
                          class="rounded-[8px] border border-[#CCD6D1] bg-[#F8FAF9] px-4 py-3"
                        >
                          <div class="flex items-center gap-2">
                            <span
                              class="text-[13px] font-semibold text-[#2E3432]"
                              >Rafa SDR</span
                            >
                            <span class="text-[11px] text-[#6F7975]"
                              >02/04/26 às 10:11</span
                            >
                          </div>
                          <p class="mt-1 text-[13px] text-[#49504D]">
                            Agendou visita para segunda-feira após confirmação
                            do lead.
                          </p>
                        </div>
                      </div>

                      <!-- Ligação -->
                      <div class="grid grid-cols-[30px_minmax(0,1fr)] gap-3">
                        <div
                          class="relative flex items-start justify-center pt-3"
                        >
                          <div
                            class="z-10 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#DDF0DF]"
                          >
                            <Phone class="h-3.5 w-3.5 text-[#4AA85F]" />
                          </div>
                        </div>
                        <div
                          class="rounded-[8px] border border-[#CCD6D1] bg-[#F8FAF9] px-4 py-3"
                        >
                          <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0">
                              <div class="flex items-center gap-2">
                                <span
                                  class="text-[13px] font-semibold text-[#2E3432]"
                                  >Ligação via WhatsApp</span
                                >
                                <span class="text-[11px] text-[#6F7975]"
                                  >02/04/26 às 10:18</span
                                >
                              </div>
                              <p class="mt-1 text-[13px] text-[#49504D]">
                                Atendimento concluído com sucesso no mesmo fluxo
                                da conversa.
                              </p>
                            </div>
                            <div
                              class="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#58B368]"
                            >
                              <Check class="h-3 w-3 text-white" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- Observação do sistema -->
                      <div class="grid grid-cols-[30px_minmax(0,1fr)] gap-3">
                        <div
                          class="relative flex items-start justify-center pt-3"
                        >
                          <div
                            class="z-10 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#F4E8B8]"
                          >
                            <SquarePen class="h-3.5 w-3.5 text-[#8C7742]" />
                          </div>
                        </div>
                        <div
                          class="rounded-[8px] border border-[#E5D9A7] bg-[#FFF9DE] px-4 py-3"
                        >
                          <div class="flex items-center gap-2">
                            <span
                              class="text-[13px] font-semibold text-[#6A5B1F]"
                              >Observação do sistema</span
                            >
                            <span class="text-[11px] text-[#8B7A38]"
                              >02/04/26 às 13:00</span
                            >
                          </div>
                          <p class="mt-1 text-[13px] text-[#6A5B1F]">
                            Conversa continuada em novo número.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Coluna direita: Chat WhatsApp -->
                <div
                  class="relative min-h-[560px] overflow-hidden"
                  style="background-color: #E8DDD2;"
                >
                  <div
                    class="pointer-events-none absolute inset-0"
                    style="background-image: url('/patern_whatsapp.png'); background-size: 400px; background-repeat: repeat; opacity: 0.15;"
                  ></div>

                  <div class="relative z-10 flex min-h-[560px] flex-col">
                    <!-- Mensagens do chat -->
                    <div class="flex-1 space-y-2.5 p-4 pb-3">
                      <div
                        class="mx-6 rounded-[12px] bg-amber-300/50 px-2 py-1 shadow-[0_4px_10px_rgba(0,0,0,0.05)]"
                      >
                        <p
                          class="text-center text-[10px] leading-[1.4] text-amber-700"
                        >
                          Nova conversa
                        </p>
                      </div>

                      <!-- Mensagem enviada -->
                      <div class="flex justify-end">
                        <div
                          class="ml-8 w-full rounded-[12px] rounded-tr-[5px] bg-[#5CE4A5] px-3 py-2.5 shadow-[0_4px_10px_rgba(0,0,0,0.05)]"
                        >
                          <p class="text-[12px] leading-[1.4] text-[#163F31]">
                            Olá Marcelo, como vai?
                          </p>
                          <p
                            class="mt-1.5 text-[12px] leading-[1.4] text-[#163F31]"
                          >
                            Aqui é Rafael do Minha Escola.
                          </p>
                          <p
                            class="mt-1.5 text-[12px] leading-[1.4] text-[#163F31]"
                          >
                            Vamos continuar por aqui para organizar melhor seu
                            atendimento.
                          </p>
                          <p
                            class="mt-1.5 text-right text-[10px] text-[#163F31]/80"
                          >
                            Sexta-feira 16:08
                          </p>
                        </div>
                      </div>

                      <!-- Mensagem recebida -->
                      <div class="flex justify-start">
                        <div
                          class="mr-8 w-full rounded-[12px] rounded-tl-[5px] bg-white px-3 py-2.5 shadow-[0_4px_10px_rgba(0,0,0,0.05)]"
                        >
                          <p class="text-[12px] leading-[1.4] text-[#404447]">
                            Olá Rafael, tudo bem?<br /><br />Estou interessado
                            em conhecer a escola.
                          </p>
                          <p
                            class="mt-1 text-right text-[10px] text-[#163F31]/80"
                          >
                            Sexta-feira 16:11
                          </p>
                        </div>
                      </div>

                      <!-- Mais mensagens... -->
                      <div class="flex justify-end">
                        <div
                          class="ml-8 w-full rounded-[12px] rounded-tr-[5px] bg-[#5CE4A5] px-3 py-2.5 shadow-[0_4px_10px_rgba(0,0,0,0.05)]"
                        >
                          <p class="text-[12px] leading-[1.4] text-[#163F31]">
                            Podemos agendar sua visita para essa segunda-feira?
                          </p>
                          <p
                            class="mt-1 text-right text-[10px] text-[#163F31]/80"
                          >
                            Sexta-feira 16:11
                          </p>
                        </div>
                      </div>

                      <div class="flex justify-start">
                        <div
                          class="mr-8 w-full rounded-[12px] rounded-tl-[5px] bg-white px-3 py-2.5 shadow-[0_4px_10px_rgba(0,0,0,0.05)]"
                        >
                          <p class="text-[12px] leading-[1.4] text-[#404447]">
                            Claro, pode agendar.
                          </p>
                          <p
                            class="mt-1 text-right text-[10px] text-[#163F31]/80"
                          >
                            Sexta-feira 16:11
                          </p>
                        </div>
                      </div>

                      <div class="flex justify-end pt-2">
                        <div
                          class="ml-8 w-full rounded-[12px] rounded-tr-[5px] bg-[#5CE4A5] px-3 py-2.5 shadow-[0_4px_10px_rgba(0,0,0,0.05)]"
                        >
                          <p class="text-[12px] leading-[1.4] text-[#163F31]">
                            Sua visita foi agendada para segunda-feira às 9h. Te
                            espero lá.
                          </p>
                          <p
                            class="mt-1 text-right text-[10px] text-[#163F31]/80"
                          >
                            Sábado 16:18
                          </p>
                        </div>
                      </div>
                    </div>

                    <!-- Caixa de digitação -->
                    <div class="relative z-10 p-4 pt-2">
                      <div
                        class="flex items-center min-h-[50px] gap-3 text-[12px] text-[#9CA3AF] rounded-[12px] bg-[#F6F2EF]/80 px-3 py-1 shadow-[0_4px_10px_rgba(0,0,0,0.06)]"
                      >
                        Digite uma mensagem...
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </figure>
  </div>
</div>
