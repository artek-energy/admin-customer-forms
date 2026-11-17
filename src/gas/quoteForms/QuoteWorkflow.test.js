const { readFileSync } = require("fs");
const { join } = require("path");
const { createHash } = require("crypto");
const { createContext, runInContext } = require("vm");

const LOG_NAME = "QuoteSubmissionLog";
const LOG_HEADERS = [
  "Submission ID", "Payload SHA-256", "Quote reference", "Received at",
  "Status", "Quote sheet row", "PDF file ID", "Customer email status",
  "Internal email status", "Stage", "Updated at",
];
const SUBMISSION_ID = "quote-test-1234567890";
const CONTACT = {
  firstName: "Jane", lastName: "Customer", company: "Example Company",
  email: "quote@example.test", phone: "555-0100", addressLine1: "1 Main Street",
  addressLine2: "Unit 2", city: "Victoria", state: "BC", postalCode: "V8W 1A1",
  country: "Canada",
};
const CONTACT_ROW = [
  "Jane", "Customer", "Example Company", "quote@example.test", "555-0100",
  "1 Main Street", "Unit 2", "Victoria", "BC", "V8W 1A1", "Canada",
];

function quoteParams(form) {
  const appliances = {
    airConditioner: true, airConditionerSpecs: "A/C model",
    inductionCookstove: false, microwave: true, hairDryer: false,
    blender: true, otherAppliances: false, other: "Other appliance",
  };
  const params = { ...CONTACT, submissionId: SUBMISSION_ID, platform: "Platform" };
  if (form === "stationary") {
    return {
      ...params, action: "submitStationaryQuote",
      services: JSON.stringify({ diyInstallation: true, preWiredBoard: false }),
      application: JSON.stringify({
        type: "commercial", commercialDetails: "Commercial use",
        recreationalDetails: "Recreational use", otherDetails: "Other use",
      }),
      system: JSON.stringify({
        systemType: "offGrid", requiresPermitting: "yes", systemVoltage: "240V",
        inverterCapacity: "5000", highDrawAppliances: appliances,
        highDrawAppliancesSimultaneous: "no",
        generator: { hasGenerator: "yes", makeModel: "Generator model", hasTransferSwitch: "no" },
        solarAmount: "1200", solarMount: "ground", preferredVoltage: "48V",
        preferredVoltageExplanation: "Voltage reason", batteryBankCapacity: "10 kWh",
        budget: "20000", timeline: "Spring", additionalDetails: "Additional details",
      }),
    };
  }
  return {
    ...params, action: "submitQuote",
    services: JSON.stringify({ diyInstallation: false, professionalInstallation: true }),
    application: JSON.stringify({
      applicationType: "recreational", commercialApplication: "Commercial use",
      recreationalApplication: "Recreational use", otherApplication: "Other use",
    }),
    vehicleDetails: JSON.stringify({
      yearMakeModel: "2025 Example Van", engineType: "Diesel", offGridDays: "4",
      highDrawAppliances: appliances,
    }),
    highDrawAppsSimultaneously: "yes", hasGenerator: "no", generatorMakeModel: "Generator model",
    hasAutoTransferSwitch: "no", solarAmount: "800", solarType: "deployable",
    shorePower: "30A", has240VLoads: "no", preferredSystemVoltage: "yes",
    specifiedVoltage: "24V", preferredSystemVoltageExplanation: "Voltage reason",
    batteryBankCapacity: "5 kWh", budget: "15000", timeline: "Summer",
    additionalDetails: "Additional details",
  };
}

const EXPECTED_ROWS = {
  stationary: [
    ...CONTACT_ROW, true, false, "Platform", "commercial", "Commercial use",
    "Recreational use", "Other use", "offGrid", "yes", "240V", "5000",
    true, "A/C model", false, true, false, true, false, "Other appliance", "no",
    "yes", "Generator model", "no", "1200", "ground", "48V", "Voltage reason",
    "10 kWh", "20000", "Spring", "Additional details",
  ],
  mobile: [
    ...CONTACT_ROW, false, true, "Platform", "recreational", "Commercial use",
    "Recreational use", "Other use", "2025 Example Van", "Diesel", "4",
    true, "A/C model", false, true, false, true, false, "Other appliance", "yes",
    "no", "Generator model", "no", "800", "deployable", "30A", "no", "yes",
    "24V", "Voltage reason", "5 kWh", "15000", "Summer", "Additional details",
  ],
};

