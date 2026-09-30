import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";
import { getOptionalCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
import { listActiveIframeF10Notices } from "$lib/server/iframeF10/noticeRepository";
import {
  getIframeF10VisibilitySettings,
  type IframeF10VisibilitySettings,
} from "$lib/server/settings/operationsSettingsRepository";

type IframeSection = keyof IframeF10VisibilitySettings;

const routes: Array<{ key: IframeSection; href: string }> = [
  { key: "support", href: "/iframef10/suporte" },
  { key: "updates", href: "/iframef10/novidades" },
  { key: "resources", href: "/iframef10/recursos" },
  { key: "notices", href: "/iframef10/avisos" },
];

function sectionFromPath(pathname: string): IframeSection | null {
  const match = routes.find(
    (route) => pathname === route.href || pathname.startsWith(`${route.href}/`),
  );
  return match?.key ?? null;
}

function firstEnabledHref(settings: IframeF10VisibilitySettings): string {
  return routes.find((route) => settings[route.key])?.href ?? "/iframef10/indisponivel";
}

export const load: LayoutServerLoad = async ({ cookies, url }) => {
  const [customer, visibility] = await Promise.all([
    getOptionalCustomerF10PortalSession(cookies, { touchActivity: false }).catch(() => null),
    getIframeF10VisibilitySettings(),
  ]);

  const firstHref = firstEnabledHref(visibility);
  const currentSection = sectionFromPath(url.pathname);
  const unavailable = url.pathname === "/iframef10/indisponivel";

  if (url.pathname === "/iframef10") throw redirect(303, firstHref);
  if (currentSection && !visibility[currentSection]) throw redirect(303, firstHref);
  if (unavailable && firstHref !== "/iframef10/indisponivel") throw redirect(303, firstHref);

  const notices = visibility.notices
    ? await listActiveIframeF10Notices()
    : [];

  return {
    visibility,
    firstEnabledHref: firstHref,
    notices,
    customerSupport: customer
      ? {
          authenticated: true,
          name: customer.name,
          email: customer.email,
          groupName: customer.selectedGroupName,
          unitName: customer.selectedUnitName,
          requiresUnitSelection: customer.selectedUnitId === null,
          groups: customer.groups.map((group) => ({
            id: group.grupo_id,
            name: group.grupo,
            units: group.unidades.map((unit) => ({
              id: unit.unidade_id,
              name: unit.unidade,
            })),
          })),
        }
      : {
          authenticated: false,
          name: "",
          email: "",
          groupName: null,
          unitName: null,
          requiresUnitSelection: false,
          groups: [],
        },
  };
};
