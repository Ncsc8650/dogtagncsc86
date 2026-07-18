const GOOGLE_SCRIPT_URL = window.NCSC_GOOGLE_SCRIPT_URL || "";
const STORAGE_KEY = "ncsc86-dogtag-orders";

const imagePaths = {
  front: "/assets/images/003-normalized.png",
  back: "/assets/images/B-normalized.png",
};

const form = document.querySelector("#orderForm");
const statusText = document.querySelector("#statusText");
const model = document.querySelector("#tagModel");
const stage = document.querySelector("#tagStage");
const ncscNumber = document.querySelector("#ncscNumber");
const secretCode = document.querySelector("#secretCode");
const ordersBody = document.querySelector("#ordersBody");
const renderCanvas = document.querySelector("#renderCanvas");
const imageDialog = document.querySelector("#imageDialog");

const fields = {
  rankName: document.querySelector("#rankName"),
  surname: document.querySelector("#surname"),
  serviceNumber: document.querySelector("#serviceNumber"),
  ncscNumber,
  bloodGroup: document.querySelector("#bloodGroup"),
  quantity: document.querySelector("#quantity"),
};

let activeSide = "front";
let rotationX = 8;
let rotationY = 0;
let dragState = null;
let remoteOrders = [];
const imageCache = new Map();
const localImageStore = new Map();

init();

