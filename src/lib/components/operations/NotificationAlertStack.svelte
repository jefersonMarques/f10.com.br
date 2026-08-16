<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { BellRing, MessageCircleMore, CheckSquare2, AtSign, MonitorCog, X } from "lucide-svelte";
  import { notificationSoundDataUri } from "$lib/components/operations/notificationSound";

  type NotificationItem = {
    id: string;
    kind: string;
    title: string;
    body: string | null;
    href: string;
    entityType: string | null;
    entityId: string | null;
    readAt: string | Date | null;
    createdAt: string | Date;
  };

  export let notifications: NotificationItem[] = [];

  const DISMISSED_STORAGE_KEY = "f10_notification_alerts_dismissed";
  const MAX_VISIBLE_ALERTS = 5;

  let mounted = false;
  let knownIds = new Set<string>();
  let dismissedIds = new Set<string>();
  let alerts: NotificationItem[] = [];
  let audio: HTMLAudioElement | null = null;
  let audioUnlocked = false;
  let pendingSound = false;
  let unlockHandler: (() => void) | null = null;

  function notificationLabel(kind: string): string {
    if (kind.startsWith("chat.")) return "Atendimento";
    if (kind.startsWith("task.")) return "Tarefa";
    if (kind.includes("mention")) return "Menção";
    if (kind.startsWith("remote.")) return "Acesso remoto";
    if (kind.startsWith("ticket.")) return "Ticket";
    return "Notificação";
  }

  function notificationIcon(kind: string) {
    if (kind.startsWith("chat.")) return MessageCircleMore;
    if (kind.startsWith("task.")) return CheckSquare2;
    if (kind.includes("mention")) return AtSign;
    if (kind.startsWith("remote.")) return MonitorCog;
    return BellRing;
  }

  function persistDismissedIds(): void {
    try {
      sessionStorage.setItem(
        DISMISSED_STORAGE_KEY,
        JSON.stringify(Array.from(dismissedIds).slice(-100)),
      );
    } catch {
      // O alerta continua funcionando mesmo se o navegador bloquear sessionStorage.
    }
  }

  function dismissAlert(notificationId: string): void {
    dismissedIds.add(notificationId);
    persistDismissedIds();
    alerts = alerts.filter((alert) => alert.id !== notificationId);
  }

  async function playNotificationSound(): Promise<void> {
    if (!audio) return;

    try {
      audio.currentTime = 0;
      audio.volume = 0.6;
      await audio.play();
      audioUnlocked = true;
      pendingSound = false;
    } catch {
      pendingSound = true;
    }
  }

  async function unlockAudio(): Promise<void> {
    if (!audio || audioUnlocked) return;

    try {
      const previousVolume = audio.volume;
      audio.currentTime = 0;
      audio.volume = 0;
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      audio.volume = previousVolume;
      audioUnlocked = true;

      if (pendingSound) {
        pendingSound = false;
        await playNotificationSound();
      }
    } catch {
      // Alguns navegadores só liberam áudio depois de uma interação posterior.
    }
  }

  function captureNewNotifications(items: NotificationItem[]): void {
    if (!mounted) return;

    const incoming: NotificationItem[] = [];
    for (const notification of items) {
      if (knownIds.has(notification.id)) continue;
      knownIds.add(notification.id);

      if (!notification.readAt && !dismissedIds.has(notification.id)) {
        incoming.push(notification);
      }
    }

    if (incoming.length === 0) return;

    const currentIds = new Set(alerts.map((alert) => alert.id));
    alerts = [
      ...incoming.filter((notification) => !currentIds.has(notification.id)),
      ...alerts,
    ].slice(0, MAX_VISIBLE_ALERTS);

    void playNotificationSound();
  }

  $: captureNewNotifications(notifications);

  onMount(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem(DISMISSED_STORAGE_KEY) ?? "[]");
      if (Array.isArray(stored)) {
        dismissedIds = new Set(stored.filter((value): value is string => typeof value === "string"));
      }
    } catch {
      dismissedIds = new Set();
    }

    knownIds = new Set(notifications.map((notification) => notification.id));
    audio = new Audio(notificationSoundDataUri);
    audio.preload = "auto";
    audio.volume = 0.6;
    mounted = true;

    unlockHandler = () => void unlockAudio();
    window.addEventListener("pointerdown", unlockHandler, { passive: true });
    window.addEventListener("keydown", unlockHandler, { passive: true });
  });

  onDestroy(() => {
    if (unlockHandler) {
      window.removeEventListener("pointerdown", unlockHandler);
      window.removeEventListener("keydown", unlockHandler);
    }
    if (audio) {
      audio.pause();
      audio.src = "";
    }
  });
</script>

<div
  class="pointer-events-none fixed bottom-5 right-5 z-[90] flex w-[min(390px,calc(100vw-2rem))] flex-col gap-3"
  aria-live="polite"
  aria-label="Novas notificações"
>
  {#each alerts as alert (alert.id)}
    <article class="pointer-events-auto overflow-hidden rounded-2xl border border-[#DDE1EA] bg-white shadow-[0_18px_55px_rgba(1,13,40,0.22)]">
      <div class="flex items-start gap-3 p-4">
        <span class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]">
          <svelte:component this={notificationIcon(alert.kind)} size={19} aria-hidden="true" />
        </span>

        <a
          href={`/app/notifications/open/${alert.id}`}
          class="min-w-0 flex-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#000A57]/25"
        >
          <span class="text-[10px] font-bold uppercase tracking-[0.08em] text-[#EA6D0B]">
            {notificationLabel(alert.kind)}
          </span>
          <strong class="mt-1 block text-[13px] font-semibold leading-5 text-[#202637]">
            {alert.title}
          </strong>
          {#if alert.body}
            <span class="mt-1 line-clamp-2 block text-[11px] leading-5 text-[#747A89]">
              {alert.body}
            </span>
          {/if}
          <span class="mt-2 block text-[10px] font-semibold text-[#000A57]">
            Abrir
          </span>
        </a>

        <button
          type="button"
          on:click={() => dismissAlert(alert.id)}
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#8C929F] transition hover:bg-[#F2F3F7] hover:text-[#3E4453]"
          aria-label="Fechar esta notificação"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </article>
  {/each}
</div>
