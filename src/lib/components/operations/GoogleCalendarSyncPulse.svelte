<script lang="ts">
  import { onMount } from "svelte";

  export let enabled = false;

  const STORAGE_KEY = "f10-google-calendar-sync-pulse-at";
  const CLIENT_THROTTLE_MS = 60_000;
  const PERIODIC_INTERVAL_MS = 5 * 60_000;
  const INITIAL_DELAY_MS = 12_000;

  let inFlight = false;

  function readLastPulseAt(): number {
    try {
      const value = Number.parseInt(window.localStorage.getItem(STORAGE_KEY) ?? "0", 10);
      return Number.isFinite(value) ? value : 0;
    } catch {
      return 0;
    }
  }

  function rememberPulseAt(value: number): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // O lease no servidor continua sendo a proteção autoritativa entre abas.
    }
  }

  async function pulse(): Promise<void> {
    if (!enabled || inFlight || document.visibilityState !== "visible") return;

    const now = Date.now();
    if (now - readLastPulseAt() < CLIENT_THROTTLE_MS) return;
    rememberPulseAt(now);
    inFlight = true;

    try {
      await fetch("/api/app/google-calendar/sync", {
        method: "POST",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
    } catch {
      // O próximo pulso tenta novamente sem interromper a navegação.
    } finally {
      inFlight = false;
    }
  }

  onMount(() => {
    if (!enabled) return;

    const initialTimer = window.setTimeout(() => void pulse(), INITIAL_DELAY_MS);
    const periodicTimer = window.setInterval(() => void pulse(), PERIODIC_INTERVAL_MS);
    const handleFocus = () => void pulse();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void pulse();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(periodicTimer);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  });
</script>
