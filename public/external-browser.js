(function () {
  const userAgent = navigator.userAgent || "";
  const isLineBrowser = /Line\//i.test(userAgent);

  if (!isLineBrowser) return;

  const externalUrl = new URL(window.location.href);
  externalUrl.searchParams.set("openExternalBrowser", "1");

  const externalHref = externalUrl.toString();
  const lockId = "lineBrowserLock";
  const redirectKey = `ncsc86-line-external:${externalUrl.origin}${externalUrl.pathname}`;
  const alreadyTried = getRedirectFlag();
  const hasExternalFlag = new URL(window.location.href).searchParams.get("openExternalBrowser") === "1";

  function getRedirectFlag() {
    try {
      return sessionStorage.getItem(redirectKey) === "1";
    } catch {
      return false;
    }
  }

  function setRedirectFlag() {
    try {
      sessionStorage.setItem(redirectKey, "1");
    } catch {
      // Ignore blocked storage. The URL flag still prevents a redirect loop.
    }
  }

  function getAndroidIntentUrl(url) {
    const parsed = new URL(url);
    const path = `${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`;
    return `intent://${path}#Intent;scheme=${parsed.protocol.replace(":", "")};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
  }

  function openExternalBrowser() {
    setRedirectFlag();

    if (/Android/i.test(userAgent)) {
      window.location.href = getAndroidIntentUrl(externalHref);
      return;
    }

    window.location.href = externalHref;
  }

  function showLineLock() {
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", showLineLock, { once: true });
      return;
    }

    if (document.getElementById(lockId)) return;

    const panel = document.createElement("div");
    panel.id = lockId;
    panel.innerHTML = `
      <div class="line-browser-lock__panel" role="dialog" aria-modal="true" aria-labelledby="lineBrowserTitle">
        <strong id="lineBrowserTitle">Open in Chrome / Safari</strong>
        <p>This order form cannot be used inside the LINE browser.</p>
        <button type="button" data-open-external>Open Browser</button>
        <button type="button" data-copy-link>Copy Link</button>
        <small data-copy-status></small>
      </div>
    `;

    const style = document.createElement("style");
    style.textContent = `
      #${lockId} {
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: grid;
        place-items: center;
        padding: 22px;
        font-family: Kanit, system-ui, sans-serif;
        color: #f6f3ea;
        background: rgba(4, 6, 5, 0.9);
        backdrop-filter: blur(10px);
      }
      #${lockId} .line-browser-lock__panel {
        width: min(420px, 100%);
        padding: 24px;
        border: 1px solid rgba(235, 232, 210, 0.18);
        border-radius: 8px;
        background: #10130f;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
      }
      #${lockId} strong {
        display: block;
        margin-bottom: 8px;
        font-size: 28px;
        font-weight: 800;
      }
      #${lockId} p {
        margin: 0 0 18px;
        color: #b7b9ad;
        font-size: 16px;
        line-height: 1.45;
      }
      #${lockId} button {
        width: 100%;
        min-height: 48px;
        margin-top: 10px;
        border: 1px solid rgba(235, 232, 210, 0.18);
        border-radius: 6px;
        color: #10130f;
        background: linear-gradient(135deg, #d9ad57, #cfd46e);
        font: 800 16px Kanit, system-ui, sans-serif;
      }
      #${lockId} button + button {
        color: #f6f3ea;
        background: rgba(255, 255, 255, 0.08);
      }
      #${lockId} small {
        display: block;
        min-height: 20px;
        margin-top: 12px;
        color: #d9ad57;
        font-size: 13px;
      }
    `;

    (document.head || document.documentElement).append(style);
    document.body.append(panel);

    panel.querySelector("[data-open-external]").addEventListener("click", openExternalBrowser);
    panel.querySelector("[data-copy-link]").addEventListener("click", async () => {
      const status = panel.querySelector("[data-copy-status]");
      try {
        await navigator.clipboard.writeText(externalHref);
        status.textContent = "Link copied.";
      } catch {
        status.textContent = externalHref;
      }
    });
  }

  if (!hasExternalFlag && !alreadyTried) {
    setTimeout(showLineLock, 1200);
    openExternalBrowser();
    return;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showLineLock, { once: true });
  } else {
    showLineLock();
  }
})();
