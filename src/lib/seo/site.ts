import type {
  OrganizationSchemaInput,
  SoftwareApplicationSchemaInput,
  WebPageSchemaInput,
  WebsiteSchemaInput,
} from "$lib/seo/schema";
import { salesContact } from "$lib/config/contactConfig";

export const SITE_URL = "https://f10.com.br";
export const SITE_NAME = "F10 Software";
export const SITE_LANGUAGE = "pt-BR";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/cover.png?v=2`;

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const SOFTWARE_ID = `${SITE_URL}/#software`;

export const ORGANIZATION_DATA: OrganizationSchemaInput = {
  id: ORGANIZATION_ID,
  name: SITE_NAME,
  alternateName: "F10",
  description:
    "Empresa brasileira de tecnologia especializada em software de gestão escolar para cursos livres, escolas de idiomas, ensino profissionalizante, cursos técnicos e redes educacionais.",
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/logo_f10.svg`,
  image: [DEFAULT_OG_IMAGE],
  email: "vendas@f10.com.br",
  telephone: salesContact.schemaTelephone,
  sameAs: [
    "https://www.facebook.com/F10Software",
    "https://www.linkedin.com/company/f10software/",
    "https://www.youtube.com/@f10software76",
    "https://www.instagram.com/f10software/",
  ],
  address: {
    streetAddress: "R. Comendador Araújo, 143, 3º andar",
    addressLocality: "Curitiba",
    addressRegion: "PR",
    postalCode: "80420-900",
    addressCountry: "BR",
  },
  contactPoint: [
    {
      contactType: "sales",
      telephone: salesContact.schemaTelephone,
      email: "vendas@f10.com.br",
      areaServed: "BR",
      availableLanguage: SITE_LANGUAGE,
    },
  ],
};

export const WEBSITE_DATA: WebsiteSchemaInput = {
  id: WEBSITE_ID,
  name: SITE_NAME,
  alternateName: "F10",
  url: `${SITE_URL}/`,
  publisherId: ORGANIZATION_ID,
  inLanguage: SITE_LANGUAGE,
};

export const SOFTWARE_APPLICATION_DATA: SoftwareApplicationSchemaInput = {
  id: SOFTWARE_ID,
  name: SITE_NAME,
  description:
    "Plataforma completa de gestão escolar que integra as áreas pedagógica, financeira, administrativa, comercial e de marketing.",
  url: `${SITE_URL}/`,
  brandName: "F10",
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "SchoolManagementSoftware",
  operatingSystem: "Web",
  inLanguage: SITE_LANGUAGE,
  providerId: ORGANIZATION_ID,
  publisherId: ORGANIZATION_ID,
  featureList: [
    "Gestão pedagógica e secretaria escolar",
    "Gestão financeira, cobranças, boletos e Pix",
    "CRM escolar com funil de matrículas em Kanban",
    "WhatsApp integrado e atendimento multiusuário",
    "Aplicativo para alunos e responsáveis",
    "Portal do Aluno e Ambiente Virtual de Aprendizagem",
    "Matrícula online e assinatura digital",
    "Indicadores gerenciais e Business Intelligence",
  ],
  screenshot: [`${SITE_URL}/hero_image.webp`],
  image: [DEFAULT_OG_IMAGE],
};

type BuildWebPageDataInput = {
  path: string;
  title: string;
  description: string;
  pageType?: WebPageSchemaInput["pageType"];
  mainEntityId?: string;
  imageUrl?: string;
};

export function buildWebPageData({
  path,
  title,
  description,
  pageType = "WebPage",
  mainEntityId = SOFTWARE_ID,
  imageUrl = DEFAULT_OG_IMAGE,
}: BuildWebPageDataInput): WebPageSchemaInput {
  const normalizedPath = path === "/" ? "/" : `/${path.replace(/^\/+|\/+$/g, "")}`;
  const canonicalUrl = `${SITE_URL}${normalizedPath}`;

  return {
    id: `${canonicalUrl}#webpage`,
    pageType,
    name: title,
    description,
    url: canonicalUrl,
    isPartOfId: WEBSITE_ID,
    aboutId: ORGANIZATION_ID,
    mainEntityId,
    primaryImageUrl: imageUrl,
    inLanguage: SITE_LANGUAGE,
  };
}