function init() {
  compactStoredOrders();
  refreshNcscOptions();
  fields.quantity.value = fields.quantity.value || "1";
  secretCode.value = createSecretCode();
  updatePreview();
  renderOrders();
  loadRemoteOrders();
  if (!GOOGLE_SCRIPT_URL) {
    statusText.textContent = "Google Sheets is not connected yet. Orders are stored on this device only.";
    statusText.classList.add("error");
  }
  bindEvents();

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function bindEvents() {
  Object.entries(fields).forEach(([key, field]) => {
    field.addEventListener("input", () => {
      sanitizeField(key);
      updatePreview();
    });
    field.addEventListener("change", () => {
      sanitizeField(key);
      updatePreview();
    });
  });

  form.addEventListener("submit", saveOrder);
  document.querySelector("#resetButton").addEventListener("click", resetForm);
  document.querySelector("#spinButton").addEventListener("click", () => {
    rotationY += 180;
    setRotation();
  });

  document.querySelectorAll("[data-side]").forEach((button) => {
    button.addEventListener("click", () => setSide(button.dataset.side));
  });

  document.querySelector("#downloadFront").addEventListener("click", async () => {
    downloadDataUrl(await renderDogTag("front"), makeFilename("front"));
  });

  document.querySelector("#downloadBack").addEventListener("click", async () => {
    downloadDataUrl(await renderDogTag("back"), makeFilename("back"));
  });

  document.querySelector("#closeDialog").addEventListener("click", () => imageDialog.close());
  stage.addEventListener("pointerdown", startDrag);
  window.addEventListener("pointermove", dragModel);
  window.addEventListener("pointerup", stopDrag);
}

function sanitizeField(key) {
  const field = fields[key];
  if (!field) return;

  if (key === "rankName" || key === "surname") {
    field.value = field.value.toLocaleUpperCase("en-US").replace(/[^A-Z ]/g, "").replace(/\s{2,}/g, " ");
  }

  if (key === "serviceNumber" || key === "quantity") {
    field.value = field.value.replace(/\D/g, "");
  }
}

function getFormData() {
  return {
    rankName: normalizeName(fields.rankName.value),
    surname: normalizeName(fields.surname.value),
    serviceNumber: fields.serviceNumber.value.replace(/\D/g, ""),
    ncscNumber: Number(fields.ncscNumber.value),
    bloodGroup: fields.bloodGroup.value.toLocaleUpperCase("en-US"),
    quantity: Number(fields.quantity.value),
    secretCode: secretCode.value || createSecretCode(),
  };
}

function normalizeName(value) {
  return String(value || "").toLocaleUpperCase("en-US").replace(/[^A-Z ]/g, "").replace(/\s{2,}/g, " ").trim();
}

function updatePreview() {
  const data = getFormData();
  setPreviewText("rankName", data.rankName || "FIRST NAME");
  setPreviewText("surname", data.surname || "LAST NAME");
  setPreviewText("serviceNumber", data.serviceNumber || "0000000000");
  setPreviewText("ncscNumber", formatNcsc(data.ncscNumber));
  setPreviewText("bloodGroup", `BLOOD GROUP : ${data.bloodGroup || "A"}`);
}

function setPreviewText(key, value) {
  const target = document.querySelector(`[data-preview="${key}"]`);
  target.textContent = value;
}

async function saveOrder(event) {
  event.preventDefault();
  statusText.className = "status-text";

  Object.keys(fields).forEach(sanitizeField);
  const data = getFormData();
  const validation = validateOrder(data);
  if (validation) {
    statusText.textContent = validation;
    statusText.classList.add("error");
    return;
  }

  statusText.textContent = "Generating images...";
  const frontImage = await renderDogTag("front", data);
  const backImage = await renderDogTag("back", data);
  const order = {
    ...data,
    displayName: `${data.rankName} ${data.surname}`.trim(),
    createdAt: new Date().toISOString(),
    frontImage,
    backImage,
  };

  addLocalOrder(order);
  refreshNcscOptions();
  renderOrders();

  if (GOOGLE_SCRIPT_URL) {
    statusText.textContent = "Saving to Google Sheets...";
    await postToGoogleSheet(order);
    await loadRemoteOrders();
    statusText.textContent = "Order saved.";
  } else {
    statusText.textContent = "Not sent to Google Sheets yet. This order is stored on this device only.";
    statusText.className = "status-text error";
  }

  openOrderDialog(order);
  form.reset();
  resetForNextOrder();
}

function validateOrder(data) {
  if (!data.rankName || !data.surname || !data.serviceNumber || !data.ncscNumber || !data.bloodGroup || !data.quantity) {
    return "Please complete all fields before saving.";
  }

  if (data.ncscNumber < 1 || data.ncscNumber > 70) {
    return "NCSC No. must be between 1 and 70.";
  }

  if (!Number.isInteger(data.quantity) || data.quantity < 1) {
    return "Quantity must be a number greater than 0.";
  }

  const duplicate = getKnownOrders().find((order) => Number(order.ncscNumber) === data.ncscNumber);
  if (duplicate) {
    return `NCSC No. ${String(data.ncscNumber).padStart(2, "0")} is already used.`;
  }

  return "";
}

async function renderDogTag(side, overrideData) {
  const data = overrideData || getFormData();
  const img = await loadImage(imagePaths[side]);
  await document.fonts.ready;

  const canvas = renderCanvas;
  const ctx = canvas.getContext("2d");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  if (side === "back") {
    drawEngraving(ctx, canvas, data);
  }

  return canvas.toDataURL("image/png", 0.96);
}

function drawEngraving(ctx, canvas, data) {
  const lines = [
    data.rankName,
    data.surname,
    data.serviceNumber,
    formatNcsc(data.ncscNumber),
    `BLOOD GROUP : ${data.bloodGroup}`,
  ];

  const x = canvas.width * 0.29;
  const startY = canvas.height * 0.335;
  const lineHeight = canvas.height * 0.078;
  const maxWidth = canvas.width * 0.62;
  const baseSize = Math.round(canvas.height * 0.055);

  ctx.fillStyle = "#020202";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  lines.forEach((line, index) => {
    drawFitText(ctx, line.toLocaleUpperCase("en-US"), x, startY + index * lineHeight, maxWidth, baseSize);
  });
}

function drawFitText(ctx, text, x, y, maxWidth, baseSize) {
  let size = baseSize;
  do {
    ctx.font = `800 ${size}px Kanit, sans-serif`;
    size -= 2;
  } while (ctx.measureText(text).width > maxWidth && size > 38);

  ctx.fillText(text, x, y);
}

function loadImage(src) {
  if (imageCache.has(src)) {
    return imageCache.get(src);
  }

  const promise = new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

  imageCache.set(src, promise);
  return promise;
}

async function postToGoogleSheet(order) {
  const body = new FormData();
  Object.entries({
    rankName: order.rankName,
    surname: order.surname,
    serviceNumber: order.serviceNumber,
    ncscNumber: order.ncscNumber,
    bloodGroup: order.bloodGroup,
    quantity: order.quantity,
    secretCode: order.secretCode,
    frontImage: order.frontImage,
    backImage: order.backImage,
  }).forEach(([key, value]) => body.append(key, value));

  await fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    body,
  });
}

