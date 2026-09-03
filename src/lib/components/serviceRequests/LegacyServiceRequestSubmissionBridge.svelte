<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";

  export let endpoint: string;

  const MB = 1024 * 1024;

  function createIdempotencyKey(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `service-request-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  }

  function validateAttachments(body: BodyInit | null | undefined): string | null {
    if (!(body instanceof FormData)) return null;
    let totalBytes = 0;

    for (const [fieldKey, value] of body.entries()) {
      if (!(value instanceof File) || value.size <= 0) continue;
      totalBytes += value.size;
      const maxBytes = endpoint === "/api/nfse/nfse-homologacao/submit"
        ? 5 * MB
        : fieldKey === "doc_selfie"
          ? 5 * MB
          : 10 * MB;
      if (value.size > maxBytes) {
        const limit = Math.round(maxBytes / MB);
        return `O arquivo ${value.name} excede o limite de ${limit} MB.`;
      }
    }

    if (totalBytes > 50 * MB) return "O conjunto de documentos excede o limite total de 50 MB.";
    return null;
  }

  function invalidAttachmentResponse(message: string): Response {
    return new Response(JSON.stringify({ success: false, message, error: "PAYLOAD_TOO_LARGE" }), {
      status: 413,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
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

      const attachmentError = validateAttachments(init?.body);
      if (attachmentError) return invalidAttachmentResponse(attachmentError);

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
