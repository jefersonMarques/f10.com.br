const baseUrlValue = process.env.OPERATIONS_BASE_URL?.trim();
const email = process.env.OPERATIONS_SMOKE_EMAIL?.trim();
const password = process.env.OPERATIONS_SMOKE_PASSWORD ?? "";
const maxPagesValue = Number(process.env.OPERATIONS_SMOKE_MAX_PAGES ?? "100");

if (!baseUrlValue) {
  throw new Error("OPERATIONS_BASE_URL is required.");
}

if (!email || !password) {
  throw new Error(
    "OPERATIONS_SMOKE_EMAIL and OPERATIONS_SMOKE_PASSWORD are required.",
  );
}

if (!Number.isInteger(maxPagesValue) || maxPagesValue < 1 || maxPagesValue > 250) {
  throw new Error("OPERATIONS_SMOKE_MAX_PAGES must be an integer from 1 to 250.");
}

const baseUrl = new URL(baseUrlValue);
const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(
  baseUrl.hostname,
);

if (baseUrl.protocol !== "https:" && !isLocalHost) {
  throw new Error("OPERATIONS_BASE_URL must use HTTPS outside localhost.");
}

const protectedRoutes = [
  "/app",
  "/app/help",
  "/app/help/flows",
  "/app/team",
  "/app/tasks",
  "/app/tickets",
  "/app/chat",
];

function absoluteUrl(pathname) {
  return new URL(pathname, baseUrl).toString();
}

function assertStatus(response, acceptedStatuses, label) {
  if (!acceptedStatuses.includes(response.status)) {
    throw new Error(
      `${label} returned HTTP ${response.status}; expected ${acceptedStatuses.join(" or ")}.`,
    );
  }
}

function extractSessionCookie(response) {
  const setCookie = response.headers.get("set-cookie") ?? "";
  const sessionCookie = setCookie
    .split(/,(?=[^;]+=[^;]+)/)
    .map((value) => value.trim())
    .find((value) => value.startsWith("f10_operations_session="));

  if (!sessionCookie) return "";
  return sessionCookie.split(";", 1)[0];
}

function extractOperationsLinks(html) {
  const routes = new Set();
  const hrefPattern = /\bhref\s*=\s*["']([^"']+)["']/gi;

  for (const match of html.matchAll(hrefPattern)) {
    const href = match[1]?.trim();
    if (!href || href.startsWith("#")) continue;

    let url;

    try {
      url = new URL(href, baseUrl);
    } catch {
      continue;
    }

    if (url.origin !== baseUrl.origin) continue;
    if (!url.pathname.startsWith("/app")) continue;
    if (url.pathname === "/app/logout") continue;

    routes.add(`${url.pathname}${url.search}`);
  }

  return routes;
}

async function fetchAuthenticatedPage(route, sessionCookie) {
  const response = await fetch(absoluteUrl(route), {
    redirect: "manual",
    headers: {
      Accept: "text/html",
      Cookie: sessionCookie,
      "User-Agent": "F10-Operations-Smoke/1.0",
    },
  });

  assertStatus(response, [200], route);

  const contentType = response.headers.get("content-type") ?? "";
  const html = contentType.includes("text/html") ? await response.text() : "";

  return {
    html,
    links: extractOperationsLinks(html),
  };
}

async function verifyUnauthenticatedProtection() {
  const response = await fetch(absoluteUrl("/app"), {
    redirect: "manual",
    headers: { "User-Agent": "F10-Operations-Smoke/1.0" },
  });

  assertStatus(response, [303, 307, 308], "Unauthenticated /app");

  const location = response.headers.get("location") ?? "";
  if (!location.includes("/login")) {
    throw new Error(
      `Unauthenticated /app did not redirect to login. location=${location || "none"}`,
    );
  }

  process.stdout.write("[OK] unauthenticated /app protection\n");
}

async function login() {
  const formData = new URLSearchParams({
    email,
    password,
    returnTo: "/app",
  });
  const response = await fetch(absoluteUrl("/login"), {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "F10-Operations-Smoke/1.0",
    },
    body: formData,
  });

  assertStatus(response, [303], "Operations login");

  const sessionCookie = extractSessionCookie(response);
  if (!sessionCookie) {
    throw new Error("Operations login did not return a session cookie.");
  }

  process.stdout.write("[OK] authenticated session created\n");
  return sessionCookie;
}

async function verifyProtectedRoutes(sessionCookie) {
  const discoveredRoutes = new Set();

  for (const route of protectedRoutes) {
    const page = await fetchAuthenticatedPage(route, sessionCookie);
    process.stdout.write(`[OK] ${route}\n`);

    for (const link of page.links) {
      discoveredRoutes.add(link);
    }
  }

  return discoveredRoutes;
}

async function crawlOperationsPages(sessionCookie, initialRoutes) {
  const visited = new Set(protectedRoutes);
  const queued = new Set(initialRoutes);
  const queue = [...initialRoutes];
  let crawled = 0;

  while (queue.length > 0 && visited.size < maxPagesValue) {
    const route = queue.shift();
    if (!route || visited.has(route)) continue;

    visited.add(route);
    const page = await fetchAuthenticatedPage(route, sessionCookie);
    crawled += 1;
    process.stdout.write(`[OK] crawl ${route}\n`);

    for (const link of page.links) {
      if (visited.has(link) || queued.has(link)) continue;
      queued.add(link);
      queue.push(link);
    }
  }

  if (queue.length > 0) {
    process.stdout.write(
      `[WARN] authenticated crawl stopped at ${maxPagesValue} pages; ${queue.length} route(s) remain queued\n`,
    );
  } else {
    process.stdout.write(
      `[OK] authenticated crawl completed: ${visited.size} unique Operations page(s), ${crawled} discovered detail page(s)\n`,
    );
  }
}

async function logout(sessionCookie) {
  const response = await fetch(absoluteUrl("/app/logout"), {
    method: "POST",
    redirect: "manual",
    headers: {
      Cookie: sessionCookie,
      "User-Agent": "F10-Operations-Smoke/1.0",
    },
  });

  assertStatus(response, [303], "Operations logout");
  process.stdout.write("[OK] session revoked by logout\n");
}

await verifyUnauthenticatedProtection();
const sessionCookie = await login();

try {
  const discoveredRoutes = await verifyProtectedRoutes(sessionCookie);
  await crawlOperationsPages(sessionCookie, discoveredRoutes);
} finally {
  await logout(sessionCookie);
}

process.stdout.write("Operations HTTP smoke test passed.\n");
