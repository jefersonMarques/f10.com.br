export type SetupGuideSlide = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
};

export type TroubleshootingGuide = {
  title: string;
  description: string;
  checklistItems: string[];
};

export const installationSlides: SetupGuideSlide[] = [
  {
    id: "open-installer",
    title: "Abra o arquivo InstaladorF10.exe",
    description:
      "Entre na pasta Downloads e clique duas vezes no instalador do F10.",
    imageUrl: "/onboarding/f10-installer-download.webp",
    imageAlt:
      "Pasta Downloads do Windows mostrando o arquivo InstaladorF10.exe",
  },
  {
    id: "start-installer",
    title: "Clique em Avançar",
    description:
      "Feche outros programas abertos e inicie o assistente de instalação.",
    imageUrl: "/onboarding/f10-installer-welcome.webp",
    imageAlt: "Tela inicial do assistente de instalação do F10",
  },
  {
    id: "keep-destination",
    title: "Mantenha a pasta sugerida",
    description:
      "Não altere o local de instalação. Apenas clique novamente em Avançar.",
    imageUrl: "/onboarding/f10-installer-destination.webp",
    imageAlt: "Assistente do F10 mostrando a pasta de instalação sugerida",
  },
  {
    id: "keep-start-menu-folder",
    title: "Mantenha a pasta do Menu Iniciar",
    description: "Não é necessário alterar esse campo. Clique em Avançar.",
    imageUrl: "/onboarding/f10-installer-start-menu.webp",
    imageAlt: "Assistente do F10 mostrando a pasta do Menu Iniciar",
  },
  {
    id: "create-desktop-shortcut",
    title: "Crie o atalho na área de trabalho",
    description:
      "Deixe a opção marcada para encontrar o F10 com facilidade e clique em Avançar.",
    imageUrl: "/onboarding/f10-installer-shortcut.webp",
    imageAlt: "Assistente do F10 com a opção de criar atalho selecionada",
  },
  {
    id: "wait-installation",
    title: "Aguarde a instalação terminar",
    description:
      "Não feche a janela enquanto os arquivos estiverem sendo instalados.",
    imageUrl: "/onboarding/f10-installer-progress.webp",
    imageAlt: "Barra de progresso da instalação do F10",
  },
  {
    id: "finish-installation",
    title: "Deixe Iniciar o F10 marcado e clique em Concluir",
    description:
      "O instalador será fechado e a tela de acesso do F10 será aberta.",
    imageUrl: "/onboarding/f10-installer-complete.webp",
    imageAlt: "Última tela do instalador do F10 com o botão Concluir",
  },
];

export const provisionalAccessSlides: SetupGuideSlide[] = [
  {
    id: "enter-provisional-credentials",
    title: "Digite o login e a senha provisória",
    description:
      "Use exatamente os dados recebidos no e-mail de boas-vindas da F10.",
    imageUrl: "/onboarding/f10-access-credentials.webp",
    imageAlt: "Tela de acesso do F10 com os campos de login e senha",
  },
  {
    id: "select-company",
    title: "Selecione sua escola e clique em Acessar",
    description:
      "Depois de validar os dados, o F10 mostrará o campo Empresa.",
    imageUrl: "/onboarding/f10-access-company.webp",
    imageAlt:
      "Tela de acesso do F10 com login, senha, empresa e botão Acessar",
  },
];

export const passwordSetupSlides: SetupGuideSlide[] = [
  {
    id: "create-new-password",
    title: "Crie sua nova senha",
    description:
      "Digite uma senha pessoal e clique em OK. O sistema ainda não será aberto: a tela de acesso será recarregada.",
    imageUrl: "/onboarding/f10-password-change.webp",
    imageAlt: "Janela do F10 solicitando a criação de uma nova senha",
  },
];

export const finalAccessSlides: SetupGuideSlide[] = [
  {
    id: "enter-new-credentials",
    title: "Entre novamente usando a nova senha",
    description:
      "Use o mesmo login, digite a senha que acabou de criar e aguarde o campo Empresa aparecer.",
    imageUrl: "/onboarding/f10-access-credentials.webp",
    imageAlt: "Tela de acesso do F10 com os campos de login e senha",
  },
  {
    id: "access-system",
    title: "Selecione sua escola e clique em Acessar",
    description: "Agora o F10 será aberto e você poderá iniciar a configuração.",
    imageUrl: "/onboarding/f10-access-company.webp",
    imageAlt:
      "Tela de acesso do F10 com login, senha, empresa e botão Acessar",
  },
];

export const troubleshootingGuides = {
  download: {
    title: "Vamos verificar o download",
    description: "Confira cada item antes de tentar novamente.",
    checklistItems: [
      "Estou usando um computador com Windows.",
      "Cliquei no botão Baixar o F10.",
      "Verifiquei se o arquivo InstaladorF10.exe apareceu na pasta Downloads.",
      "Verifiquei se o navegador bloqueou ou cancelou o download.",
    ],
  },
  installation: {
    title: "Vamos verificar a instalação",
    description: "Compare o que aconteceu no computador com estes itens.",
    checklistItems: [
      "Abri o arquivo InstaladorF10.exe na pasta Downloads.",
      "Cliquei em Avançar mantendo as pastas sugeridas.",
      "Deixei marcada a opção Criar um atalho na área de trabalho.",
      "Aguardei a barra de instalação terminar.",
      "Deixei Iniciar o F10 marcado e cliquei em Concluir.",
    ],
  },
  provisionalAccess: {
    title: "Vamos verificar o primeiro acesso",
    description: "Os dados provisórios precisam ser digitados exatamente como estão no e-mail.",
    checklistItems: [
      "Localizei o e-mail de boas-vindas da F10.",
      "Digitei o login informado no e-mail.",
      "Digitei a senha provisória respeitando letras, números e caracteres.",
      "Selecionei minha escola quando o campo Empresa apareceu.",
      "Cliquei em Acessar.",
    ],
  },
  passwordSetup: {
    title: "Vamos verificar a troca de senha",
    description: "Essa troca é obrigatória antes do primeiro acesso ao sistema.",
    checklistItems: [
      "A janela Digite sua nova senha apareceu.",
      "Digitei uma nova senha pessoal.",
      "Cliquei em OK.",
      "A tela voltou para o login do F10.",
    ],
  },
  finalAccess: {
    title: "Vamos verificar o segundo login",
    description: "Agora deve ser utilizada a nova senha, não a senha provisória do e-mail.",
    checklistItems: [
      "Digitei o mesmo login recebido por e-mail.",
      "Digitei a nova senha que acabei de criar.",
      "Selecionei minha escola no campo Empresa.",
      "Cliquei em Acessar.",
    ],
  },
} satisfies Record<string, TroubleshootingGuide>;
