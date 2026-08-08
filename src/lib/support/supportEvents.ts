export const openSupportEventName = "f10:open-support";

export function requestSupportWidget(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(openSupportEventName));
}
