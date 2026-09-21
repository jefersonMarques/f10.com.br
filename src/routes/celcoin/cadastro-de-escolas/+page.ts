import type { PageLoad } from "./$types";

export const load: PageLoad = ({ url }) => ({
  flow: url.searchParams.get("flow") === "onboarding" ? "onboarding" as const : null,
});
