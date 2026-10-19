// Fonte: plano editorial de 19/10/2026. IDs do Movidesk, não UUIDs dos rascunhos.
// A coleção não concede acesso. Somente artigos publicados podem entrar nela.
export type MovideskCollectionPlan = {
  slug: string;
  title: string;
  description: string;
  sortOrder: number;
  sourceIds: readonly number[];
};

export const MOVIDESK_PUBLIC_COLLECTIONS: readonly MovideskCollectionPlan[] = [
  {
    "slug": "primeiros-passos",
    "title": "Primeiros passos e cadastros",
    "description": "Cadastros iniciais e uso diário do F10",
    "sortOrder": 10,
    "sourceIds": [
      119823,
      119824,
      119825,
      119826,
      119827,
      119831,
      122051,
      122614,
      122616,
      122083,
      122085,
      120909,
      122431,
      128816,
      140107
    ]
  },
  {
    "slug": "cursos-materias-e-turmas",
    "title": "Cursos, matérias e turmas",
    "description": "Estrutura de cursos, matérias e turmas",
    "sortOrder": 20,
    "sourceIds": [
      119824,
      119825,
      119826,
      119827,
      119832,
      122083,
      122085,
      508897,
      122091,
      224746,
      122086,
      537038,
      342342
    ]
  },
  {
    "slug": "presenca-avaliacoes",
    "title": "Presença, aulas e avaliações",
    "description": "Controle de aulas, presença e avaliações",
    "sortOrder": 30,
    "sourceIds": [
      119828,
      119829,
      119830,
      122052,
      122064,
      122073,
      165978,
      165980,
      224936,
      342342,
      122054,
      342330
    ]
  },
  {
    "slug": "comercial-visitas-e-contratos",
    "title": "Comercial, visitas e contratos",
    "description": "Atendimento comercial, visitas e contratos",
    "sortOrder": 40,
    "sourceIds": [
      119833,
      119834,
      119835,
      119836,
      122049,
      122067,
      122070,
      122071,
      122074,
      122080,
      224767,
      508901,
      342335,
      342336,
      342341
    ]
  },
  {
    "slug": "crm-e-whatsapp",
    "title": "CRM e WhatsApp",
    "description": "Leads, funil de vendas e WhatsApp",
    "sortOrder": 50,
    "sourceIds": [
      119881,
      119882,
      119883,
      119886,
      122069,
      122080,
      123639,
      123640,
      342340,
      119885,
      342339
    ]
  },
  {
    "slug": "sms",
    "title": "Configuração e envio de SMS",
    "description": "Configuração e envio de mensagens SMS",
    "sortOrder": 60,
    "sourceIds": [
      119838,
      119839,
      119840,
      119841
    ]
  },
  {
    "slug": "aceite-online",
    "title": "Aceite online de contratos",
    "description": "Assinatura e aceite digital de contratos",
    "sortOrder": 70,
    "sourceIds": [
      119887,
      119888
    ]
  },
  {
    "slug": "mensalidades-e-cobranca",
    "title": "Mensalidades, negociação e cobrança",
    "description": "Mensalidades, negociação e cobrança",
    "sortOrder": 80,
    "sourceIds": [
      119842,
      119843,
      119851,
      119852,
      119856,
      122055,
      122058,
      122060,
      122065,
      508905,
      508908,
      122943,
      342333,
      543095
    ]
  },
  {
    "slug": "contas-bancos-conciliacao",
    "title": "Contas, bancos e conciliação",
    "description": "Contas, movimentações e conciliação financeira",
    "sortOrder": 90,
    "sourceIds": [
      119844,
      119845,
      119846,
      119853,
      119854,
      119855,
      122076,
      519568,
      296875
    ]
  },
  {
    "slug": "boletos-remessa-retorno",
    "title": "Boletos, remessa e retorno",
    "description": "Emissão e processamento de boletos e arquivos bancários",
    "sortOrder": 100,
    "sourceIds": [
      119868,
      119869,
      119870,
      119871,
      119846
    ]
  },
  {
    "slug": "pix-e-recorrencia",
    "title": "Pix e pagamentos recorrentes",
    "description": "Cobranças Pix e pagamentos recorrentes",
    "sortOrder": 110,
    "sourceIds": [
      122088,
      342345,
      508902,
      167485
    ]
  },
  {
    "slug": "notas-fiscais",
    "title": "Emissão e gestão de notas fiscais",
    "description": "Procedimentos de emissão e gestão fiscal",
    "sortOrder": 120,
    "sourceIds": [
      119893,
      119895,
      119896,
      119898,
      119899,
      119900,
      119901,
      119902,
      119904,
      119905,
      119907,
      119908,
      119909,
      119911,
      122523,
      122924,
      122937,
      122939,
      122940,
      122925,
      565512,
      570032,
      579114,
      579118,
      359363,
      319688
    ]
  },
  {
    "slug": "usuarios-permissoes",
    "title": "Usuários, direitos e perfis",
    "description": "Controle de usuários, acesso e permissões",
    "sortOrder": 130,
    "sourceIds": [
      119831,
      119858,
      119859,
      119860,
      119861,
      119862,
      122051,
      122062,
      508894,
      508899
    ]
  },
  {
    "slug": "parametrizacao",
    "title": "Sistema e parametrização",
    "description": "Configuração do F10 e parâmetros gerais",
    "sortOrder": 140,
    "sourceIds": [
      119857,
      119859,
      119860,
      119861,
      119862,
      122077,
      122091,
      122093,
      508899,
      167440
    ]
  },
  {
    "slug": "portal-app-aluno",
    "title": "Portal e aplicativo do aluno",
    "description": "Acesso e funcionalidades para alunos",
    "sortOrder": 150,
    "sourceIds": [
      122619,
      165981,
      165984,
      165985,
      165986,
      167439,
      167485,
      167790,
      177103,
      177138,
      231572
    ]
  },
  {
    "slug": "aulas-online",
    "title": "Aulas online e videoconferências",
    "description": "Aulas remotas e ferramentas de videoconferência",
    "sortOrder": 160,
    "sourceIds": [
      165966,
      165968,
      165969,
      165970,
      165978,
      165980,
      165981
    ]
  },
  {
    "slug": "jornada-do-aluno",
    "title": "Jornada do aluno",
    "description": "Rotinas de acompanhamento do aluno",
    "sortOrder": 170,
    "sourceIds": [
      166302,
      166309,
      224746,
      224936
    ]
  },
  {
    "slug": "dashboards-relatorios",
    "title": "Dashboards e relatórios",
    "description": "Indicadores, consultas e relatórios",
    "sortOrder": 180,
    "sourceIds": [
      119912,
      122048,
      122064,
      222761,
      224711,
      224969
    ]
  }
];

// Interseções com procedimentos internos/legados e duplicações conhecidas.
// A confirmação de revisão de uma mídia também não libera estes artigos.
export const MOVIDESK_PUBLIC_EXCLUSIONS = new Set<number>([
  119872, // duplicado quase integral do #119846
  122943, // misto; também classificado como procedimento interno
  122644, 122653, // classificados também como infraestrutura/suporte interno
  166620, // anúncio histórico sem curadoria
]);

export const MOVIDESK_PUBLIC_SOURCE_IDS = [
  ...new Set(MOVIDESK_PUBLIC_COLLECTIONS.flatMap((collection) => collection.sourceIds)),
].filter((sourceId) => !MOVIDESK_PUBLIC_EXCLUSIONS.has(sourceId))
  .sort((a, b) => a - b);