function mockSheet(name, initialRows) {
  const rows = initialRows.map((row) => [...row]);
  let capacity = Math.max(1000, rows.length);
  const writes = jest.fn();
  const sheet = {
    rows,
    writes,
    getName: jest.fn(() => name),
    getMaxColumns: jest.fn(() => 50),
    getMaxRows: jest.fn(() => capacity),
    getLastRow: jest.fn(() => rows.length),
    setFrozenRows: jest.fn(),
    appendRow: jest.fn((row) => {
      rows.push([...row]);
      capacity = Math.max(capacity, rows.length);
    }),
    getRange: jest.fn((firstRow, firstColumn, rowCount, columnCount) => {
      if (firstRow + rowCount - 1 > capacity) {
        throw new Error("Range exceeds the sheet row capacity");
      }
      return {
        getValues: () => Array.from({ length: rowCount }, (_, offset) =>
          Array.from({ length: columnCount }, (_, column) =>
            rows[firstRow - 1 + offset]?.[firstColumn - 1 + column] ?? "")),
        setValues: (values) => {
          writes(values);
          values.forEach((row, offset) => {
            const index = firstRow - 1 + offset;
            rows[index] = rows[index] || [];
            row.forEach((value, column) => {
              rows[index][firstColumn - 1 + column] = value;
            });
          });
        },
        createTextFinder: (text) => {
          const finder = {
            matchEntireCell: jest.fn(() => finder),
            matchCase: jest.fn(() => finder),
            findNext: () => {
              const index = rows.findIndex((row, offset) =>
                offset >= firstRow - 1 && offset < firstRow - 1 + rowCount &&
                row[firstColumn - 1] === text);
              return index < 0 ? null : { getRow: () => index + 1 };
            },
          };
          return finder;
        },
      };
    }),
  };
  return sheet;
}

function loadQuoteApp(form, options = {}) {
  const sheetName = form === "stationary" ? "StationaryFormQuotes" : "MobileFormQuotes";
  const quoteSheet = mockSheet(sheetName, [["Existing header"], ["Existing customer"]]);
  const sheets = { [sheetName]: quoteSheet };
  if (options.ledger !== "missing") {
    sheets[LOG_NAME] = mockSheet(LOG_NAME, options.ledgerRows || [LOG_HEADERS]);
  }
  const properties = {
    QUOTE_SPREADSHEET_ID: "test-spreadsheet",
    QUOTE_FOLDER_ID: "test-folder",
  };
  const blob = {
    setName: jest.fn(() => blob),
    getAs: jest.fn(() => blob),
  };
  const pdf = { getId: () => "test-pdf", getBlob: () => blob };
  const folder = { getName: () => "Quote PDFs", createFile: jest.fn(() => pdf) };
  const lock = { tryLock: jest.fn(() => true), waitLock: jest.fn(), releaseLock: jest.fn() };
  const spreadsheet = {
    getSheetByName: jest.fn((name) => sheets[name] || null),
    insertSheet: jest.fn((name) => {
      sheets[name] = mockSheet(name, []);
      return sheets[name];
    }),
  };
  const context = createContext({
    console: { error: jest.fn(), log: jest.fn() },
    PropertiesService: { getScriptProperties: jest.fn(() => ({ getProperty: (key) => properties[key] })) },
    Session: {
      getEffectiveUser: () => ({ getEmail: () => options.account || "sales@artek.energy" }),
      getScriptTimeZone: () => "America/Los_Angeles",
    },
    LockService: { getScriptLock: jest.fn(() => lock) },
    SpreadsheetApp: { openById: jest.fn(() => spreadsheet), flush: jest.fn() },
    DriveApp: { getFolderById: jest.fn(() => folder) },
    MailApp: { getRemainingDailyQuota: jest.fn(() => 100), sendEmail: jest.fn() },
    HtmlService: { createTemplateFromFile: jest.fn(() => ({ evaluate: () => ({ getBlob: () => blob }) })) },
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput: (text) => ({ text, setMimeType() { return this; } }),
    },
    MimeType: { PDF: "application/pdf" },
    Utilities: {
      getUuid: () => "test-generated-1234567890",
      DigestAlgorithm: { SHA_256: "SHA-256" },
      Charset: { UTF_8: "UTF-8" },
      computeDigest: (_, text) => [...createHash("sha256").update(text).digest()],
      formatDate: (date) => date.toISOString(),
    },
  });
  runInContext(readFileSync(join(__dirname, "QuoteWorkflow.gs"), "utf8"), context);
  runInContext(readFileSync(join(__dirname, "..", form + "Quote", "Code.gs"), "utf8"), context);
  return {
    context, quoteSheet, sheets, spreadsheet, folder, lock,
    submit: (params = quoteParams(form)) => JSON.parse(context.doPost({ parameter: params }).text),
    post: (event) => JSON.parse(context.doPost(event).text),
  };
}

