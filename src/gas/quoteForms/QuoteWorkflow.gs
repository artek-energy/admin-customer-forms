const QUOTE_VERSION_ = "2026-11-17.1";
const QUOTE_ACCOUNT_ = "sales@artek.energy";
const QUOTE_LOG_NAME_ = "QuoteSubmissionLog";
const QUOTE_LOCK_WAIT_MS_ = 5000;
const QUOTE_LOG_HEADERS_ = [
  "Submission ID", "Payload SHA-256", "Quote reference", "Received at",
  "Status", "Quote sheet row", "PDF file ID", "Customer email status",
  "Internal email status", "Stage", "Updated at"
];
const QUOTE_LOG_COL_ = Object.freeze({
  ID: 0, HASH: 1, REFERENCE: 2, RECEIVED: 3, STATUS: 4, QUOTE_ROW: 5,
  PDF_ID: 6, CUSTOMER_EMAIL: 7, INTERNAL_EMAIL: 8, STAGE: 9, UPDATED: 10
});
const QUOTE_STATUS_ = Object.freeze({
  PROCESSING: "PROCESSING", COMPLETE: "COMPLETE", REVIEW: "NEEDS_REVIEW"
});
const QUOTE_STAGE_ = Object.freeze({
  RESERVED: "RESERVED", ROW: "WRITING_QUOTE_ROW", PDF: "CREATING_PDF",
  CUSTOMER: "SENDING_CUSTOMER_EMAIL", INTERNAL: "SENDING_INTERNAL_EMAIL",
  COMPLETE: "COMPLETE"
});

function quoteHealth_(form) {
  // Public health checks identify the deployment, without exposing storage or customer data.
  return quoteJson_({ status: "success", form: form.key, version: QUOTE_VERSION_ });
}

function submitQuote_(event, form) {
  let lock;
  let log;
  let record;
  let logRow;
  try {
    const params = event && event.parameter;
    if (!params || params.action !== form.action) {
      throw quoteError_("INVALID_ACTION", "Invalid or missing action specified.");
    }
    const data = parseQuoteData_(params, form);
    const row = quoteRow_(data, form);
    const submissionId = quoteId_(params.submissionId);
    const hash = quoteHash_([form.key, row]);
    const config = quoteConfig_(form);
    checkQuoteAccount_();
    lock = LockService.getScriptLock();
    if (!lock.tryLock(QUOTE_LOCK_WAIT_MS_)) {
      lock = null;
      throw quoteError_("BUSY", "Another request is being processed. Please wait, then retry without changing your answers.");
    }

    const spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
    const sheet = quoteSheet_(spreadsheet, config.sheetName, form);
    log = quoteLog_(spreadsheet);
    const existing = findQuoteRecord_(log, submissionId);
    if (existing) {
      const saved = existing.values;
      if (saved[QUOTE_LOG_COL_.HASH] !== hash) {
        throw quoteError_("SUBMISSION_CHANGED", "This submission reference was already used with different answers. Please contact sales@artek.energy.");
      }
      if (saved[QUOTE_LOG_COL_.STATUS] === QUOTE_STATUS_.COMPLETE) {
        return quoteJson_(quoteSuccess_(saved[QUOTE_LOG_COL_.REFERENCE]));
      }
      return quoteJson_(quoteReview_(saved[QUOTE_LOG_COL_.REFERENCE]));
    }

    const folder = DriveApp.getFolderById(config.folderId);
    if (MailApp.getRemainingDailyQuota() < config.ownerEmails.length + 1) {
      throw quoteError_("MAIL_QUOTA", "Quote notifications are temporarily unavailable. Please contact sales@artek.energy.");
    }
    const reference = form.referencePrefix + "-" + submissionId;
    const receivedAt = new Date().toISOString();
    record = [submissionId, hash, reference, receivedAt, QUOTE_STATUS_.PROCESSING,
      "", "", "NOT_STARTED", "NOT_STARTED", QUOTE_STAGE_.RESERVED, receivedAt];
    logRow = log.getLastRow() + 1;
    // appendRow also grows a full ledger; later stages update this reserved row.
    log.appendRow(record);
    SpreadsheetApp.flush();

    // Reserve the attempt before side effects. An interrupted attempt requires review;
    // it must never automatically replay a row append or an uncertain email send.
    record[QUOTE_LOG_COL_.STAGE] = QUOTE_STAGE_.ROW;
    saveQuoteRecord_(log, logRow, record);
    sheet.appendRow(row.map(quoteCell_));
    record[QUOTE_LOG_COL_.QUOTE_ROW] = sheet.getLastRow();
    record[QUOTE_LOG_COL_.STAGE] = QUOTE_STAGE_.PDF;
    saveQuoteRecord_(log, logRow, record);

    const pdf = createQuotePdf_(data, form, reference, receivedAt, folder);
    record[QUOTE_LOG_COL_.PDF_ID] = pdf.getId();
    record[QUOTE_LOG_COL_.STAGE] = QUOTE_STAGE_.CUSTOMER;
    record[QUOTE_LOG_COL_.CUSTOMER_EMAIL] = "SENDING";
    saveQuoteRecord_(log, logRow, record);
    const attachment = pdf.getBlob();
    sendQuoteCustomer_(data, form, reference, attachment);
    record[QUOTE_LOG_COL_.CUSTOMER_EMAIL] = "SENT";
    record[QUOTE_LOG_COL_.STAGE] = QUOTE_STAGE_.INTERNAL;
    record[QUOTE_LOG_COL_.INTERNAL_EMAIL] = "SENDING";
    saveQuoteRecord_(log, logRow, record);
    sendQuoteInternal_(data, form, reference, attachment, config.ownerEmails);
    record[QUOTE_LOG_COL_.INTERNAL_EMAIL] = "SENT";
    record[QUOTE_LOG_COL_.STAGE] = QUOTE_STAGE_.COMPLETE;
    record[QUOTE_LOG_COL_.STATUS] = QUOTE_STATUS_.COMPLETE;
    saveQuoteRecord_(log, logRow, record);
    return quoteJson_(quoteSuccess_(reference));
  } catch (error) {
    if (record) {
      record[QUOTE_LOG_COL_.STATUS] = QUOTE_STATUS_.REVIEW;
      try {
        saveQuoteRecord_(log, logRow, record);
      } catch (logError) {
        console.error("Could not update quote log: " + logError.message);
      }
      console.error("Quote " + record[QUOTE_LOG_COL_.REFERENCE] + " stopped at " + record[QUOTE_LOG_COL_.STAGE] + ": " + error.message);
      return quoteJson_(quoteReview_(record[QUOTE_LOG_COL_.REFERENCE]));
    }
    console.error("Quote request failed: " + error.message);
    return quoteJson_({
      status: "error", code: error.quoteCode || "UNAVAILABLE",
      message: error.quoteCode ? error.message : "The quote service is unavailable. Please contact sales@artek.energy."
    });
  } finally {
    if (lock) {
      lock.releaseLock();
    }
  }
}

