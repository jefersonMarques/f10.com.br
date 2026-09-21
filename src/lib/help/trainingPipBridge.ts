type DocumentPictureInPictureController = {
  requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>;
};

let pendingWindow: Promise<Window | null> | null = null;

function controller(): DocumentPictureInPictureController | null {
  if (typeof window === "undefined") return null;
  return (window as Window & {
    documentPictureInPicture?: DocumentPictureInPictureController;
  }).documentPictureInPicture ?? null;
}

export function trainingPipSupported(): boolean {
  return Boolean(controller());
}

export function requestTrainingPipWindow(): boolean {
  const current = controller();
  if (!current) return false;
  const availableHeight = Number.isFinite(window.screen?.availHeight)
    ? window.screen.availHeight
    : 760;
  pendingWindow = current
    .requestWindow({
      width: 440,
      height: Math.max(620, availableHeight - 32),
    })
    .catch(() => null);
  return true;
}

export function claimTrainingPipWindow(): Promise<Window | null> | null {
  const current = pendingWindow;
  pendingWindow = null;
  return current;
}
