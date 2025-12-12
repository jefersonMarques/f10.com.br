<script lang="ts">
    // Orientação possível do vídeo
    type VideoOrientation = "portrait" | "landscape" | "square";

    type TestimonialItem = {
        personPhotoUrl: string;
        personName: string;
        personRole: string;

        schoolLogoUrl: string;
        schoolName: string;

        isVideo: boolean;
        videoUrl?: string | null;
        videoOrientation?: VideoOrientation;

        text?: string | null;
    };

    // Depoimentos fixos
    const testimonials: TestimonialItem[] = [
        // 1) VÍDEO – Sidney (Instituição Ana Hickmann)
        {
            personPhotoUrl: "/Sidney-Kalaes.webp",
            personName: "Sidney Kalaes",
            personRole: "Sócio – Instituição Ana Hickmann",

            schoolLogoUrl: "/icon_ah.webp",
            schoolName: "Instituição Ana Hickmann",

            isVideo: true,
            videoUrl: "/depoimento_ana_hickmann_f10.mp4",
            videoOrientation: "square",
            text: null,
        },

        // 2) VÍDEO – Claudemir (Evolutime)
        {
            personPhotoUrl: "/Claudemir-Martins.webp",
            personName: "Claudemir Martins",
            personRole: "Diretor – Escolas Evolutime",

            schoolLogoUrl: "/icon_evolutime.webp",
            schoolName: "Escolas Evolutime",

            isVideo: true,
            videoUrl: "/evolutime_depoimento_f10.mp4",
            videoOrientation: "square",
            text: null,
        },

        // 3) VÍDEO – Luciano (Evolutime)
        {
            personPhotoUrl: "/Luciano_coordenador.webp",
            personName: "Luciano",
            personRole: "Coordenador – Escolas Evolutime",

            schoolLogoUrl: "/icon_evolutime.webp",
            schoolName: "Escolas Evolutime",

            isVideo: true,
            videoUrl: "/depoimento_luciano_evolutime.mp4",
            videoOrientation: "square",
            text: null,
        },

        // 4) TEXTO – Suzana (Microcamp Curitiba)
        {
            personPhotoUrl: "/suzana_microcamp.webp",
            personName: "Suzana Santos",
            personRole: "Proprietária – Microcamp Curitiba",

            schoolLogoUrl: "/icon_microcamp.webp",
            schoolName: "Microcamp Curitiba",

            isVideo: false,
            videoUrl: null,
            videoOrientation: "landscape",
            text:
                "O sistema realmente faz muita diferença para a eficiência na escola. Recomendo! " +
                "O atendimento é impecável e os resultados melhoraram muito com o uso do CRM.",
        },

        // 5) TEXTO – Sidney (Ana Hickmann)
        {
            personPhotoUrl: "/Sidney-Kalaes.webp",
            personName: "Sidney Kalaes",
            personRole: "Sócio – Instituição Ana Hickmann",

            schoolLogoUrl: "/icon_ah.webp",
            schoolName: "Instituição Ana Hickmann",

            isVideo: false,
            videoUrl: null,
            videoOrientation: "landscape",
            text:
                "Agora temos muito mais controle, produtividade e eficiência. Reduzimos custos e tempo, " +
                "e nossa tomada de decisão ficou muito mais precisa e previsível. " +
                "Sem falar no suporte da equipe e na facilidade de uso: simplesmente excepcionais.",
        },

        // 6) TEXTO – Claudemir (Evolutime)
        {
            personPhotoUrl: "/Claudemir-Martins.webp",
            personName: "Claudemir Martins",
            personRole: "Diretor – Escolas Evolutime",

            schoolLogoUrl: "/icon_evolutime.webp",
            schoolName: "Escolas Evolutime",

            isVideo: false,
            videoUrl: null,
            videoOrientation: "landscape",
            text:
                "Usamos o sistema F10 há 4 anos e estamos muito satisfeitos. " +
                "O sistema é fácil de usar, aumentou a eficiência dos nossos processos, " +
                "reduziu custos e elevou significativamente nossa produtividade.",
        },
    ];

    // Mantém o layout bonitinho de acordo com a orientação do vídeo
    const getVideoAspectRatio = (
        orientation: VideoOrientation = "landscape",
    ): string => {
        switch (orientation) {
            case "portrait":
                return "9 / 16"; // em pé
            case "square":
                return "1 / 1"; // quadrado
            default:
                return "16 / 9"; // padrão paisagem
        }
    };

    // Separa em dois grupos para montar layout
    const videoTestimonials = testimonials.filter((t) => t.isVideo);
    const textTestimonials = testimonials.filter((t) => !t.isVideo);
</script>