function parseQuoteData_(params, form) {
  const data = {};
  Object.keys(params).forEach(function(key) {
    if (key !== "__proto__" && key !== "constructor" && key !== "prototype") {
      data[key] = params[key];
    }
  });
  ["firstName", "lastName", "email"].forEach(function(key) {
    if (typeof data[key] !== "string" || !data[key].trim()) {
      throw quoteError_("INVALID_CONTACT", "First name, last name, and email are required.");
    }
    data[key] = data[key].trim();
  });
  if (!validQuoteEmail_(data.email)) {
    throw quoteError_("INVALID_EMAIL", "Please enter a valid email address.");
  }
  form.nestedFields.forEach(function(key) {
    try {
      const value = params[key] ? JSON.parse(params[key]) : {};
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("Expected an object");
      }
      data[key] = value;
    } catch (error) {
      throw quoteError_("INVALID_DATA", "Invalid " + key + " data. Please reload the form and try again.");
    }
  });
  quoteFields_(form).forEach(function(field) {
    const parts = field.path.split(".");
    for (let depth = 1; depth < parts.length; depth++) {
      const parent = quoteValue_(data, parts.slice(0, depth).join("."));
      if (parent !== undefined && (!parent || typeof parent !== "object" || Array.isArray(parent))) {
        throw quoteError_("INVALID_DATA", "Invalid data for " + field.label + ".");
      }
    }
    const value = quoteValue_(data, field.path);
    if (value === undefined || value === null) {
      return;
    }
    if (field.type === "boolean") {
      if (typeof value !== "boolean") {
        throw quoteError_("INVALID_DATA", "Invalid value for " + field.label + ".");
      }
      return;
    }
    if (typeof value !== "string" && typeof value !== "number") {
      throw quoteError_("INVALID_DATA", "Invalid value for " + field.label + ".");
    }
  });
  return data;
}

