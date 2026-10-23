<script lang="ts">
  import { onMount } from "svelte";
  import { invalidateAll } from "$app/navigation";

  export let endpoint: string;
  export let initialRevision: string | null = null;
  export let intervalMs = 6_000;
  export let onRefresh: () => void | Promise<void> = () => invalidateAll();

  onMount(() => {
    let lastEndpoint = endpoint;
    let previous = initialRevision;
    let inFlight = false;
    let closed = false;

    async function check(): Promise<void> {
      if (closed || inFlight || document.hidden) return;
      inFlight = true;
      const current = endpoint;
      if (current !== lastEndpoint) {
        lastEndpoint = current;
        previous = initialRevision;
      }
      try {
        const response = await fetch(current, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!response.ok) return;
        const result = await response.json() as { revision?: string | number };
        if (result.revision === undefined || result.revision === null) return;
        const revision = String(result.revision);
        if (current !== endpoint) return;
        if (previous !== null && revision !== previous) {
          await onRefresh();
        }
        previous = revision;
      } catch {
        // Reconnect on the next tick without disrupting the current form.
      } finally {
        inFlight = false;
      }
    }

    const onVisible = () => { if (!document.hidden) void check(); };
    const timer = window.setInterval(() => void check(), intervalMs);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    void check();

    return () => {
      closed = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  });
</script>