<div class="mt-8 space-y-10">
    <!-- BLOCO: VÍDEOS -->
    <div class="space-y-4">
        <p
            class="text-[13px] font-semibold tracking-[0.18em] text-[#7E82A2] uppercase"
        >
            DEPOIMENTOS EM VÍDEO
        </p>

        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {#each videoTestimonials as item}
                <article
                    class="rounded-[24px] bg-white px-6 py-6 md:px-7 md:py-7
                           ring-1 ring-[#E5E7EB] flex flex-col gap-4"
                >
                    <!-- Cabeçalho: pessoa + escola -->
                    <header class="flex items-center justify-between gap-4">
                        <!-- Pessoa -->
                        <div class="flex items-center gap-4">
                            <div
                                class="h-[56px] min-w-[56px] rounded-full bg-[#E5E7EB] overflow-hidden
                                       flex items-center justify-center"
                            >
                                <img
                                    src={item.personPhotoUrl}
                                    alt={`Foto de ${item.personName}`}
                                    class="h-full w-full object-cover"
                                    loading="lazy"
                                />
                            </div>
                            <div>
                                <p
                                    class="text-[15px] font-semibold text-[#000A57]"
                                >
                                    {item.personName}
                                </p>
                                <p class="text-[13px] text-[#6B7280]">
                                    {item.personRole}
                                </p>
                            </div>
                        </div>

                        <!-- Escola -->
                        <div class="flex items-center gap-3">
                            <div
                                class="h-9 min-w-9 rounded-full bg-[#F3F4FD] flex items-center justify-center overflow-hidden"
                            >
                                <img
                                    src={item.schoolLogoUrl}
                                    alt={`Logo da escola ${item.schoolName}`}
                                    class="h-full w-full object-contain"
                                    loading="lazy"
                                />
                            </div>
                            <p
                                class="text-[12px] md:text-[13px] text-[#6B7280] font-medium"
                            >
                                {item.schoolName}
                            </p>
                        </div>
                    </header>

                    <!-- Vídeo -->
                    <div
                        class="mt-2 w-full rounded-[18px] overflow-hidden bg-[#020617] relative
                               shadow-[0_12px_30px_rgba(15,23,42,0.35)]"
                        style={`aspect-ratio: ${getVideoAspectRatio(item.videoOrientation)};`}
                    >
                        <!-- svelte-ignore a11y_media_has_caption -->
                        <video
                            src={item.videoUrl!}
                            class="w-full h-full object-cover"
                            controls
                            preload="metadata"
                        >
                            Seu navegador não suporta reprodução de vídeo.
                        </video>
                    </div>

                    <!-- Legenda curta abaixo do vídeo -->
                    <p
                        class="text-[13px] md:text-[14px] leading-[1.7]
                               text-[#000A57]/80"
                    >
                        Depoimento em vídeo gravado por {item.personName},{" "}
                        {item.personRole} na{" "}
                        <span class="font-semibold">{item.schoolName}</span>.
                    </p>
                </article>
            {/each}
        </div>
    </div>

    <!-- BLOCO: TEXTOS -->
    <div class="space-y-4">
        <p
            class="text-[13px] font-semibold tracking-[0.18em] text-[#7E82A2] uppercase"
        >
            DEPOIMENTOS ESCRITOS
        </p>

        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {#each textTestimonials as item}
                <article
                    class="rounded-[24px] bg-white px-6 py-6 md:px-7 md:py-7
                           ring-1 ring-[#E5E7EB] flex flex-col gap-4"
                >
                    <!-- Cabeçalho: pessoa + escola -->
                    <header class="flex items-center justify-between gap-4">
                        <!-- Pessoa -->
                        <div class="flex items-center gap-4">
                            <div
                                class="h-[48px] min-w-[48px] rounded-full bg-[#E5E7EB] overflow-hidden
                                       flex items-center justify-center"
                            >
                                <img
                                    src={item.personPhotoUrl}
                                    alt={`Foto de ${item.personName}`}
                                    class="h-full w-full object-cover"
                                    loading="lazy"
                                />
                            </div>
                            <div>
                                <p
                                    class="text-[14px] font-semibold text-[#000A57]"
                                >
                                    {item.personName}
                                </p>
                                <p class="text-[12px] text-[#6B7280]">
                                    {item.personRole}
                                </p>
                            </div>
                        </div>

                        <!-- Escola (só logo, discreto) -->
                        <div class="flex items-center gap-3">
                            <div
                                class="h-8 min-w-8 rounded-full bg-[#F3F4FD] flex items-center justify-center overflow-hidden"
                            >
                                <img
                                    src={item.schoolLogoUrl}
                                    alt={`Logo da escola ${item.schoolName}`}
                                    class="h-full w-full object-contain"
                                    loading="lazy"
                                />
                            </div>
                        </div>
                    </header>

                    <!-- Bloco de texto (citação) -->
                    <div class="relative mt-1">
                        <div
                            class="absolute -top-4 -left-1 text-[#EA6D0B]/25 text-[46px]"
                        >
                            &ldquo;
                        </div>

                        <p
                            class="text-[14px] md:text-[15px] leading-[1.7]
                                   text-[#000A57]/85"
                        >
                            {item.text}
                        </p>
                    </div>
                </article>
            {/each}
        </div>
    </div>
</div>
