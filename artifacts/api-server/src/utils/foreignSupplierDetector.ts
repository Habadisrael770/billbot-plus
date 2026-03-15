/**
 * foreignSupplierDetector.ts
 * Detects invoices from foreign (non-Israeli) suppliers.
 * Foreign invoices cannot be used for VAT deduction in Israel.
 */

interface ForeignSupplier {
  names: string[];
  country: string;
}

const FOREIGN_SUPPLIERS: ForeignSupplier[] = [
  // USA — Tech
  { names: ["google", "google llc", "google ireland", "google cloud", "google workspace", "gsuite", "g suite", "google ads", "גוגל"], country: "US" },
  { names: ["amazon", "amazon web services", "aws", "amazon.com", "amazon eu", "אמזון"], country: "US" },
  { names: ["microsoft", "microsoft corporation", "microsoft ireland", "azure", "office 365", "microsoft 365", "מיקרוסופט"], country: "US" },
  { names: ["meta", "facebook", "instagram", "whatsapp", "meta platforms", "פייסבוק", "מטא"], country: "US" },
  { names: ["apple", "apple inc", "apple distribution", "itunes", "app store", "אפל"], country: "US" },
  { names: ["zoom", "zoom video", "zoom.us"], country: "US" },
  { names: ["slack", "slack technologies"], country: "US" },
  { names: ["dropbox", "dropbox inc"], country: "US" },
  { names: ["github", "github inc"], country: "US" },
  { names: ["openai", "open ai", "chatgpt"], country: "US" },
  { names: ["anthropic"], country: "US" },
  { names: ["adobe", "adobe inc", "adobe systems", "אדובי"], country: "US" },
  { names: ["salesforce", "salesforce.com"], country: "US" },
  { names: ["hubspot"], country: "US" },
  { names: ["mailchimp", "intuit mailchimp"], country: "US" },
  { names: ["sendgrid", "twilio sendgrid"], country: "US" },
  { names: ["twilio"], country: "US" },
  { names: ["stripe"], country: "US" },
  { names: ["paypal", "paypal inc", "פייפאל"], country: "US" },
  { names: ["netflix", "נטפליקס"], country: "US" },
  { names: ["spotify", "ספוטיפיי"], country: "US" },
  { names: ["godaddy"], country: "US" },
  { names: ["cloudflare"], country: "US" },
  { names: ["digitalocean", "digital ocean"], country: "US" },
  { names: ["linode", "akamai"], country: "US" },
  { names: ["figma"], country: "US" },
  { names: ["notion"], country: "US" },
  { names: ["atlassian", "jira", "confluence", "trello"], country: "US" },
  { names: ["zapier"], country: "US" },
  { names: ["monday.com"], country: "IL" }, // Israeli company — NOT foreign
  { names: ["wix"], country: "IL" }, // Israeli — NOT foreign

  // Europe
  { names: ["spotify ab"], country: "SE" },
  { names: ["booking.com", "booking holdings"], country: "NL" },
  { names: ["airbnb"], country: "US" },

  // Subscriptions with foreign currency as strong signal
];

// Israeli company indicators — these are NOT foreign
const ISRAELI_INDICATORS = [
  "בע\"מ", "בעמ", "ח.פ", "ח.צ", "ע.מ", "עוסק מורשה",
  "רשות המסים", "מע\"מ", "חברה ישראלית",
];

export interface ForeignDetectionResult {
  is_foreign: boolean;
  country: string | null;
  matched_name: string | null;
}

export function detectForeignSupplier(
  vendorName: string | null | undefined,
  currency: string | null | undefined,
  taxId: string | null | undefined,
): ForeignDetectionResult {
  const NOT_FOREIGN: ForeignDetectionResult = { is_foreign: false, country: null, matched_name: null };

  if (!vendorName) return NOT_FOREIGN;

  const lower = vendorName.toLowerCase().trim();

  // If the vendor name contains Israeli business indicators → not foreign
  for (const ind of ISRAELI_INDICATORS) {
    if (vendorName.includes(ind)) return NOT_FOREIGN;
  }

  // Israeli tax ID format: 9 digits starting with common prefixes → not foreign
  if (taxId && /^\d{9}$/.test(taxId.replace(/[-\s]/g, ""))) {
    return NOT_FOREIGN;
  }

  // Check against known foreign supplier list
  for (const supplier of FOREIGN_SUPPLIERS) {
    if (supplier.country === "IL") continue; // Skip Israeli companies
    for (const name of supplier.names) {
      if (lower.includes(name) || name.includes(lower)) {
        return { is_foreign: true, country: supplier.country, matched_name: name };
      }
    }
  }

  // Strong signal: currency is not ILS and vendor doesn't look Israeli
  if (currency && !["ILS", "₪"].includes(currency.toUpperCase())) {
    return { is_foreign: true, country: null, matched_name: null };
  }

  return NOT_FOREIGN;
}

export function getForeignCountryLabel(country: string | null): string {
  const MAP: Record<string, string> = {
    US: "ארה\"ב",
    GB: "בריטניה",
    DE: "גרמניה",
    FR: "צרפת",
    NL: "הולנד",
    SE: "שבדיה",
    IE: "אירלנד",
  };
  return country ? (MAP[country] ?? "חו\"ל") : "חו\"ל";
}
