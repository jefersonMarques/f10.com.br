<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import { Moon, Sun } from "lucide-svelte";
  import "$lib/application/theme.css";
  import "$lib/application/legacy-theme.css";

  type ApplicationTheme = "light" | "dark";

  const THEME_STORAGE_KEY = "f10-application-theme";

  let theme: ApplicationTheme = "light";

  $: isApplicationRoute = $page.url.pathname === "/app" || $page.url.pathname.startsWith("/app/");

  function resolveTheme(): ApplicationTheme {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === "light" || storedTheme === "dark") return storedTheme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyTheme(nextTheme: ApplicationTheme, persist = false): void {
    theme = nextTheme;
    document.documentElement.dataset.applicationTheme = nextTheme;

    if (persist) {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    }
  }

  function toggleTheme(): void {
    applyTheme(theme === "dark" ? "light" : "dark", true);
  }

  onMount(() => {
    if (!isApplicationRoute) return;

    const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      if (window.localStorage.getItem(THEME_STORAGE_KEY)) return;
      applyTheme(event.matches ? "dark" : "light");
    };

    applyTheme(resolveTheme());
    colorScheme.addEventListener("change", handleSystemThemeChange);

    return () => {
      colorScheme.removeEventListener("change", handleSystemThemeChange);
      document.documentElement.removeAttribute("data-application-theme");
    };
  });
</script>

{#if isApplicationRoute}
  <button
    type="button"
    class="application-theme-toggle"
    aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
    aria-pressed={theme === "dark"}
    title={theme === "dark" ? "Modo claro" : "Modo escuro"}
    on:click={toggleTheme}
  >
    {#if theme === "dark"}
      <Sun size={17} aria-hidden="true" />
    {:else}
      <Moon size={17} aria-hidden="true" />
    {/if}
  </button>
{/if}
