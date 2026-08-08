const googleTagManagerId = "GTM-KCD6KHP2";
const metaPixelId = "715834075272190";
const fallbackDelayMs = 15_000;

type FacebookPixelFunction = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  loaded: boolean;
  push: FacebookPixelFunction;
  queue: unknown[][];
  version: string;
};

type AnalyticsWindow = Window & {
  _fbq?: FacebookPixelFunction;
  dataLayer?: Array<Record<string, unknown>>;
  fbq?: FacebookPixelFunction;
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions,
  ) => number;
};

let isInitialized = false;
let isLoading = false;

function createFacebookPixelQueue(): FacebookPixelFunction {
  const queue = ((...args: unknown[]) => {
    if (queue.callMethod) {
      queue.callMethod(...args);
      return;
    }

    queue.queue.push(args);
  }) as FacebookPixelFunction;

  queue.loaded = true;
  queue.push = queue;
  queue.queue = [];
  queue.version = "2.0";

  return queue;
}

function initializeGoogleTagManagerQueue(analyticsWindow: AnalyticsWindow): void {
  analyticsWindow.dataLayer ??= [];
  analyticsWindow.dataLayer.push({
    "gtm.start": Date.now(),
    event: "gtm.js",
  });
}

function initializeFacebookPixelQueue(analyticsWindow: AnalyticsWindow): void {
  if (analyticsWindow.fbq) return;

  const facebookPixelQueue = createFacebookPixelQueue();
  analyticsWindow.fbq = facebookPixelQueue;
  analyticsWindow._fbq = facebookPixelQueue;
  facebookPixelQueue("init", metaPixelId);
}

function appendAnalyticsScript(provider: string, source: string): void {
  if (document.querySelector(`script[data-analytics-provider="${provider}"]`)) {
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.dataset.analyticsProvider = provider;
  script.src = source;
  document.head.appendChild(script);
}

function loadAnalyticsScripts(): void {
  if (isLoading) return;
  isLoading = true;

  appendAnalyticsScript(
    "google-tag-manager",
    `https://www.googletagmanager.com/gtm.js?id=${googleTagManagerId}`,
  );
  appendAnalyticsScript(
    "meta-pixel",
    "https://connect.facebook.net/en_US/fbevents.js",
  );
}

function loadAnalyticsWhenIdle(): void {
  const analyticsWindow = window as AnalyticsWindow;

  if (analyticsWindow.requestIdleCallback) {
    analyticsWindow.requestIdleCallback(loadAnalyticsScripts, { timeout: 1_500 });
    return;
  }

  window.setTimeout(loadAnalyticsScripts, 0);
}

function registerAnalyticsTriggers(): () => void {
  let timeoutId: number | undefined;
  let hasTriggered = false;

  function removeInteractionListeners(): void {
    document.removeEventListener("pointerdown", triggerAnalyticsLoad, true);
    document.removeEventListener("keydown", triggerAnalyticsLoad, true);
    window.removeEventListener("scroll", triggerAnalyticsLoad);
  }

  function triggerAnalyticsLoad(): void {
    if (hasTriggered) return;
    hasTriggered = true;
    removeInteractionListeners();
    window.removeEventListener("load", scheduleFallback);
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    loadAnalyticsWhenIdle();
  }

  function scheduleFallback(): void {
    timeoutId = window.setTimeout(triggerAnalyticsLoad, fallbackDelayMs);
  }

  document.addEventListener("pointerdown", triggerAnalyticsLoad, {
    capture: true,
    passive: true,
  });
  document.addEventListener("keydown", triggerAnalyticsLoad, {
    capture: true,
  });
  window.addEventListener("scroll", triggerAnalyticsLoad, {
    passive: true,
  });

  if (document.readyState === "complete") {
    scheduleFallback();
  } else {
    window.addEventListener("load", scheduleFallback, { once: true });
  }

  return () => {
    removeInteractionListeners();
    window.removeEventListener("load", scheduleFallback);
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  };
}

export function initializeAnalytics(): () => void {
  if (isInitialized) return () => {};
  isInitialized = true;

  const analyticsWindow = window as AnalyticsWindow;
  initializeGoogleTagManagerQueue(analyticsWindow);
  initializeFacebookPixelQueue(analyticsWindow);

  return registerAnalyticsTriggers();
}

export function trackFacebookPageView(): void {
  const analyticsWindow = window as AnalyticsWindow;
  analyticsWindow.fbq?.("track", "PageView");
}