function expectNoEffects(app) {
  expect(app.quoteSheet.appendRow).not.toHaveBeenCalled();
  expect(app.folder.createFile).not.toHaveBeenCalled();
  expect(app.context.MailApp.sendEmail).not.toHaveBeenCalled();
  Object.values(app.sheets).forEach((sheet) => {
    expect(sheet.appendRow).not.toHaveBeenCalled();
    expect(sheet.writes).not.toHaveBeenCalled();
  });
}

describe.each(["stationary", "mobile"])("%s quote workflow", (form) => {
  test("preserves legacy column order and booleans while completing one submission", () => {
    const app = loadQuoteApp(form);
    const result = app.submit();

    expect(result.status).toBe("success");
    expect(app.quoteSheet.appendRow).toHaveBeenCalledTimes(1);
    expect(app.quoteSheet.appendRow).toHaveBeenCalledWith(EXPECTED_ROWS[form]);
    expect(app.quoteSheet.rows[2]).toHaveLength(form === "stationary" ? 42 : 44);
    expect(app.folder.createFile).toHaveBeenCalledTimes(1);
    expect(app.context.MailApp.sendEmail).toHaveBeenCalledTimes(2);
    expect(app.context.MailApp.sendEmail.mock.calls.map(([email]) => email.to))
      .toEqual([CONTACT.email, "sales@artek.energy"]);
    expect(app.sheets[LOG_NAME].rows[1][4]).toBe("COMPLETE");
    expect(app.lock.releaseLock).toHaveBeenCalledTimes(1);
  });

  test("returns the original success on retry without repeating completed work", () => {
    const app = loadQuoteApp(form);
    const first = app.submit();
    const retry = app.submit();

    expect(retry).toEqual(first);
    expect(app.quoteSheet.appendRow).toHaveBeenCalledTimes(1);
    expect(app.folder.createFile).toHaveBeenCalledTimes(1);
    expect(app.context.MailApp.sendEmail).toHaveBeenCalledTimes(2);
    expect(app.sheets[LOG_NAME].rows).toHaveLength(2);
  });

  test("merges native JSON fields and recognizes a form-encoded retry", () => {
    const app = loadQuoteApp(form);
    const body = quoteParams(form);
    ["services", "application", form === "stationary" ? "system" : "vehicleDetails"]
      .forEach((key) => { body[key] = JSON.parse(body[key]); });
    delete body.company;

    const first = app.post({
      parameter: { action: "incorrect", email: "incorrect", company: CONTACT.company },
      postData: { type: "application/json", contents: JSON.stringify(body) },
    });

    expect(first.status).toBe("success");
    expect(app.quoteSheet.appendRow).toHaveBeenCalledWith(EXPECTED_ROWS[form]);
    expect(app.submit()).toEqual(first);
    expect(app.quoteSheet.appendRow).toHaveBeenCalledTimes(1);
    expect(app.folder.createFile).toHaveBeenCalledTimes(1);
    expect(app.context.MailApp.sendEmail).toHaveBeenCalledTimes(2);
    expect(app.sheets[LOG_NAME].rows).toHaveLength(2);
  });

  test("accepts a submission when the ledger has used all allocated rows", () => {
    const ledgerRows = [LOG_HEADERS, ...Array.from({ length: 999 }, (_, index) => [
      "previous-submission-" + index, "existing-hash", "Previous quote", "",
      "COMPLETE", "", "", "SENT", "SENT", "COMPLETE", "",
    ])];
    const app = loadQuoteApp(form, { ledgerRows });
    const log = app.sheets[LOG_NAME];
    expect(log.getLastRow()).toBe(log.getMaxRows());

    expect(app.submit().status).toBe("success");
    expect(log.rows).toHaveLength(1001);
    expect(log.rows[1000][0]).toBe(SUBMISSION_ID);
    expect(log.rows[1000][4]).toBe("COMPLETE");
    expect(log.rows.slice(0, 1000)).toEqual(ledgerRows);
    expect(app.quoteSheet.appendRow).toHaveBeenCalledTimes(1);
    expect(app.folder.createFile).toHaveBeenCalledTimes(1);
    expect(app.context.MailApp.sendEmail).toHaveBeenCalledTimes(2);
  });

  test("rejects changed answers using a previously accepted submission ID", () => {
    const app = loadQuoteApp(form);
    app.submit();
    const result = app.submit({ ...quoteParams(form), company: "Changed company" });

    expect(result.code).toBe("SUBMISSION_CHANGED");
    expect(app.quoteSheet.appendRow).toHaveBeenCalledTimes(1);
    expect(app.folder.createFile).toHaveBeenCalledTimes(1);
    expect(app.context.MailApp.sendEmail).toHaveBeenCalledTimes(2);
  });

  test("retains partial email progress for review and never replays it on retry", () => {
    const app = loadQuoteApp(form);
    app.context.MailApp.sendEmail.mockImplementationOnce(() => undefined)
      .mockImplementationOnce(() => { throw new Error("Internal email failed"); });
    const result = app.submit();

    expect(result.code).toBe("SUBMISSION_NEEDS_REVIEW");
    expect(app.sheets[LOG_NAME].rows[1].slice(4, 10)).toEqual([
      "NEEDS_REVIEW", 3, "test-pdf", "SENT", "SENDING", "SENDING_INTERNAL_EMAIL",
    ]);
    expect(app.submit()).toEqual(result);
    expect(app.quoteSheet.appendRow).toHaveBeenCalledTimes(1);
    expect(app.folder.createFile).toHaveBeenCalledTimes(1);
    expect(app.context.MailApp.sendEmail).toHaveBeenCalledTimes(2);
    expect(app.lock.releaseLock).toHaveBeenCalledTimes(2);
  });

  test("rejects the wrong deploying account before writing or sending", () => {
    const app = loadQuoteApp(form, { account: "another@example.test" });

    expect(app.submit().code).toBe("WRONG_ACCOUNT");
    expectNoEffects(app);
  });

  test("requires an initialized ledger before writing or sending", () => {
    const app = loadQuoteApp(form, { ledger: "missing" });

    expect(app.submit().status).toBe("error");
    expectNoEffects(app);
    expect(app.spreadsheet.insertSheet).not.toHaveBeenCalled();
  });

  test("answers health requests without reading configuration or touching services", () => {
    const app = loadQuoteApp(form);
    const result = JSON.parse(app.context.doGet().text);

    expect(result).toEqual({ status: "success", form, version: expect.any(String) });
    expect(app.context.PropertiesService.getScriptProperties).not.toHaveBeenCalled();
    expect(app.context.SpreadsheetApp.openById).not.toHaveBeenCalled();
    expect(app.context.DriveApp.getFolderById).not.toHaveBeenCalled();
    expect(app.context.MailApp.getRemainingDailyQuota).not.toHaveBeenCalled();
    expectNoEffects(app);
  });

  test("initializes only the ledger and leaves legacy sheet data intact", () => {
    const app = loadQuoteApp(form, { ledger: "missing" });
    const originalRows = app.quoteSheet.rows.map((row) => [...row]);
    const result = app.context.initializeQuoteLog();

    expect(result.submissionLogReady).toBe(true);
    expect(app.spreadsheet.insertSheet).toHaveBeenCalledWith(LOG_NAME);
    expect(app.sheets[LOG_NAME].rows).toEqual([LOG_HEADERS]);
    expect(app.quoteSheet.rows).toEqual(originalRows);
    expect(app.quoteSheet.writes).not.toHaveBeenCalled();
    expect(app.quoteSheet.appendRow).not.toHaveBeenCalled();
    expect(app.folder.createFile).not.toHaveBeenCalled();
    expect(app.context.MailApp.sendEmail).not.toHaveBeenCalled();
    app.context.initializeQuoteLog();
    expect(app.spreadsheet.insertSheet).toHaveBeenCalledTimes(1);
  });
});

