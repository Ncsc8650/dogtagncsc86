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

    const quantity = Number(payload.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error("Quantity must be a number greater than 0.");
    }

    const firstName = cleanName_(payload.rankName);
    const lastName = cleanName_(payload.surname);
    const militaryId = cleanDigits_(payload.serviceNumber);
    const bloodGroup = String(payload.bloodGroup || "").toUpperCase();
    const secret = String(payload.secretCode || "").toUpperCase();

    const folder = getOrCreateFolder_();
    const filenameBase = `NCSC86-${String(ncscNumber).padStart(2, "0")}-${secret}`;
    const frontUrl = saveImage_(folder, `${filenameBase}-front.png`, payload.frontImage);
    const backUrl = saveImage_(folder, `${filenameBase}-back.png`, payload.backImage);
    const downloadLinks = `Front: ${frontUrl}\nBack: ${backUrl}`;

    sheet.appendRow([
      new Date(),
      firstName,
      lastName,
      militaryId,
      ncscNumber,
      bloodGroup,
      quantity,
      secret,
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
    const row = values.find((item) => String(item[7]).toUpperCase() === code);
    const result = row
      ? {
          ok: true,
          name: `${row[1]} ${row[2]}`.trim(),
          firstName: row[1],
          lastName: row[2],
          serviceNumber: row[3],
          ncscNumber: row[4],
          bloodGroup: row[5],
          quantity: row[6],
          secretCode: row[7],
          frontUrl: row[8],
          backUrl: row[9],
        }
      : { ok: false, error: "Secret code not found" };

    return output_(e, result);
  }

  const rows = values
    .filter((row) => row[1] && row[4])
    .map((row) => ({
      name: `${row[1]} ${row[2]}`.trim(),
      firstName: row[1],
      lastName: row[2],
      serviceNumber: row[3],
      ncscNumber: row[4],
      bloodGroup: row[5],
      quantity: row[6],
      secretCode: row[7],
      frontUrl: row[8],
      backUrl: row[9],
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
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.getSheets()[0];
}

function ensureHeader_(sheet) {
  const headers = [
    "CREATED AT",
    "FIRST NAME",
    "LAST NAME",
    "MILITARY ID",
    "NCSC NO.",
    "BLOOD GROUP",
    "QUANTITY",
    "SECRET CODE",
    "FRONT IMAGE LINK",
    "BACK IMAGE LINK",
    "DOWNLOAD LINKS",
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

function cleanName_(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z ]/g, "").replace(/\s{2,}/g, " ").trim();
}

function cleanDigits_(value) {
  return String(value || "").replace(/\D/g, "");
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
