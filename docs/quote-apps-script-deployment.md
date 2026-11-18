# Quote Apps Script deployment under sales@artek.energy

These packages prepare separate stationary and mobile quote projects to run as
the actual `sales@artek.energy` Google Workspace user. The existing quote
spreadsheets, tabs, column order, and PDF folders are retained. RMA is unchanged.

The quote definitions were reconciled against the stationary and mobile Apps
Script sources supplied on November 17, 2026. Stationary preserves all 42 columns;
mobile preserves all 44 columns. The new workflow adds a separate
`QuoteSubmissionLog` tab for references and processing state. It does not add
columns to either existing quote tab, move old PDFs, or change historical rows.

## Prepare the files

From the repository root:

```powershell
npm run package:quotes
```

The generated projects are in `tmp/quote-deployment/stationary/` and
`tmp/quote-deployment/mobile/`. Each contains:

| File | Use |
| --- | --- |
| `Code.gs` | Paste into the new project's `Code.gs`; contains the shared workflow and the appropriate form definition. |
| `QuoteSummary.html` | Add an HTML file named `QuoteSummary` and paste this template. |
| `appsscript.json` | Replace the project's manifest after enabling manifest display in Project Settings. |
| `script-properties.json` | Enter these key/value pairs in Project Settings > Script Properties; this is configuration, not another script file. |

In each Apps Script editor, use **Files > + > HTML**, name the file
**QuoteSummary**, and replace its default contents with the generated
`QuoteSummary.html`. The Files list must show both `Code.gs` and
`QuoteSummary.html`. The PDF step requires this template before email can be sent.

These generated files are ignored by Git. Rebuild them after editing their
sources in `src/gas/quoteForms/`, `src/gas/stationaryQuote/`, or
`src/gas/mobileQuote/`. The packaging command preserves an existing
`script-properties.json`; on another checkout it creates placeholders that must
be filled in. Production storage IDs belong in these local configuration files
and Script Properties, not committed source.

## Account and storage access

1. Sign into Apps Script as the actual `sales@artek.energy` user. An email alias
   or Google Group cannot own or authorize a deployment. If `sales@` is only an
   alias, stop here: this package deliberately checks the effective execution
   account and would need a different sender arrangement.
2. Give `sales@artek.energy` edit access to both existing quote spreadsheets and
   permission to create files in both existing PDF folders. Existing ownership
   can remain unchanged. Do not make these customer-data resources public.
3. Create two standalone projects under the sales account: **Artek Stationary
   Quotes** and **Artek Mobile Quotes**. Install the three project files above in
   each matching project. Do not combine the two generated `Code.gs` files.

Emails use `MailApp`, sent by the executing sales account, with the display name
**Artek Energy** and reply-to **sales@artek.energy**. This does not require access
to read the sales inbox. Customers continue receiving their confirmation and PDF.
Both forms send internal notifications to **sales@artek.energy**, configured with
`QUOTE_OWNER_EMAILS`.

## Set each project's Script Properties

| Property | Stationary | Mobile |
| --- | --- | --- |
| `QUOTE_SPREADSHEET_ID` | Existing stationary spreadsheet ID | Existing mobile spreadsheet ID |
| `QUOTE_FOLDER_ID` | Existing stationary PDF folder ID | Existing mobile PDF folder ID |
| `QUOTE_SHEET_NAME` | `StationaryFormQuotes` | `MobileFormQuotes` |
| `QUOTE_OWNER_EMAILS` | Comma-separated internal recipients | Comma-separated internal recipients |

The local handoff files have the IDs supplied with the existing scripts. Both
set `QUOTE_OWNER_EMAILS` to `sales@artek.energy`, replacing the previous info/Claire
routing. Missing recipient configuration also defaults to sales.

Script Properties belong to the project, not to an individual deployment
version. Configure both projects separately. The manifest requests only Drive,
Sheets, mail-send, and effective-account identity access.

## Authorize and initialize

In each project's editor, while signed in as sales:

1. Run **checkQuoteSetup** and authorize its requested permissions. It verifies
   the executing account, property values, existing tab and column capacity,
   folder readability, HTML template rendering, mail quota, and any existing
   submission log. It sends no email and creates no quote or PDF file.
   Folder readability is not proof of write
   access; the later test submission verifies the complete operation.
2. Run **initializeQuoteLog**. It creates the `QuoteSubmissionLog` tab with its
   headers if absent. An existing log is validated, not overwritten. The existing
   quotation tab is not modified.
3. Confirm the result reports `submissionLogReady: true`,
   `summaryTemplateReady: true`, and the correct quote
   tab. Never select the existing quote tab as the submission-log destination.

## Create the two web app deployments

For each project choose **Deploy > New deployment > Web app**:

- **Execute as:** Me (`sales@artek.energy`).
- **Who has access:** Anyone, including visitors without a Google login.
- Use a description identifying the form and release `2026-11-17.3`.

Copy each **Web app** URL ending in `/exec`. A new project gets a new URL. The
manifest's equivalent values are `USER_DEPLOYING` and `ANYONE_ANONYMOUS`.

Open each `/exec` URL while signed out. Its read-only response should identify
the expected `form` (`stationary` or `mobile`), `version: "2026-11-17.3"`, and
`status: "success"`. This checks deployment access and code identity, not the
spreadsheet/PDF/email workflow.

For an existing deployment, paste the regenerated `Code.gs`, then use
**Deploy > Manage deployments > Edit > New version > Deploy** to publish the
change while retaining its `/exec` URL. Saving source alone does not update a
versioned deployment.

