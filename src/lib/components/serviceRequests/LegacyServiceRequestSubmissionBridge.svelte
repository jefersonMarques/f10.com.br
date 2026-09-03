<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";

  export let endpoint: string;

  function createIdempotencyKey(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `service-request-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  }

  onMount(() => {
    const originalFetch = window.fetch.bind(window);
    const idempotencyKey = createIdempotencyKey();

    const bridgedFetch: typeof window.fetch = async (input, init) => {
      let pathname = "";
      try {
        const rawUrl = typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
        pathname = new URL(rawUrl, window.location.origin).pathname;
      } catch {
        return originalFetch(input, init);
      }

      if (pathname !== endpoint) return originalFetch(input, init);

      const baseHeaders = input instanceof Request ? input.headers : init?.headers;
      const headers = new Headers(baseHeaders);
      headers.set("Idempotency-Key", idempotencyKey);
      const response = await originalFetch(input, { ...init, headers });

      if (response.ok) {
        const payload = await response.clone().json().catch(() => null) as {
          success?: boolean;
          ticketHref?: string;
        } | null;
        if (payload?.success && payload.ticketHref?.startsWith("/cliente/chamados/")) {
          window.setTimeout(() => void goto(payload.ticketHref as string), 0);
        }
      }

      return response;
    };

    window.fetch = bridgedFetch;
    return () => {
      if (window.fetch === bridgedFetch) window.fetch = originalFetch;
    };
  });
</script>
