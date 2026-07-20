(function () {
  if (window.__wwNavigationBootstrapped) return;
  window.__wwNavigationBootstrapped = true;

  let navigating = false;

  const PROJECT_ROOTS = [
    "wanderwonder18.06",
    "260625_wanderwonder",
    "wanderwonder",
  ];

  function pageKey(url) {
    const u = new URL(url, location.href);
    const parts = u.pathname.split("/").filter(Boolean);
    let start = 0;

    for (const root of PROJECT_ROOTS) {
      const rootIndex = parts.lastIndexOf(root);
      if (rootIndex >= 0) {
        start = rootIndex + 1;
        break;
      }
    }

    return parts.slice(start).join("/") || "index.html";
  }

  function jsPrefix(url) {
    const key = pageKey(url);
    const depth = key.includes("/") ? key.split("/").length - 1 : 0;
    return depth ? "../".repeat(depth) : "";
  }

  function preloadSiteFont() {
    if (document.querySelector("link[data-ww-font-preload]")) return;

    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "font";
    link.type = "font/ttf";
    link.crossOrigin = "anonymous";
    link.href = new URL(
      `${jsPrefix(location.href)}assets/Arial Narrow.ttf`,
      location.href
    ).href;
    link.dataset.wwFontPreload = "true";
    document.head.appendChild(link);
  }

  preloadSiteFont();

  function isInternal(url) {
    try {
      const target = new URL(url, location.href);
      return (
        target.origin === location.origin &&
        !target.pathname.match(/\.(pdf|zip|docx)$/i)
      );
    } catch (_) {
      return false;
    }
  }

  function shouldNavigate(link) {
    if (!link || link.target === "_blank" || link.hasAttribute("download")) {
      return false;
    }
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:")) {
      return false;
    }
    return isInternal(href);
  }

  function isRoutesHref(href) {
    return Boolean(href && href.includes("routes.html"));
  }

  function storeRoutesBackdrop() {
    if (!document.body.classList.contains("page-routes")) {
      sessionStorage.setItem("ww-routes-backdrop", pageKey(location.href));
    }
  }

  function cleanupPage() {
    if (typeof window.__wwDotsCleanup === "function") {
      window.__wwDotsCleanup();
      window.__wwDotsCleanup = null;
    }
    document
      .querySelectorAll('script[data-ww-page="true"]')
      .forEach((node) => node.remove());
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `${src}${src.includes("?") ? "&" : "?"}ww=${Date.now()}`;
      script.dataset.wwPage = "true";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(script);
    });
  }

  function pageScripts(body, pageUrl) {
    const prefix = `${jsPrefix(pageUrl)}js/`;
    const scripts = [];

    if (body.classList.contains("page-home") || body.classList.contains("page-about")) {
      scripts.push(`${prefix}dots.js`);
    }
    if (body.classList.contains("page-overview")) {
      scripts.push(`${prefix}overview-click.js`);
    }
    if (body.querySelector(".gallery-scroll")) {
      scripts.push(`${prefix}gallery.js`);
    }
    if (body.querySelector(".col-center-scroll")) {
      scripts.push(`${prefix}scroll-fade.js`);
    }

    return scripts.map((path) => new URL(path, pageUrl).href);
  }

  async function initPage(doc, pageUrl) {
    if (typeof window.__wwInitRoutesBackdrop === "function") {
      window.__wwInitRoutesBackdrop();
    }
    if (typeof window.__wwInitPageArrows === "function") {
      window.__wwInitPageArrows();
    }
    if (typeof window.__wwSyncRouteIntroWidths === "function") {
      window.__wwSyncRouteIntroWidths();
    }

    for (const src of pageScripts(doc.body, pageUrl)) {
      await loadScript(src);
    }
  }

  function isPersistentNode(node, canvas, savedHeader) {
    if (node === canvas || node === savedHeader) return true;
    if (node.tagName !== "SCRIPT") return false;

    const src = node.getAttribute("src") || "";
    return (
      src.includes("cursor-draw.js") ||
      src.includes("navigation.js") ||
      src.includes("routes.js")
    );
  }

  async function swapPage(doc, pageUrl, push) {
    cleanupPage();

    const currentHeader = document.querySelector(".page .col-left-header");
    const nextHeader = doc.querySelector(".page .col-left-header");
    const preserveHeader =
      currentHeader &&
      nextHeader &&
      currentHeader.textContent.trim() === nextHeader.textContent.trim();

    let savedHeader = null;
    if (preserveHeader) {
      savedHeader = currentHeader;
      savedHeader.remove();
    }

    document.title = doc.title;
    document.body.className = doc.body.className;

    const canvas = document.getElementById("draw-canvas");
    [...document.body.children].forEach((node) => {
      if (isPersistentNode(node, canvas, savedHeader)) return;
      node.remove();
    });

    let headerInserted = false;
    [...doc.body.children].forEach((node) => {
      if (node.tagName === "SCRIPT" || node.id === "draw-canvas") return;

      const imported = document.importNode(node, true);
      if (!headerInserted && savedHeader && imported.querySelector?.(".col-left-header")) {
        imported.querySelector(".col-left-header")?.replaceWith(savedHeader);
        headerInserted = true;
      }
      document.body.appendChild(imported);
    });

    if (push) {
      history.pushState({ wwUrl: pageUrl }, "", pageUrl);
    }

    await initPage(doc, pageUrl);
  }

  async function navigateTo(href, push = true) {
    if (navigating) return;

    const url = new URL(href, location.href).href;
    if (url === location.href) return;

    navigating = true;

    try {
      const response = await fetch(url, { credentials: "same-origin" });
      if (!response.ok) throw new Error("Navigation fetch failed");

      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      await swapPage(doc, url, push);
    } catch (_) {
      location.href = href;
    } finally {
      navigating = false;
    }
  }

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) {
      return;
    }

    const dot = event.target.closest(".dot--trigger[data-href]");
    if (dot) {
      event.preventDefault();
      navigateTo(dot.dataset.href);
      return;
    }

    const link = event.target.closest("a[href]");
    if (!shouldNavigate(link)) return;

    event.preventDefault();
    const href = link.getAttribute("href");
    if (isRoutesHref(href)) storeRoutesBackdrop();
    navigateTo(href);
  });

  window.addEventListener("popstate", (event) => {
    if (event.state?.wwUrl) {
      navigateTo(event.state.wwUrl, false);
    }
  });

  history.replaceState({ wwUrl: location.href }, "", location.href);
})();
