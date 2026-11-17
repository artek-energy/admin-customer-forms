const QUOTE_FORM = {
  key: "stationary",
  action: "submitStationaryQuote",
  title: "Stationary Quote",
  referencePrefix: "SQ",
  defaultSheetName: "StationaryFormQuotes",
  nestedFields: ["services", "application", "system"],
  // Field order preserves the existing 42 spreadsheet columns.
  groups: [
    {
      title: "Contact Information",
      fields: [
        { path: "firstName", label: "First Name", type: "text" },
        { path: "lastName", label: "Last Name", type: "text" },
        { path: "company", label: "Company", type: "text" },
        { path: "email", label: "Email", type: "text" },
        { path: "phone", label: "Phone", type: "text" },
        { path: "addressLine1", label: "Address Line 1", type: "text" },
        { path: "addressLine2", label: "Address Line 2", type: "text" },
        { path: "city", label: "City", type: "text" },
        { path: "state", label: "State / Province", type: "text" },
        { path: "postalCode", label: "Postal Code", type: "text" },
        { path: "country", label: "Country", type: "text" }
      ]
    },
    {
      title: "Services",
      fields: [
        { path: "services.diyInstallation", label: "DIY Installation", type: "boolean" },
        { path: "services.preWiredBoard", label: "Pre-wired Board by Artek", type: "boolean" }
      ]
    },
    {
      title: "Platform",
      fields: [
        { path: "platform", label: "Platform", type: "text" }
      ]
    },
    {
      title: "Application",
      fields: [
        { path: "application.type", label: "Application Type", type: "text", choices: { commercial: "Commercial", recreational: "Recreational", other: "Other" } },
        { path: "application.commercialDetails", label: "Commercial Details", type: "text" },
        { path: "application.recreationalDetails", label: "Recreational Details", type: "text" },
        { path: "application.otherDetails", label: "Other Details", type: "text" }
      ]
    },
    {
      title: "System Specifications",
      fields: [
        { path: "system.systemType", label: "System Type", type: "text", choices: { offGrid: "Off-grid", gridTied: "Grid-tied" } },
        { path: "system.requiresPermitting", label: "Requires Permitting", type: "text", choices: { yes: "Yes", no: "No" } },
        { path: "system.systemVoltage", label: "System Voltage", type: "text", choices: { "120V": "120V", "240V": "240V", "208V": "3 phase 208V", "480V": "3 phase 480V" } },
        { path: "system.inverterCapacity", label: "Inverter Capacity", type: "text" }
      ]
    },
    {
      title: "High-draw Appliances",
      fields: [
        { path: "system.highDrawAppliances.airConditioner", label: "Air Conditioner", type: "boolean" },
        { path: "system.highDrawAppliances.airConditionerSpecs", label: "Air Conditioner Specifications", type: "text" },
        { path: "system.highDrawAppliances.inductionCookstove", label: "Induction Cookstove", type: "boolean" },
        { path: "system.highDrawAppliances.microwave", label: "Microwave", type: "boolean" },
        { path: "system.highDrawAppliances.hairDryer", label: "Hair Dryer", type: "boolean" },
        { path: "system.highDrawAppliances.blender", label: "Blender", type: "boolean" },
        { path: "system.highDrawAppliances.otherAppliances", label: "Other Appliances", type: "boolean" },
        { path: "system.highDrawAppliances.other", label: "Other Appliance Details", type: "text" },
        { path: "system.highDrawAppliancesSimultaneous", label: "Use Multiple High-draw Appliances Simultaneously", type: "text", choices: { yes: "Yes", no: "No" } }
      ]
    },
    {
      title: "Generator",
      fields: [
        { path: "system.generator.hasGenerator", label: "Has Generator", type: "text", choices: { yes: "Yes", no: "No" } },
        { path: "system.generator.makeModel", label: "Generator Make / Model", type: "text" },
        { path: "system.generator.hasTransferSwitch", label: "Automatic Transfer Switch", type: "text", choices: { yes: "Yes", no: "No" } }
      ]
    },
    {
      title: "Solar",
      fields: [
        { path: "system.solarAmount", label: "Desired Solar Capacity (Watts)", type: "text" },
        { path: "system.solarMount", label: "Solar Mount", type: "text", choices: { roof: "Roof mount", ground: "Ground mount", both: "Both" } }
      ]
    },
    {
      title: "Voltage Preferences",
      fields: [
        { path: "system.preferredVoltage", label: "Preferred System Voltage", type: "text" },
        { path: "system.preferredVoltageExplanation", label: "Reason for Voltage Preference", type: "text" }
      ]
    },
    {
      title: "Other Preferences",
      fields: [
        { path: "system.batteryBankCapacity", label: "Battery Bank Capacity", type: "text" },
        { path: "system.budget", label: "Budget", type: "text" },
        { path: "system.timeline", label: "Timeline", type: "text" },
        { path: "system.additionalDetails", label: "Additional Details", type: "text" }
      ]
    }
  ]
};

function doPost(e) {
  return submitQuote_(e, QUOTE_FORM);
}

function doGet() {
  return quoteHealth_(QUOTE_FORM);
}

function checkQuoteSetup() {
  return checkQuoteSetup_(QUOTE_FORM);
}

function initializeQuoteLog() {
  return initializeQuoteLog_(QUOTE_FORM);
}