function quoteConfig_(form) {
  const properties = PropertiesService.getScriptProperties();
  const spreadsheetId = properties.getProperty("QUOTE_SPREADSHEET_ID");
  const folderId = properties.getProperty("QUOTE_FOLDER_ID");
  if (!spreadsheetId || !folderId) {
    throw quoteError_("NOT_CONFIGURED", "The quote service is not configured. Please contact sales@artek.energy.");
  }
  const sheetName = properties.getProperty("QUOTE_SHEET_NAME") || form.defaultSheetName;
  if (sheetName === QUOTE_LOG_NAME_) {
    throw new Error("The quote tab and submission log must be separate tabs.");
  }
  const ownerEmails = (properties.getProperty("QUOTE_OWNER_EMAILS") || QUOTE_ACCOUNT_)
    .split(",").map(function(email) { return email.trim(); }).filter(Boolean);
  if (!ownerEmails.length || ownerEmails.some(function(email) { return !validQuoteEmail_(email); })) {
    throw new Error("QUOTE_OWNER_EMAILS must contain comma-separated email addresses.");
  }
  return { spreadsheetId: spreadsheetId, folderId: folderId, sheetName: sheetName, ownerEmails: ownerEmails };
}

function checkQuoteAccount_() {
  if (Session.getEffectiveUser().getEmail().toLowerCase() !== QUOTE_ACCOUNT_) {
    console.error("Deploy this web app to execute as the sales@artek.energy account.");
    throw quoteError_("WRONG_ACCOUNT", "Quote submissions are unavailable. Please contact sales@artek.energy.");
  }
}

function checkQuoteSetup_(form) {
  checkQuoteAccount_();
  const config = quoteConfig_(form);
  const spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
  const sheet = quoteSheet_(spreadsheet, config.sheetName, form);
  const folder = DriveApp.getFolderById(config.folderId);
  const log = spreadsheet.getSheetByName(QUOTE_LOG_NAME_);
  if (log) {
    validateQuoteLog_(log);
  }
  const result = {
    form: form.key, version: QUOTE_VERSION_, account: QUOTE_ACCOUNT_,
    quoteSheet: sheet.getName(), expectedColumns: quoteFields_(form).length,
    pdfFolder: folder.getName(), submissionLogReady: Boolean(log),
    remainingEmailRecipients: MailApp.getRemainingDailyQuota(),
    note: "Read access checked. No quote, PDF, or email was created; write access still requires a test submission."
  };
  console.log(JSON.stringify(result));
  return result;
}

function initializeQuoteLog_(form) {
  checkQuoteAccount_();
  const config = quoteConfig_(form);
  const lock = LockService.getScriptLock();
  lock.waitLock(QUOTE_LOCK_WAIT_MS_);
  try {
    const spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
    quoteSheet_(spreadsheet, config.sheetName, form);
    let log = spreadsheet.getSheetByName(QUOTE_LOG_NAME_);
    if (!log) {
      log = spreadsheet.insertSheet(QUOTE_LOG_NAME_);
      log.getRange(1, 1, 1, QUOTE_LOG_HEADERS_.length).setValues([QUOTE_LOG_HEADERS_]);
      log.setFrozenRows(1);
      SpreadsheetApp.flush();
    }
    validateQuoteLog_(log);
    return checkQuoteSetup_(form);
  } finally {
    lock.releaseLock();
  }
}

function quoteSheet_(spreadsheet, name, form) {
  const sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    throw new Error("Expected quote tab not found: " + name);
  }
  if (sheet.getMaxColumns() < quoteFields_(form).length) {
    throw new Error("Quote tab does not have enough columns for the existing form schema.");
  }
  return sheet;
}

function quoteLog_(spreadsheet) {
  const log = spreadsheet.getSheetByName(QUOTE_LOG_NAME_);
  if (!log) {
    throw new Error("Run initializeQuoteLog from the editor before accepting submissions.");
  }
  validateQuoteLog_(log);
  return log;
}

function validateQuoteLog_(log) {
  const headers = log.getRange(1, 1, 1, QUOTE_LOG_HEADERS_.length).getValues()[0];
  if (JSON.stringify(headers) !== JSON.stringify(QUOTE_LOG_HEADERS_)) {
    throw new Error("QuoteSubmissionLog has unexpected columns; do not overwrite existing data.");
  }
}