test.each(["application/json; charset=UTF-8", "text/plain", undefined])(
  "accepts a JSON body with content type %s and stringified nested fields", (type) => {
    const app = loadQuoteApp("mobile");
    const result = app.post({ postData: { type, contents: JSON.stringify(quoteParams("mobile")) } });

    expect(result.status).toBe("success");
    expect(app.quoteSheet.appendRow).toHaveBeenCalledWith(EXPECTED_ROWS.mobile);
  }
);

test.each([
  ["stationary", "application/x-www-form-urlencoded;charset=UTF-8", "action=submitStationaryQuote"],
  ["mobile", "multipart/form-data; boundary=quote", "--quote\r\nContent-Disposition: form-data; name=\"action\"\r\n\r\nsubmitQuote\r\n--quote--"],
])("uses parsed %s form parameters for %s", (form, type, contents) => {
  const app = loadQuoteApp(form);
  const result = app.post({ parameter: quoteParams(form), postData: { type, contents } });

  expect(result.status).toBe("success");
  expect(app.quoteSheet.appendRow).toHaveBeenCalledWith(EXPECTED_ROWS[form]);
});

test.each(["{broken", "", "null", "[]", "false", "42", '"text"'])(
  "rejects invalid JSON request body %s before reading services", (contents) => {
    const app = loadQuoteApp("mobile");
    const result = app.post({
      parameter: quoteParams("mobile"),
      postData: { type: "application/json", contents },
    });

    expect(result.code).toBe("INVALID_DATA");
    expect(app.context.PropertiesService.getScriptProperties).not.toHaveBeenCalled();
    expect(app.context.SpreadsheetApp.openById).not.toHaveBeenCalled();
    expect(app.context.DriveApp.getFolderById).not.toHaveBeenCalled();
    expect(app.context.MailApp.getRemainingDailyQuota).not.toHaveBeenCalled();
    expectNoEffects(app);
  }
);