async function loadRemoteOrders() {
  if (!GOOGLE_SCRIPT_URL) return;

  try {
    const response = await jsonpRequest({});
    remoteOrders = (response.rows || []).map((row) => ({
      displayName: normalizeDisplayName(row.name),
      rankName: normalizeName(row.firstName),
      surname: normalizeName(row.lastName),
      serviceNumber: String(row.serviceNumber || "").replace(/\D/g, ""),
      ncscNumber: Number(row.ncscNumber),
      bloodGroup: String(row.bloodGroup || "").toLocaleUpperCase("en-US"),
      quantity: Number(row.quantity) || 1,
      secretCode: String(row.secretCode || ""),
      frontImage: row.frontUrl || row.frontImage || "",
      backImage: row.backUrl || row.backImage || "",
      remoteOnly: true,
    }));
    refreshNcscOptions();
    renderOrders();
  } catch {
    remoteOrders = [];
  }
}

function normalizeDisplayName(value) {
  return String(value || "").toLocaleUpperCase("en-US").replace(/[^A-Z ]/g, "").replace(/\s{2,}/g, " ").trim();
}

function setSide(side) {
  activeSide = side;
  rotationY = side === "front" ? 0 : 180;
  setRotation();
  document.querySelectorAll("[data-side]").forEach((button) => {
    button.classList.toggle("active", button.dataset.side === side);
  });
}

function setRotation() {
  model.style.transform = `rotateX(${rotationX}deg) rotateY(${rotationY}deg)`;
}

function startDrag(event) {
  dragState = { x: event.clientX, y: event.clientY, rotationX, rotationY };
  model.classList.add("dragging");
  stage.setPointerCapture(event.pointerId);
}

function dragModel(event) {
  if (!dragState) return;
  const dx = event.clientX - dragState.x;
  const dy = event.clientY - dragState.y;
  rotationY = dragState.rotationY + dx * 0.45;
  rotationX = Math.max(-22, Math.min(22, dragState.rotationX - dy * 0.22));
  setRotation();
}

function stopDrag() {
  dragState = null;
  model.classList.remove("dragging");
}

function resetForm() {
  form.reset();
  resetForNextOrder();
  statusText.textContent = "";
}

function resetForNextOrder() {
  refreshNcscOptions();
  fields.quantity.value = "1";
  secretCode.value = createSecretCode();
  updatePreview();
}

function refreshNcscOptions(preferredValue = ncscNumber.value) {
  const used = getUsedNcscNumbers();
  const preferred = Number(preferredValue);
  ncscNumber.innerHTML = "";

  for (let i = 1; i <= 70; i += 1) {
    if (used.has(i)) continue;
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = String(i).padStart(2, "0");
    ncscNumber.append(option);
  }

  if (!ncscNumber.options.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "All numbers used";
    ncscNumber.append(option);
    ncscNumber.disabled = true;
    return;
  }

  ncscNumber.disabled = false;
  if (preferred && !used.has(preferred)) {
    ncscNumber.value = String(preferred);
  } else {
    ncscNumber.value = getNextNcscNumber();
  }
}

function getNextNcscNumber() {
  const used = getUsedNcscNumbers();
  for (let i = 1; i <= 70; i += 1) {
    if (!used.has(i)) return String(i);
  }
  return "";
}

function getUsedNcscNumbers() {
  return new Set(getKnownOrders().map((order) => Number(order.ncscNumber)).filter(Boolean));
}

function getKnownOrders() {
  const localOrders = getOrders();
  const localKeys = new Set(localOrders.map(getOrderKey));
  return [
    ...localOrders,
    ...remoteOrders.filter((order) => !localKeys.has(getOrderKey(order))),
  ];
}

function formatNcsc(value) {
  if (!value) return "NCSC 86 - --";
  return `NCSC 86 - ${String(value).padStart(2, "0")}`;
}

function createSecretCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const suffix = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  return `N86-${suffix}`;
}

function getOrders() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function addLocalOrder(order) {
  localImageStore.set(order.secretCode, {
    frontImage: order.frontImage,
    backImage: order.backImage,
  });

  const { frontImage, backImage, ...metadata } = order;
  const orders = getOrders();
  orders.unshift(metadata);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders.slice(0, 70)));
}

