const SHEET_NAME = "Orders";
const ORDER_PREFIX = "AHSOM";
const MAX_CART_LINES = 20;
const MAX_NOTES_LENGTH = 300;
const RATE_LIMIT_SECONDS = 60;
const DUPLICATE_WINDOW_SECONDS = 10 * 60;
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
    const payload = parseRequestBody_(e);
    const validated = validatePayload_(payload);
    enforceRequestGuards_(validated);

    const sheet = getOrdersSheet_();
    const orderId = getNextOrderId_(sheet);

    sheet.appendRow([
      orderId,
      new Date(),
      validated.status,
      validated.customerName,
      validated.customerPhone,
      validated.fulfillmentType,
      validated.customerAddress,
      validated.customerNotes,
      validated.itemsSummary,
      JSON.stringify(validated.items),
      validated.totalItems,
      validated.subtotal,
      validated.currency,
      validated.submittedAt
    ]);

    rememberOrderGuardState_(validated);

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

function parseRequestBody_(e) {
  const raw = (e && e.postData && e.postData.contents) || "{}";
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error("Invalid request payload.");
  }
}

function validatePayload_(payload) {
  const customerName = normalizeWhitespace_(payload.customerName);
  const customerPhone = normalizePhone_(payload.customerPhone);
  const fulfillmentType = normalizeWhitespace_(payload.fulfillmentType);
  const customerAddress = normalizeWhitespace_(payload.customerAddress);
  const customerNotes = normalizeWhitespace_(payload.customerNotes);
  const honeypot = normalizeWhitespace_(payload.website);
  const status = normalizeWhitespace_(payload.status) || "New";
  const currency = normalizeWhitespace_(payload.currency) || "PHP";
  const submittedAt = normalizeWhitespace_(payload.submittedAt);
  const rawItems = Array.isArray(payload.items) ? payload.items : [];

  if (honeypot) {
    throw new Error("Unable to process this request. Please refresh and try again.");
  }

  if (!customerName) {
    throw new Error("Please enter your full name before placing an order.");
  }

  if (!/^09\d{9}$/.test(customerPhone)) {
    throw new Error("Please enter a valid PH mobile number (example: 09XXXXXXXXX).");
  }

  if (fulfillmentType !== "Delivery" && fulfillmentType !== "Pickup") {
    throw new Error("Please select Delivery or Pickup before placing an order.");
  }

  if (fulfillmentType === "Delivery" && !customerAddress) {
    throw new Error("Please enter the delivery address before placing the order.");
  }

  if (customerNotes.length > MAX_NOTES_LENGTH) {
    throw new Error("Notes are too long. Please keep additional notes under 300 characters.");
  }

  if (rawItems.length === 0) {
    throw new Error("Add at least one item before placing an order.");
  }

  if (rawItems.length > MAX_CART_LINES) {
    throw new Error("Your cart has too many item lines. Please keep it to 20 items or fewer.");
  }

  const items = rawItems.map(normalizeLineItem_);
  const totalItems = items.reduce(function (sum, item) {
    return sum + item.quantity;
  }, 0);
  const subtotal = roundMoney_(items.reduce(function (sum, item) {
    return sum + item.price * item.quantity;
  }, 0));
  const submittedSubtotal = roundMoney_(Number(payload.subtotal) || 0);

  if (Math.abs(subtotal - submittedSubtotal) > 0.01) {
    throw new Error("Order total mismatch detected. Please refresh your cart and try again.");
  }

  if (!submittedAt || isNaN(new Date(submittedAt).getTime())) {
    throw new Error("Invalid submitted timestamp.");
  }

  return {
    status: status,
    customerName: customerName,
    customerPhone: customerPhone,
    fulfillmentType: fulfillmentType,
    customerAddress: customerAddress,
    customerNotes: customerNotes,
    items: items,
    itemsSummary: items.map(function (item) {
      return item.name + " x" + item.quantity;
    }).join(", "),
    totalItems: totalItems,
    subtotal: subtotal,
    currency: currency,
    submittedAt: submittedAt,
    signature: buildOrderSignature_(customerPhone, fulfillmentType, customerAddress, items, subtotal)
  };
}

function normalizeLineItem_(item) {
  const name = normalizeWhitespace_(item && item.name);
  const unit = normalizeWhitespace_(item && item.unit);
  const price = Number(item && item.price);
  const quantity = Number(item && item.quantity);

  if (!name) {
    throw new Error("One or more cart items has an invalid name.");
  }

  if (!isFinite(price) || price < 0) {
    throw new Error("One or more cart items has an invalid price.");
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("One or more cart items has an invalid quantity.");
  }

  return {
    name: name,
    unit: unit,
    price: roundMoney_(price),
    quantity: quantity
  };
}

function enforceRequestGuards_(validated) {
  const cache = CacheService.getScriptCache();
  const rateKey = "rate:" + validated.customerPhone;
  const duplicateKey = "dup:" + validated.signature;

  if (cache.get(rateKey)) {
    throw new Error("You just sent an order. Please wait about 1 minute before sending another request.");
  }

  if (cache.get(duplicateKey)) {
    throw new Error("This order looks identical to one sent recently. If this is intentional, please wait 10 minutes or edit your order.");
  }
}

function rememberOrderGuardState_(validated) {
  const cache = CacheService.getScriptCache();
  cache.put("rate:" + validated.customerPhone, "1", RATE_LIMIT_SECONDS);
  cache.put("dup:" + validated.signature, "1", DUPLICATE_WINDOW_SECONDS);
}

function buildOrderSignature_(phone, fulfillmentType, customerAddress, items, subtotal) {
  const canonicalItems = items
    .map(function (item) {
      return {
        name: normalizeWhitespace_(item.name).toLowerCase(),
        price: roundMoney_(item.price),
        quantity: item.quantity
      };
    })
    .sort(function (a, b) {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      if (a.price < b.price) return -1;
      if (a.price > b.price) return 1;
      return a.quantity - b.quantity;
    })
    .map(function (item) {
      return item.name + "|" + item.price.toFixed(2) + "|" + item.quantity;
    })
    .join(";");

  return [
    normalizePhone_(phone),
    normalizeWhitespace_(fulfillmentType).toLowerCase(),
    normalizeWhitespace_(customerAddress).toLowerCase(),
    canonicalItems,
    roundMoney_(subtotal).toFixed(2)
  ].join("::");
}

function normalizeWhitespace_(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizePhone_(value) {
  return String(value || "").replace(/\D/g, "");
}

function roundMoney_(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
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