test.each([undefined, ""])("defaults omitted or empty nested fields (%s) to an object", (services) => {
  const app = loadQuoteApp("mobile");

  expect(app.submit({ ...quoteParams("mobile"), services }).status).toBe("success");
  expect(app.quoteSheet.rows[2].slice(11, 13)).toEqual([false, false]);
});

test.each([
  ["stationary", "services", "{broken", "INVALID_DATA"],
  ["stationary", "application", "[]", "INVALID_DATA"],
  ["stationary", "system", "null", "INVALID_DATA"],
  ["stationary", "system", '{"generator":"bad"}', "INVALID_DATA"],
  ["stationary", "system", '{"highDrawAppliances":[]}', "INVALID_DATA"],
  ["mobile", "vehicleDetails", "{broken", "INVALID_DATA"],
  ["mobile", "vehicleDetails", '{"highDrawAppliances":{"airConditioner":"true"}}', "INVALID_DATA"],
  ["mobile", "services", [], "INVALID_DATA"],
  ["mobile", "services", null, "INVALID_DATA"],
  ["mobile", "services", false, "INVALID_DATA"],
  ["mobile", "services", 0, "INVALID_DATA"],
  ["stationary", "firstName", " ", "INVALID_CONTACT"],
  ["mobile", "lastName", "", "INVALID_CONTACT"],
  ["stationary", "email", "not-an-email", "INVALID_EMAIL"],
  ["mobile", "email", "one@example.test,two@example.test", "INVALID_EMAIL"],
])("rejects invalid %s %s before side effects", (form, key, value, code) => {
  const app = loadQuoteApp(form);

  expect(app.submit({ ...quoteParams(form), [key]: value }).code).toBe(code);
  expectNoEffects(app);
  expect(app.context.SpreadsheetApp.openById).not.toHaveBeenCalled();
});

test("stores formula-like customer and quote answers as literal spreadsheet text", () => {
  const app = loadQuoteApp("stationary");
  const params = quoteParams("stationary");
  params.firstName = "=1+1";
  params.system = JSON.stringify({ ...JSON.parse(params.system), additionalDetails: "=SUM(1,2)" });

  expect(app.submit(params).status).toBe("success");
  expect(app.quoteSheet.rows[2][0]).toBe("'=1+1");
  expect(app.quoteSheet.rows[2][41]).toBe("'=SUM(1,2)");
});