function findQuoteRecord_(log, id) {
  if (log.getLastRow() < 2) {
    return null;
  }
  const cell = log.getRange(2, 1, log.getLastRow() - 1, 1)
    .createTextFinder(id).matchEntireCell(true).matchCase(true).findNext();
  if (!cell) {
    return null;
  }
  return { values: log.getRange(cell.getRow(), 1, 1, QUOTE_LOG_HEADERS_.length).getValues()[0] };
}

function saveQuoteRecord_(log, row, record) {
  record[QUOTE_LOG_COL_.UPDATED] = new Date().toISOString();
  log.getRange(row, 1, 1, record.length).setValues([record]);
  SpreadsheetApp.flush();
}

function quoteFields_(form) {
  return form.groups.reduce(function(fields, group) { return fields.concat(group.fields); }, []);
}

function quoteValue_(data, path) {
  return path.split(".").reduce(function(value, key) {
    return value && Object.prototype.hasOwnProperty.call(value, key) ? value[key] : undefined;
  }, data);
}

function quoteRow_(data, form) {
  return quoteFields_(form).map(function(field) {
    const value = quoteValue_(data, field.path);
    if (field.type === "boolean") {
      return value === true;
    }
    return value === undefined || value === null ? "" : value;
  });
}

function quoteCell_(value) {
  // Sheets treats leading '=' as a formula. Store user input as literal text.
  return typeof value === "string" && /^[=+@\-]/.test(value) ? "'" + value : value;
}

function quoteId_(value) {
  const id = value || Utilities.getUuid();
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{16,64}$/.test(id)) {
    throw quoteError_("INVALID_REFERENCE", "Invalid submission reference. Please reload the form.");
  }
  return id;
}

function quoteHash_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(value), Utilities.Charset.UTF_8)
    .map(function(byte) { return ((byte + 256) % 256).toString(16).padStart(2, "0"); }).join("");
}

function quoteDisplay_(value, field) {
  if (field.type === "boolean") {
    return value === true ? "Yes" : "No";
  }
  if (value === undefined || value === null || value === "") {
    return "N/A";
  }
  if (field.choices && Object.prototype.hasOwnProperty.call(field.choices, value)) {
    return field.choices[value];
  }
  return String(value);
}

function createQuotePdf_(data, form, reference, receivedAt, folder) {
  const template = HtmlService.createTemplateFromFile("QuoteSummary");
  template.formTitle = form.title;
  template.reference = reference;
  template.submittedAt = Utilities.formatDate(new Date(receivedAt), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm z");
  template.sections = form.groups.map(function(group) {
    return { title: group.title, rows: group.fields.map(function(field) {
      return { label: field.label, value: quoteDisplay_(quoteValue_(data, field.path), field) };
    }) };
  });
  const blob = template.evaluate().getBlob().setName(reference + ".html")
    .getAs(MimeType.PDF).setName(reference + ".pdf");
  return folder.createFile(blob);
}

function sendQuoteCustomer_(data, form, reference, attachment) {
  MailApp.sendEmail({
    to: data.email, name: "Artek Energy", replyTo: QUOTE_ACCOUNT_,
    subject: form.title + " Submission Received - " + reference,
    body: "Thank you, " + data.firstName + " " + data.lastName + ", for submitting your " + form.title.toLowerCase() + " form.\n\n" +
      "Reference: " + reference + "\nAttached is a PDF copy of your submission. We will contact you shortly.\n\nBest regards,\nThe Artek Team",
    attachments: [attachment]
  });
}

function sendQuoteInternal_(data, form, reference, attachment, recipients) {
  MailApp.sendEmail({
    to: recipients.join(","), name: "Artek Energy", replyTo: QUOTE_ACCOUNT_,
    subject: "New " + form.title + " Submission - " + reference,
    body: "A new " + form.title.toLowerCase() + " form submission has been received.\n\n" +
      "Reference: " + reference + "\nName: " + data.firstName + " " + data.lastName +
      "\nEmail: " + data.email + "\nPhone: " + (data.phone || "N/A") + "\n\nSee the attached PDF for details.",
    attachments: [attachment]
  });
}

function validQuoteEmail_(value) {
  return typeof value === "string" && /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(value);
}

function quoteSuccess_(reference) {
  return { status: "success", reference: reference, message: "Form submission successful." };
}

function quoteReview_(reference) {
  return {
    status: "error", code: "SUBMISSION_NEEDS_REVIEW", reference: reference,
    message: "We could not confirm completion of submission " + reference + ". Please contact sales@artek.energy with this reference before submitting again."
  };
}

function quoteError_(code, message) {
  const error = new Error(message);
  error.quoteCode = code;
  return error;
}

function quoteJson_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
