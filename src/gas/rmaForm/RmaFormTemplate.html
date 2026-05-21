/**
 * Main entry point for POST requests (from your React form).
 */
function doPost(e) {
  // 1) Preflight check: if no post data, assume OPTIONS or empty request
  if (!e.postData || !e.postData.contents) {
    return ContentService
      .createTextOutput('')
      .setMimeType(ContentService.MimeType.TEXT);
  }

  try {
    const action = e.parameter.action;
    if (!action) throw new Error("No action specified.");

    if (action === "submitAndUpload") {
      // Extract user info from the form for naming
      const firstName = e.parameter.firstName || "Unknown";
      const lastName  = e.parameter.lastName || "Unknown";
      // Format today's date as YYYY-MM-DD
      const todayStr  = Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd");

      // Create a new subfolder named e.g. "RMA-John-Doe-2025-02-18"
      const mainFolderId = "1jH_lz5typUyesZI6Ue-t30TSwQsY8EMC"; // Replace with your actual folder ID
      const mainFolder   = DriveApp.getFolderById(mainFolderId);
      const rmaNumber  = e.parameter.rmaNumber || "NO-RMA-NUMBER";
      const subFolderName = `${rmaNumber}-${firstName}-${lastName}-${todayStr}`;
      const subFolder     = mainFolder.createFolder(subFolderName);

      // 1) Store the form data in the sheet
      appendFormData(e);

      // 2) Generate a PDF summary of the form
      const pdfBlob = createRmaPdf(e.parameter);

      // 3) Save that PDF summary in the same subfolder
      //    "uploadFileToDrive" returns the file URL
      const pdfFileUrl = uploadFileToDrive(
        pdfBlob,
        "PDF-Summary",
        "RMA_Form_Summary.pdf",
        "RMA PDF Summary",
        subFolder
      );

      // 4) Decode & save the user's uploaded file in the same subfolder
      //    This returns the userFileUrl
      const userFileUrl = storeBase64File(e, subFolder);

      // 5) Send emails (to user + owners) with the PDF attached, plus link to user file
      const userEmail = e.parameter.email; // user’s email from the form
      sendAllEmails(userEmail, pdfBlob, e.parameter, userFileUrl);

      // Return a JSON response
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Form submission & file upload successful",
        pdfFileUrl: pdfFileUrl,
        userFileUrl: userFileUrl
      })).setMimeType(ContentService.MimeType.JSON);

    } else {
      throw new Error(`Invalid action: ${action}`);
    }

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * For testing or health checks (optional).
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: "success",
      message: "GET request received"
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 1) Stores the form data in the "RMAForm" sheet.
 */
function appendFormData(e) {
  Logger.log("=== Appending form data to the sheet ===");
  const params = e.parameter;

  const spreadsheetId = "1BJQ4TKxyrp4Ygn0beGJFz3UIfYfXjUhcrCg_CsLEH1Y"; // replace
  const spreadsheet   = SpreadsheetApp.openById(spreadsheetId);
  const sheet         = spreadsheet.getSheetByName("RMAForm");
  if (!sheet) throw new Error("RMAForm sheet not found");

  sheet.appendRow([
    params.rmaNumber || '',
    params.rmaRequestType || '',
    params.firstName || '',
    params.lastName || '',
    params.company || '',
    params.email || '',
    params.phone || '',
    params.shippingAddress || '',
    params.artekOrderNumber || '',
    params.productSku || '',
    params.isVictronProduct || '',
    params.serialNumber || '',
    params.manufacturer || '',
    params.installationDate || '',
    params.failureDate || '',
    params.firmwareUpdated || '',
    params.firmwareVersion || '',
    params.failureDescription || '',
    params.acknowledgeShippingCosts || false
  ]);
}

/**
 * 2) Generates an HTML-based PDF summarizing the form submission.
 */
