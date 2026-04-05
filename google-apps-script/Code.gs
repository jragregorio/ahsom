const SHEET_NAME = "Orders";
const ORDER_PREFIX = "AHSOM";
const HEADERS = [
  "Order ID",
  "Timestamp",
  "Status",
  "Customer Name",
  "Mobile Number",
  "Fulfillment Type",
  "Address Or Meetup Note",
  "Additional Notes",
  "Items Summary",
  "Items JSON",
  "Total Items",
  "Subtotal",
  "Currency",
  "Submitted At ISO"
];

function doPost(e) {
  try {
    const payload = JSON.parse((e.postData && e.postData.contents) || "{}");
    const sheet = getOrdersSheet_();
    const orderId = getNextOrderId_(sheet);

    sheet.appendRow([
      orderId,
      new Date(),
      payload.status || "New",
      payload.customerName || "",
      payload.customerPhone || "",
      payload.fulfillmentType || "",
      payload.customerAddress || "",
      payload.customerNotes || "",
      payload.itemsSummary || "",
      JSON.stringify(payload.items || []),
      payload.totalItems || 0,
      payload.subtotal || 0,
      payload.currency || "PHP",
      payload.submittedAt || ""
    ]);

    return jsonResponse_({
      ok: true,
      message: "Order saved."
    });
  } catch (error) {
    return jsonResponse_({
      ok: false,
      message: error.message
    });
  }
}

function doGet() {
  return jsonResponse_({
    ok: true,
    message: "Orders endpoint is running."
  });
}

function getOrdersSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  return sheet;
}

function ensureSheetStructure_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    return;
  }

  const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  if (currentHeaders[0] !== HEADERS[0]) {
    sheet.insertColumnBefore(1);
    backfillOrderIds_(sheet);
  }

  if (sheet.getLastColumn() < HEADERS.length) {
    sheet.insertColumnsAfter(sheet.getLastColumn(), HEADERS.length - sheet.getLastColumn());
  }

  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
}

function backfillOrderIds_(sheet) {
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return;
  }

  const idRange = sheet.getRange(2, 1, lastRow - 1, 1);
  const idValues = idRange.getValues();

  for (let index = 0; index < idValues.length; index += 1) {
    if (!idValues[index][0]) {
      idValues[index][0] = buildOrderId_(index + 1);
    }
  }

  idRange.setValues(idValues);
}

function getNextOrderId_(sheet) {
  ensureSheetStructure_(sheet);
  return buildOrderId_(sheet.getLastRow());
}

function buildOrderId_(number) {
  return ORDER_PREFIX + "-" + String(number).padStart(4, "0");
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
