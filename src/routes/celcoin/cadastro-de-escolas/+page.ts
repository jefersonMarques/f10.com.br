import type { PageLoad } from "./$types";

export const prerender = false;

export const load: PageLoad = ({ url }) => ({
  flow: url.searchParams.get("flow") === "onboarding" ? "onboarding" as const : null,
});
