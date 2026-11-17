# Admin Customer Forms

## Description

Admin Customer Forms is a React application for collecting customer and operations data for Artek workflows. It provides browser-based forms for mobile power system quotes, stationary power system quotes, return merchandise authorization (RMA) submissions, and 3D printed item shipping requests.

The application is intended for customers and internal staff who need to submit structured intake information without manual email back-and-forth. Within the broader system, this repository serves as the frontend entry point for form collection and routes submissions to published Google Apps Script web apps. The repository includes Google Apps Script source for the RMA, stationary quote, and mobile quote workflows.

## Features

- Home page with navigation to all supported forms
- Mobile quotation intake form for vehicle and mobile-platform electrical system requests
- Stationary quotation intake form for off-grid, grid-tied, and related stationary power system requests
- RMA submission form with generated RMA numbers, Victron-specific branching, and embedded pre-RMA bench test references
- 3D printed item shipping form with freight and claims acknowledgements
- Client-side form submission with success and error toast notifications
- Bundled Google Apps Script source for the RMA workflow, including spreadsheet logging, PDF summary generation, Google Drive storage, and email notifications

## Tech Stack

- JavaScript
- React 18
- React Router DOM 6
- Create React App (`react-scripts`)
- React Toastify
- Google Apps Script for the RMA backend integration
- Google Sheets, Google Drive, and Gmail services through Apps Script
- Jest and React Testing Library

## Installation

### Prerequisites

- Node.js with npm
- Access to the Google Apps Script web apps used by the forms if you need to change or redeploy backend integrations
- Google Workspace permissions for Drive, Sheets, and Gmail if you plan to use or modify the bundled RMA Apps Script

### Setup

1. Clone the repository.

```bash
git clone <repository-url>
cd admin-customer-forms
```

2. Install dependencies.

```bash
npm install
```

3. Start the development server.

```bash
npm start
```

4. Open `http://localhost:3000` in a browser.

## Usage

Run the application locally with:

```bash
npm start
```

Available routes:

- `/` - navigation landing page
- `/mobilequote` - mobile quotation form
- `/stationaryquote` - stationary quotation form
- `/rma` - RMA submission form
- `/threed` - 3D shipping form

To create a production build:

```bash
npm run build
```

The frontend submits form data directly to published Google Apps Script web app URLs defined in the form components.

## Configuration

The quote forms accept build-time endpoint overrides through `REACT_APP_STATIONARY_QUOTE_URL` and `REACT_APP_MOBILE_QUOTE_URL`. See `.env.example`. Existing endpoint URLs remain fallbacks until the replacement deployments are ready. RMA and 3D form endpoints remain defined in their components.

Frontend endpoint configuration lives in:

- `src/components/MobileQuoteForm.js`
- `src/components/StationaryQuoteForm.js`
- `src/components/ThreeDForm.js`
- `src/components/RmaForm.js`

The bundled RMA Apps Script configuration lives in:

- `src/gas/rmaForm/Code.gs`

Quote backend source lives in `src/gas/quoteForms/` (shared workflow, PDF template,
and manifest), `src/gas/stationaryQuote/`, and `src/gas/mobileQuote/`. Run
`npm run package:quotes` to prepare the two copy-ready Apps Script projects.
Configure their existing storage destinations in Script Properties. Follow the
[sales-account deployment guide](docs/quote-apps-script-deployment.md) for account
access, authorization, packaging, frontend endpoint configuration, and acceptance.

Important RMA Apps Script values to review before deployment:

- Google Drive folder ID used to store generated files
- Google Sheets spreadsheet ID used to log submissions
- Sender and recipient email addresses
- To send RMA emails from `sales@artek.energy`, the Apps Script executing account must have `sales@artek.energy` configured as an available Gmail send-as alias. Sending from `sales@artek.energy` to `sales@artek.energy` is valid; if the alias is unavailable, Gmail sends from the executing account instead.

Required external configuration and secrets should be managed outside the repository. Do not commit production folder IDs, spreadsheet IDs, account credentials, or service-specific secrets in source control.

## Development

Start the local development server:

```bash
npm start
```

Create a production bundle:

```bash
npm run build
```

Linting is provided through the Create React App ESLint configuration and runs during `npm start` and `npm run build`. There is no dedicated formatting or standalone lint script in `package.json`.

## Testing

Run the test suite with:

```bash
npm test -- --watchAll=false
```

Important notes:

- The current repository includes a single default Create React App test in `src/App.test.js`.
- That test does not match the current UI and fails as written.
- Focused quote regression tests cover field mappings, validation, execution identity, submission references, duplicate requests, and partial failures using mocked Google services. The deployment guide lists the targeted command. Live Google services still require deployment acceptance.

## Deployment

This repository does not include host-specific frontend deployment configuration such as Vercel, Netlify, AWS, or Firebase setup.

Current deployment considerations:

- The frontend builds to static assets in `build/`.
- The build currently assumes the app is hosted at `/`.
- Because the app uses `BrowserRouter`, the production host must be configured to serve `index.html` for client-side routes.
- Google Apps Script web apps used as form backends must be deployed separately.
- Quote Apps Script projects can be packaged with `npm run package:quotes`; the operator deploys them from the sales account. The repository does not contain `clasp` credentials or automate live deployment.

## Project Structure

```text
.
|-- public/                 Static assets and HTML template
|-- src/
|   |-- components/         Reusable form controls and form implementations
|   |-- gas/
|   |   |-- rmaForm/        RMA Apps Script source
|   |   |-- quoteForms/     Shared quote workflow, PDF template, manifest, and tests
|   |   |-- stationaryQuote/ Stationary fields and entry points
|   |   `-- mobileQuote/    Mobile fields and entry points
|   |-- images/             Application image assets
|   |-- pages/              Route-level page components
|   |-- App.js              Application router
|   |-- App.test.js         Current test file
|   |-- index.js            React entry point
|   `-- index.css           Global styles
|-- package.json            Scripts and dependency definitions
`-- README.md
```

## Known Issues / Limitations

- Quote endpoint overrides are baked into the frontend build; changing a deployment URL requires rebuilding and publishing the frontend.
- The 3D form backend remains an externally managed Apps Script endpoint.
- `src/components/RmaForm.js` contains unused upload-related imports and functions, which produce ESLint warnings during production builds.
- The RMA backend supports file upload handling, but the current RMA form UI does not render the `FileUpload` component.
- The automated test suite is currently outdated and failing.

## Contributing

No formal contribution process is documented in this repository.

When making changes:

- Preserve the existing form payload shapes expected by the Google Apps Script endpoints
- Verify route behavior and form submission flows manually
- Update tests and documentation when user-visible behavior changes
- Review hard-coded integration values carefully before committing

## License

No license file is included in this repository.