function createRmaPdf(data) {
  const generalFields = [
    ["RMA Number", data.rmaNumber],
    ["RMA Request Type", data.rmaRequestType],
    ["First Name", data.firstName],
    ["Last Name", data.lastName],
    ["Company", data.company],
    ["Email", data.email],
    ["Phone", data.phone],
    ["Shipping Address", data.shippingAddress]
  ];

  const productFields = [
    ["Artek Order #", data.artekOrderNumber],
    ["Product SKU", data.productSku],
    ["Victron Energy Product", formatRmaValue(data.isVictronProduct)],
    ["Serial Number", data.serialNumber],
    ["Manufacturer", data.manufacturer]
  ];

  const diagnosticFields = [
    ["Installation Date", data.installationDate],
    ["Failure Date", data.failureDate],
    ["Firmware Updated?", formatRmaValue(data.firmwareUpdated)],
    ["Firmware Version", data.firmwareVersion],
    ["Failure Description", data.failureDescription],
    ["Acknowledged Shipping Costs", formatRmaValue(data.acknowledgeShippingCosts)]
  ];

  const htmlContent = `
    <html>
      <head>
        <meta charset="UTF-8">
        <title>RMA Submission Summary</title>
        <style>
          @page {
            margin: 24px;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            background: #eef2f6;
            color: #333333;
            font-family: "Segoe UI", Arial, sans-serif;
            font-size: 12px;
            line-height: 1.45;
          }

          .page {
            background: #ffffff;
            border: 1px solid #d0d5dd;
            border-radius: 8px;
            overflow: hidden;
          }

          .header {
            background: #38526e;
            color: #ffffff;
            padding: 24px 28px;
          }

          .eyebrow {
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 1.4px;
            margin: 0 0 6px;
            text-transform: uppercase;
          }

          h1 {
            color: #ffffff;
            font-size: 28px;
            line-height: 1.15;
            margin: 0 0 16px;
          }

          .meta {
            display: table;
            width: 100%;
          }

          .meta-item {
            display: table-cell;
            padding-right: 14px;
            vertical-align: top;
          }

          .meta-label {
            color: #cfd9e5;
            display: block;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.8px;
            margin-bottom: 3px;
            text-transform: uppercase;
          }

          .meta-value {
            color: #ffffff;
            display: block;
            font-size: 13px;
            font-weight: 700;
          }

          .content {
            padding: 24px 28px 28px;
          }

          .notice {
            background: #fff8f8;
            border: 1px solid #f2c3c3;
            border-left: 4px solid #d32f2f;
            border-radius: 6px;
            color: #703030;
            margin: 0 0 20px;
            padding: 10px 12px;
          }

          .section {
            margin-top: 20px;
          }

          h2 {
            border-bottom: 2px solid #38526e;
            color: #38526e;
            font-size: 16px;
            margin: 0 0 10px;
            padding-bottom: 5px;
          }

          table {
            border-collapse: collapse;
            margin-bottom: 4px;
            width: 100%;
          }

          tr:nth-child(even) td {
            background: #fafbfc;
          }

          td {
            border-bottom: 1px solid #e4e7ec;
            padding: 8px 10px;
            vertical-align: top;
          }

          td.label {
            color: #444444;
            font-weight: 700;
            width: 34%;
          }

          td.value {
            color: #333333;
          }

          .footer {
            border-top: 1px solid #e4e7ec;
            color: #667085;
            font-size: 11px;
            margin-top: 22px;
            padding-top: 12px;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <p class="eyebrow">Artek Energy</p>
            <h1>RMA Submission Summary</h1>
            <div class="meta">
              <div class="meta-item">
                <span class="meta-label">RMA Number</span>
                <span class="meta-value">${escapeHtml(data.rmaNumber || "N/A")}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Request Type</span>
                <span class="meta-value">${escapeHtml(data.rmaRequestType || "N/A")}</span>
              </div>
            </div>
          </div>

          <div class="content">
            <p class="notice">This PDF is an auto-generated summary of the RMA form submission.</p>

            <div class="section">
              <h2>General Information</h2>
              <table>${renderSummaryRows(generalFields)}</table>
            </div>

            <div class="section">
              <h2>Product Information</h2>
              <table>${renderSummaryRows(productFields)}</table>
            </div>

            <div class="section">
              <h2>Dates & Diagnostics</h2>
              <table>${renderSummaryRows(diagnosticFields)}</table>
            </div>

            <p class="footer">Generated by the Artek RMA form workflow.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const htmlBlob = HtmlService
    .createHtmlOutput(htmlContent)
    .getBlob()
    .setName("RMA_Form_Summary.html");

  // Convert that HTML into a PDF blob
  const pdfBlob = htmlBlob
    .getAs("application/pdf")
    .setName("RMA_Form_Summary.pdf");

  return pdfBlob;
}

function renderSummaryRows(fields) {
  return fields
    .map(function(field) {
      return `<tr><td class="label">${escapeHtml(field[0])}</td><td class="value">${escapeHtml(displayRmaValue(field[1]))}</td></tr>`;
    })
    .join("");
}

function displayRmaValue(value) {
  if (value === undefined || value === null || value === "") return "N/A";
  return value;
}

function formatRmaValue(value) {
  if (value === true || value === "true") return "Yes";
  if (value === false || value === "false") return "No";
  if (value === "yes") return "Yes";
  if (value === "no") return "No";
  if (value === "na") return "Not Applicable";
  if (value === undefined || value === null || value === "") return "N/A";
  return value;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * 3) Decodes the Base64 file from e.parameter and stores it in the given `subFolder`.
 * Returns the file's Drive URL.
 */
function storeBase64File(e, subFolder) {
  Logger.log("=== Storing Base64 file in the same folder ===");
  const fileName   = e.parameter.fileName;
  const fileType   = e.parameter.fileType;
  const base64Data = e.parameter.fileData;

  if (!base64Data) {
    Logger.log("No fileData found, skipping file upload.");
    return null;
  }

  // Decode the base64
  const decodedBytes = Utilities.base64Decode(base64Data);
  const blob = Utilities.newBlob(decodedBytes, fileType, fileName);

  // Actually create the file in that subFolder
  const fileUrl = uploadFileToDrive(
    blob,
    "Uploaded",
    "File",
    "UploadedFile",
    subFolder
  );

  Logger.log("User file uploaded to: " + fileUrl);
  return fileUrl;
}

/**
 * 3a) Actually writes a blob to the given folder in Drive, returns the file URL.
 */
function uploadFileToDrive(blob, folderName, fileName, fileDescription, parentFolder) {
  try {
    const file = parentFolder.createFile(blob);
    file.setName(fileName);
    file.setDescription(fileDescription);
    return file.getUrl();
  } catch (error) {
    Logger.log("Error in uploadFileToDrive: " + error.message);
    throw error;
  }
}

/**
 * 4) Emails:
 *   - The user (attached PDF summary)
 *   - The owners (attached PDF summary + link to the user file)
 */
function sendAllEmails(userEmail, pdfBlob, data, fileUrl) {
  const rmaNumber = data.rmaNumber || "N/A";
  const rmaRequestType = data.rmaRequestType || "N/A";
  const uploadedFileMessage = fileUrl || "No file uploaded";

  // 1) If user provided an email, send them the PDF summary
  if (userEmail) {
    const subjectUser = "Your RMA Form Submission - PDF Summary";
    const messageUser = `Dear ${data.firstName || "User"},\n\nThank you for submitting your RMA form.\n\nRMA Number: ${rmaNumber}\nRMA Request Type: ${rmaRequestType}\n\nAttached is a PDF summary of your submission.\n\nBest regards,\nArtek`;

    GmailApp.sendEmail(userEmail, subjectUser, messageUser, {
      from: "sales@artek.energy",
      attachments: [pdfBlob],
    });
    Logger.log(`Sent RMA PDF to user: ${userEmail}`);
  }

  // 2) Owners get the PDF + link to the user's uploaded file
  const ownerEmails  = "sales@artek.energy";
  const subjectOwner = "New RMA Submission - PDF & File Upload";
  const messageOwner = `A new RMA submission has been received. Attached is the PDF summary.\n\nRMA Number: ${rmaNumber}\nRMA Request Type: ${rmaRequestType}\nName: ${data.firstName} ${data.lastName}\nEmail: ${data.email}\n\nUploaded File: ${uploadedFileMessage}\n\nBest regards,\nArtek`;

  GmailApp.sendEmail(ownerEmails, subjectOwner, messageOwner, {
    from: "sales@artek.energy",
    attachments: [pdfBlob],
  });
  Logger.log(`Sent RMA PDF + file URL to owners: ${ownerEmails}`);
}

/**
 * Generates a simple unique ID (timestamp) if we need it.
 */
function generateUniqueIdentifier() {
  return new Date().getTime().toString();
}