## Connect the frontend

The React form action names and field names remain compatible:

| Form | Route | Action | Build-time endpoint variable |
| --- | --- | --- | --- |
| Stationary | `/stationaryquote` | `submitStationaryQuote` | `REACT_APP_STATIONARY_QUOTE_URL` |
| Mobile | `/mobilequote` | `submitQuote` | `REACT_APP_MOBILE_QUOTE_URL` |

The browser forms continue sending `application/x-www-form-urlencoded`, with
nested fields encoded as JSON strings. The backend also accepts a JSON object
body through `application/json` or `text/plain`; nested fields can be objects or
JSON strings. JSON body values override matching query parameters. Malformed
JSON, non-object bodies, and invalid nested data return `INVALID_DATA` before
storage or email operations. A simulated `doPost` event can omit the body MIME
type. Keep the browser forms' current encoding: `application/json` introduces a
CORS preflight requirement that JSON parsing alone does not address.

Set these variables to the new sales-owned `/exec` URLs before building. These
public endpoint URLs are embedded in the browser bundle; they are not secrets.
For local builds, `.env.local` can contain the two values shown in `.env.example`.
Both forms default to the sales-owned deployment URLs supplied on November 17,
2026. Set these variables only to override those defaults for a different
deployment.

```powershell
$env:REACT_APP_STATIONARY_QUOTE_URL = 'PASTE_STATIONARY_EXEC_URL'
$env:REACT_APP_MOBILE_QUOTE_URL = 'PASTE_MOBILE_EXEC_URL'
npm run build
```

Publish the frontend through **AWS Amplify Hosting**, in **us-east-1**. The app
serving `forms.artek.energy` is **admin-customer-forms**, app ID
`d2ne8ul2rsgtw9`, production branch **main**. The separate `form-app` app has no
branches and is not the deployment target. This mapping was verified on
November 17, 2026.

Amplify's console-managed build settings run `npm ci --cache .npm --prefer-offline`
and `npm run build`, then publish `build/`. The connected repository is
`artek-energy/admin-customer-forms`. Check the repository connection and job
history if pushes do not start builds. A successful GitHub webhook delivery alone
does not confirm that Amplify started or published a build.

Verify the successful Amplify job uses the intended commit, the served HTML
references the new hashed JavaScript, and that bundle contains both new URLs.
Environment variable changes after building do not update an already-published
bundle. Direct S3 uploads are not the established deployment process for this app.

## Verify before retiring the previous deployments

Submit one clearly labeled test through each published form with an approved
recipient. Confirm all of the following:

- The browser calls the correct new `/exec` URL and can read its JSON response.
- The success message includes the quotation reference.
- Exactly one row is added to the correct existing quotation tab, with the
  original column order and text postal code.
- The PDF appears in the existing folder, contains all answers, and renders
  correctly through Google's PDF conversion.
- The test recipient and configured internal recipients receive the correct
  attachment from sales, with replies directed to sales.
- The matching `QuoteSubmissionLog` row is `COMPLETE` and identifies the quote
  row, PDF, and notification states.

Run editor checks and signed-out health checks before this test. The UI/network
check matters: HTTP success from a terminal alone does not verify browser CORS.

## Retry and recovery behavior

The prepared frontend sends a UUID `submissionId`. An unchanged retry from the
same mounted form keeps its ID; edited answers or a successful reset start a new
ID. Reloading or reopening the form also starts a new ID. Legacy clients without
an ID remain accepted, but receive a server-generated ID and cannot obtain the
same client-side retry protection.

The backend records a claim before writing the quote row. Repeating a completed
submission returns its existing success reference without creating another row,
PDF, or email. A reused ID with different answers is rejected.

If processing fails or is interrupted after claiming the request, further
attempts with that ID return `SUBMISSION_NEEDS_REVIEW`. The UI preserves answers
and tells the customer to contact sales with the reference. Processing is not
automatically replayed: an email can have been accepted immediately before an
execution was interrupted, so exactly-once delivery is not guaranteed.

For recovery, inspect the log's stage, quote-row number, PDF ID, and email states;
reconcile the actual sheet, folder, and sent mail before completing missing work.
`SENDING` is uncertain; `PROCESSING` can indicate an interrupted execution. Do
not delete a claim and resubmit blindly. The script lock coordinates one Apps
Script project; it does not coordinate an old deployment in a different project.
Use one active writer per quotation tab during the production cutover. Coordinate
in-flight submissions and archive the old deployment when switching the frontend;
do not intentionally run public traffic through both projects. Separate projects
writing the same log are unsupported. Concurrent legacy writes can also make the
recorded quote-row number unreliable, so reconcile row contents if an overlap
occurred.

## Local validation

```powershell
node node_modules/react-scripts/bin/react-scripts.js test --watchAll=false --runInBand --runTestsByPath src/gas/quoteForms/QuoteWorkflow.test.js src/utils/quoteSubmission.test.js
npm run build
npm run package:quotes
git diff --check
```

These checks exercise mappings, validation, execution identity, retries, partial
failures, and frontend build compatibility with mocked Google services. They do
not replace sales-account authorization, Google PDF rendering, resource write
access, inbox delivery, or published-frontend acceptance.

References: [Google web app deployment](https://developers.google.com/apps-script/guides/web),
[execution identity](https://developers.google.com/apps-script/reference/base/session#getEffectiveUser()),
[Script Properties](https://developers.google.com/apps-script/guides/properties),
[MailApp](https://developers.google.com/apps-script/reference/mail/mail-app).