function compactStoredOrders() {
  const compacted = getOrders().map(({ frontImage, backImage, ...order }) => ({
    ...order,
    rankName: normalizeName(order.rankName),
    surname: normalizeName(order.surname),
    displayName: normalizeDisplayName(order.displayName || `${order.rankName || ""} ${order.surname || ""}`),
    serviceNumber: String(order.serviceNumber || "").replace(/\D/g, ""),
    bloodGroup: String(order.bloodGroup || "").toLocaleUpperCase("en-US"),
    quantity: Number(order.quantity) || 1,
  }));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(compacted.slice(0, 70)));
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function renderOrders() {
  const orders = getKnownOrders().sort((a, b) => Number(a.ncscNumber || 999) - Number(b.ncscNumber || 999));
  ordersBody.innerHTML = "";

  if (!orders.length) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="4">No saved orders yet.</td>';
    ordersBody.append(row);
    return;
  }

  orders.forEach((order) => {
    const row = document.createElement("tr");
    row.className = "order-row";
    row.tabIndex = 0;
    row.innerHTML = `
      <td>${escapeHtml(formatNcsc(order.ncscNumber))}</td>
      <td>${escapeHtml(order.displayName || `${order.rankName || ""} ${order.surname || ""}`.trim())}</td>
      <td><button class="view-button" type="button"><i data-lucide="image"></i><span>View</span></button></td>
      <td>${escapeHtml(order.quantity || 1)}</td>
    `;
    row.addEventListener("click", () => openSavedOrder(order));
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openSavedOrder(order);
      }
    });
    ordersBody.append(row);
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

async function openSavedOrder(order) {
  statusText.className = "status-text";

  const localImages = order.secretCode ? localImageStore.get(order.secretCode) : null;
  const completeOrder = {
    ...order,
    frontImage: order.frontImage || order.frontUrl || localImages?.frontImage,
    backImage: order.backImage || order.backUrl || localImages?.backImage,
  };

  if (!completeOrder.frontImage || !completeOrder.backImage) {
    if (completeOrder.rankName && completeOrder.surname && completeOrder.serviceNumber && completeOrder.ncscNumber) {
      completeOrder.frontImage = await renderDogTag("front", completeOrder);
      completeOrder.backImage = await renderDogTag("back", completeOrder);
    } else if (GOOGLE_SCRIPT_URL && completeOrder.secretCode) {
      try {
        const remote = await jsonpRequest({ code: completeOrder.secretCode });
        if (remote.ok && remote.frontUrl && remote.backUrl) {
          completeOrder.frontImage = remote.frontUrl;
          completeOrder.backImage = remote.backUrl;
        }
      } catch {
        statusText.textContent = "Could not load images from Google Sheets.";
        statusText.className = "status-text error";
        return;
      }
    }
  }

  if (!completeOrder.frontImage || !completeOrder.backImage) {
    statusText.textContent = "Images are not available for this order yet.";
    statusText.className = "status-text error";
    return;
  }

  openOrderDialog(completeOrder);
}

function getOrderKey(order) {
  if (order.secretCode) return String(order.secretCode).toLocaleUpperCase("en-US");
  if (order.ncscNumber) return `NCSC-${Number(order.ncscNumber)}`;
  return `${order.displayName || ""}-${order.createdAt || ""}`;
}

function openOrderDialog(order) {
  const name = order.displayName || `${order.rankName || ""} ${order.surname || ""}`.trim() || "DOG TAG";
  document.querySelector("#dialogName").textContent = `${name} | ${formatNcsc(order.ncscNumber)}`;
  const front = document.querySelector("#dialogFront");
  const back = document.querySelector("#dialogBack");
  front.href = order.frontImage;
  back.href = order.backImage;
  front.querySelector("img").src = order.frontImage;
  back.querySelector("img").src = order.backImage;
  imageDialog.showModal();
}

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

function makeFilename(side) {
  const data = getFormData();
  const no = String(data.ncscNumber || 1).padStart(2, "0");
  return `ncsc86-${no}-${side}.png`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return entities[char];
  });
}

function jsonpRequest(params) {
  return new Promise((resolve, reject) => {
    const callbackName = `ncsc86_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const url = new URL(GOOGLE_SCRIPT_URL);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    url.searchParams.set("callback", callbackName);

    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("JSONP timeout"));
    }, 12000);

    window[callbackName] = (data) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("JSONP failed"));
    };

    function cleanup() {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    }

    script.src = url.toString();
    document.head.append(script);
  });
}
