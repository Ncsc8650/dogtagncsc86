const GOOGLE_SCRIPT_URL = window.NCSC_GOOGLE_SCRIPT_URL || "";
const STORAGE_KEY = "ncsc86-dogtag-orders";

const imagePaths = {
  front: "/assets/images/003.png",
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
const lookupCode = document.querySelector("#lookupCode");

const fields = {
  rankName: document.querySelector("#rankName"),
  surname: document.querySelector("#surname"),
  serviceNumber: document.querySelector("#serviceNumber"),
  ncscNumber,
  bloodGroup: document.querySelector("#bloodGroup"),
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
  for (let i = 1; i <= 70; i += 1) {
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = String(i).padStart(2, "0");
    ncscNumber.append(option);
  }

  compactStoredOrders();
  ncscNumber.value = getNextNcscNumber();
  secretCode.value = createSecretCode();
  updatePreview();
  renderOrders();
  loadRemoteOrders();
  if (!GOOGLE_SCRIPT_URL) {
    statusText.textContent = "ยังไม่ได้เชื่อม Google Sheets: ตอนนี้ข้อมูลจะอยู่เฉพาะในเครื่องนี้";
    statusText.classList.add("error");
  }
  bindEvents();

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function bindEvents() {
  Object.values(fields).forEach((field) => {
    field.addEventListener("input", updatePreview);
    field.addEventListener("change", updatePreview);
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

  document.querySelector("#lookupButton").addEventListener("click", openBySecretCode);
  lookupCode.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      openBySecretCode();
    }
  });

  document.querySelector("#closeDialog").addEventListener("click", () => imageDialog.close());
  stage.addEventListener("pointerdown", startDrag);
  window.addEventListener("pointermove", dragModel);
  window.addEventListener("pointerup", stopDrag);
}

function getFormData() {
  return {
    rankName: fields.rankName.value.trim(),
    surname: fields.surname.value.trim(),
    serviceNumber: fields.serviceNumber.value.trim(),
    ncscNumber: Number(fields.ncscNumber.value),
    bloodGroup: fields.bloodGroup.value,
    secretCode: secretCode.value || createSecretCode(),
  };
}

function updatePreview() {
  const data = getFormData();
  setPreviewText("rankName", data.rankName || "ชื่อ");
  setPreviewText("surname", data.surname || "นามสกุล");
  setPreviewText("serviceNumber", data.serviceNumber || "0000000000");
  setPreviewText("ncscNumber", formatNcsc(data.ncscNumber));
  setPreviewText("bloodGroup", `Blood group: ${data.bloodGroup}`);
}

function setPreviewText(key, value) {
  const target = document.querySelector(`[data-preview="${key}"]`);
  target.textContent = value;
}

async function saveOrder(event) {
  event.preventDefault();
  statusText.className = "status-text";

  const data = getFormData();
  const validation = validateOrder(data);
  if (validation) {
    statusText.textContent = validation;
    statusText.classList.add("error");
    return;
  }

  statusText.textContent = "กำลังสร้างภาพ...";
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
  renderOrders();

  if (GOOGLE_SCRIPT_URL) {
    statusText.textContent = "กำลังบันทึกลง Google Sheets...";
    await postToGoogleSheet(order);
    await loadRemoteOrders();
    statusText.textContent = `บันทึกแล้ว รหัสลับ ${order.secretCode}`;
  } else {
    statusText.textContent = `ยังไม่เข้า Google Sheets: บันทึกเฉพาะในเครื่องนี้ รหัสลับ ${order.secretCode}`;
    statusText.className = "status-text error";
  }

  openOrderDialog(order);
  form.reset();
  resetForNextOrder();
}

function validateOrder(data) {
  if (!data.rankName || !data.surname || !data.serviceNumber || !data.ncscNumber || !data.bloodGroup) {
    return "กรอกข้อมูลให้ครบทั้ง 5 รายการก่อนบันทึก";
  }

  if (data.ncscNumber < 1 || data.ncscNumber > 70) {
    return "NCSC NO. ต้องอยู่ระหว่าง 1 ถึง 70";
  }

  const duplicate = getOrders().find((order) => Number(order.ncscNumber) === data.ncscNumber);
  if (duplicate) {
    return `NCSC NO. ${String(data.ncscNumber).padStart(2, "0")} ถูกใช้ในเครื่องนี้แล้ว`;
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
    `Blood group: ${data.bloodGroup}`,
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
    drawFitText(ctx, line.toLocaleUpperCase("th-TH"), x, startY + index * lineHeight, maxWidth, baseSize);
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
      displayName: row.name,
      secretCode: row.secretCode,
      remoteOnly: true,
    }));
    renderOrders();
  } catch {
    remoteOrders = [];
  }
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
  ncscNumber.value = getNextNcscNumber();
  secretCode.value = createSecretCode();
  updatePreview();
}

function getNextNcscNumber() {
  const used = new Set(getOrders().map((order) => Number(order.ncscNumber)));
  for (let i = 1; i <= 70; i += 1) {
    if (!used.has(i)) return String(i);
  }
  return "1";
}

function formatNcsc(value) {
  return `NCSC 86 - ${String(value || 1).padStart(2, "0")}`;
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
  const compacted = getOrders().map(({ frontImage, backImage, ...order }) => order);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(compacted.slice(0, 70)));
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function renderOrders() {
  const localOrders = getOrders();
  const localCodes = new Set(localOrders.map((order) => order.secretCode));
  const orders = [
    ...localOrders,
    ...remoteOrders.filter((order) => !localCodes.has(order.secretCode)),
  ];
  ordersBody.innerHTML = "";

  if (!orders.length) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="2">ยังไม่มีรายการ</td>';
    ordersBody.append(row);
    return;
  }

  orders.forEach((order) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${escapeHtml(order.displayName)}</td><td>${escapeHtml(order.secretCode)}</td>`;
    row.addEventListener("click", () => {
      lookupCode.value = order.secretCode;
      openBySecretCode();
    });
    ordersBody.append(row);
  });
}

async function openBySecretCode() {
  const code = lookupCode.value.trim().toLocaleUpperCase("en-US");
  const order = getOrders().find((item) => item.secretCode.toLocaleUpperCase("en-US") === code);

  if (order) {
    const images = localImageStore.get(order.secretCode);
    if (images) {
      openOrderDialog({ ...order, ...images });
      return;
    }
  }

  if (GOOGLE_SCRIPT_URL && code) {
    try {
      const remote = await jsonpRequest({ code });
      if (remote.ok && remote.frontUrl && remote.backUrl) {
        openOrderDialog({
          displayName: remote.name,
          secretCode: remote.secretCode,
          frontImage: remote.frontUrl,
          backImage: remote.backUrl,
        });
        return;
      }
    } catch {
      statusText.textContent = "อ่านข้อมูลจาก Google Sheets ไม่สำเร็จ";
      statusText.className = "status-text error";
      return;
    }
  }

  statusText.textContent = "ไม่พบรหัสลับนี้";
  statusText.className = "status-text error";
}

function openOrderDialog(order) {
  document.querySelector("#dialogName").textContent = `${order.displayName} | ${order.secretCode}`;
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
