const SPREADSHEET_ID = "1bEdeom9G5LzamOw0Jm11Ko9ZwbUDggfJkWy5Ehql9Yg";
const SHEET_NAME = "ชีต1";
const FOLDER_NAME = "NCSC86 Dog Tag Images";

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const payload = e.parameter || {};
    const sheet = getSheet_();
    ensureHeader_(sheet);

    const ncscNumber = Number(payload.ncscNumber);
    if (ncscNumber < 1 || ncscNumber > 70) {
      throw new Error("NCSC NO. must be 1-70");
    }

    if (isNcscNumberUsed_(sheet, ncscNumber)) {
      throw new Error("Duplicate NCSC NO.");
    }

    const folder = getOrCreateFolder_();
    const filenameBase = `NCSC86-${String(ncscNumber).padStart(2, "0")}-${payload.secretCode}`;
    const frontUrl = saveImage_(folder, `${filenameBase}-front.png`, payload.frontImage);
    const backUrl = saveImage_(folder, `${filenameBase}-back.png`, payload.backImage);
    const downloadLinks = `Front: ${frontUrl}\nBack: ${backUrl}`;

    sheet.appendRow([
      new Date(),
      payload.rankName,
      payload.surname,
      payload.serviceNumber,
      ncscNumber,
      payload.bloodGroup,
      payload.secretCode,
      frontUrl,
      backUrl,
      downloadLinks,
    ]);

    return json_({ ok: true, frontUrl, backUrl });
  } catch (error) {
    return json_({ ok: false, error: error.message });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  const sheet = getSheet_();
  ensureHeader_(sheet);
  const values = sheet.getDataRange().getValues().slice(1);

  if (e.parameter.code) {
    const code = String(e.parameter.code).toUpperCase();
    const row = values.find((item) => String(item[6]).toUpperCase() === code);
    const result = row
      ? {
          ok: true,
          name: `${row[1]} ${row[2]}`.trim(),
          secretCode: row[6],
          frontUrl: row[7],
          backUrl: row[8],
        }
      : { ok: false, error: "Secret code not found" };

    return output_(e, result);
  }

  const rows = values
    .filter((row) => row[1] && row[6])
    .map((row) => ({
      name: `${row[1]} ${row[2]}`.trim(),
      secretCode: row[6],
    }));

  return output_(e, { ok: true, rows });
}

function output_(e, data) {
  const callback = e.parameter && e.parameter.callback;
  if (callback) {
    return ContentService
      .createTextOutput(`${callback}(${JSON.stringify(data)})`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return json_(data);
}

function getSheet_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
}

function ensureHeader_(sheet) {
  const headers = [
    "วันที่บันทึก",
    "ยศ-ชื่อ",
    "นามสกุล",
    "เลขอัตราข้าราชการ",
    "NCSC NO.",
    "หมู่เลือด",
    "รหัสลับ",
    "ลิงก์ภาพด้านหน้า",
    "ลิงก์ภาพด้านหลัง",
    "ลิงก์ดาวน์โหลดภาพ",
  ];

  if (sheet.getLastRow() === 0 || sheet.getRange(1, 1).getValue() !== headers[0]) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
}

function isNcscNumberUsed_(sheet, ncscNumber) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  const values = sheet.getRange(2, 5, lastRow - 1, 1).getValues().flat();
  return values.some((value) => Number(value) === Number(ncscNumber));
}

function getOrCreateFolder_() {
  const folders = DriveApp.getFoldersByName(FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(FOLDER_NAME);
}

function saveImage_(folder, filename, dataUrl) {
  const parts = String(dataUrl || "").match(/^data:image\/png;base64,(.+)$/);
  if (!parts) throw new Error(`Invalid image data for ${filename}`);

  const blob = Utilities.newBlob(Utilities.base64Decode(parts[1]), "image/png", filename);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getDownloadUrl();
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
