// Company email mapping for customer care complaints
// Must match exactly with company names in the form dropdown
export const COMPANY_EMAIL_MAP: Record<string, string> = {
  "Legend Motors": "support@legendmotorsuae.com",
  "212": "info@212uae.com",
  "Kaiyi": "sales@kaiyi.ae",
  "Skywell": "skywell@legendmotorsuae.com",
  "Legend Commercial Vehicles": "commercial.sales@legendmotorsuae.com",
  "Legend AutoHub": "care@legendautohub.ae",
  "Legend Motorcycles - Lifan": "info@legendlifan.com",
  "Legend Rent a Car": "info@legendrentacar.com",
  "Legend Auto Services": "info@legendautoservices.com",
  "Legend Travel and Tourism": "leisure@legendtravels.com",
  "Legend Green Energy Solutions": "info@legendenergysolutions.com",
  "Legend X": "info@legendx.ae",
  "Zul Energy": "info@zulenergy.com",
};

// Business head email mapping for escalation emails
// Update these with actual business head email addresses
export const BUSINESS_HEAD_EMAIL_MAP: Record<string, string> = {
  "Legend Motors": "nagaraj.p@legendmotorsuae.com",
  "212": "cannon.wang@legendmotorsuae.com",
  "Kaiyi": "cannon.wang@legendmotorsuae.com",
  "Skywell": "cannon.wang@legendmotorsuae.com",
  "Legend Commercial Vehicles": "yue.hua@legendmotorsuae.com",
  "Legend AutoHub": "nagaraj.p@legendmotorsuae.com",
  "Legend Motorcycles - Lifan": "baz@legendholding.com",
  "Legend Rent a Car": "pawan.rathi@legendrentacar.com",
  "Legend Auto Services": "tamer.khalil@legendmotorsuae.com",
  "Legend Travel and Tourism": "sky.martires@legendtravels.com",
  "Legend Green Energy Solutions": "baz@legendholding.com",
  "Legend X": "jerrical.dai@legendmotorsuae.com",
  "Zul Energy": "jade.li@zulenergy.com",
};

export function getCompanyEmail(companyName: string): string | null {
  return COMPANY_EMAIL_MAP[companyName] || null;
}

export function getBusinessHeadEmail(companyName: string): string | null {
  return BUSINESS_HEAD_EMAIL_MAP[companyName] || null;
}
