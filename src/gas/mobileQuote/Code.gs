const QUOTE_FORM = {
  key: "mobile",
  action: "submitQuote",
  title: "Mobile Quote",
  referencePrefix: "MQ",
  defaultSheetName: "MobileFormQuotes",
  nestedFields: ["services", "application", "vehicleDetails"],
  // Field order preserves the existing 44 spreadsheet columns.
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
        { path: "services.professionalInstallation", label: "Professional Installation", type: "boolean" }
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
        { path: "application.applicationType", label: "Application Type", type: "text", choices: { commercial: "Commercial", recreational: "Recreational", other: "Other" } },
        { path: "application.commercialApplication", label: "Commercial Application", type: "text" },
        { path: "application.recreationalApplication", label: "Recreational Application", type: "text" },
        { path: "application.otherApplication", label: "Other Application", type: "text" }
      ]
    },
    {
      title: "Vehicle Details",
      fields: [
        { path: "vehicleDetails.yearMakeModel", label: "Vehicle Year, Make, Model", type: "text" },
        { path: "vehicleDetails.engineType", label: "Engine Type", type: "text" },
        { path: "vehicleDetails.offGridDays", label: "Preferred Time Off-grid (Days)", type: "text" }
      ]
    },
    {
      title: "High-draw Appliances",
      fields: [
        { path: "vehicleDetails.highDrawAppliances.airConditioner", label: "Air Conditioner", type: "boolean" },
        { path: "vehicleDetails.highDrawAppliances.airConditionerSpecs", label: "Air Conditioner Specifications", type: "text" },
        { path: "vehicleDetails.highDrawAppliances.inductionCookstove", label: "Induction Cookstove", type: "boolean" },
        { path: "vehicleDetails.highDrawAppliances.microwave", label: "Microwave", type: "boolean" },
        { path: "vehicleDetails.highDrawAppliances.hairDryer", label: "Hair Dryer", type: "boolean" },
        { path: "vehicleDetails.highDrawAppliances.blender", label: "Blender", type: "boolean" },
        { path: "vehicleDetails.highDrawAppliances.otherAppliances", label: "Other Appliances", type: "boolean" },
        { path: "vehicleDetails.highDrawAppliances.other", label: "Other Appliance Details", type: "text" },
        { path: "highDrawAppsSimultaneously", label: "Use Multiple High-draw Appliances Simultaneously", type: "text", choices: { yes: "Yes", no: "No" } }
      ]
    },
    {
      title: "Generator",
      fields: [
        { path: "hasGenerator", label: "Has Generator", type: "text", choices: { yes: "Yes", no: "No" } },
        { path: "generatorMakeModel", label: "Generator Make / Model", type: "text" },
        { path: "hasAutoTransferSwitch", label: "Automatic Transfer Switch", type: "text", choices: { yes: "Yes", no: "No" } }
      ]
    },
    {
      title: "Solar",
      fields: [
        { path: "solarAmount", label: "Desired Solar Capacity (Watts)", type: "text" },
        { path: "solarType", label: "Solar Mount", type: "text", choices: { roof: "Roof mount", deployable: "Deployable", both: "Both" } }
      ]
    },
    {
      title: "Shore Power",
      fields: [
        { path: "shorePower", label: "Shore Power Connection", type: "text" },
        { path: "has240VLoads", label: "240V Loads", type: "text", choices: { yes: "Yes", no: "No" } }
      ]
    },
    {
      title: "Voltage Preferences",
      fields: [
        { path: "preferredSystemVoltage", label: "Has Preferred System Voltage", type: "text", choices: { yes: "Yes", no: "No" } },
        { path: "specifiedVoltage", label: "Specified Voltage", type: "text" },
        { path: "preferredSystemVoltageExplanation", label: "Reason for Voltage Preference", type: "text" }
      ]
    },
    {
      title: "Other Preferences",
      fields: [
        { path: "batteryBankCapacity", label: "Battery Bank Capacity", type: "text" },
        { path: "budget", label: "Budget", type: "text" },
        { path: "timeline", label: "Timeline", type: "text" },
        { path: "additionalDetails", label: "Additional Details", type: "text" }
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
