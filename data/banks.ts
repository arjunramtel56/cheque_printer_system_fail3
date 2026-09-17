// ---------------------------------------------------------------------------
// Nepal institution catalogue.
//
// IMPORTANT — provenance:
//   These entries are a working catalogue assembled from known Nepalese
//   institutions. They are NOT yet reconciled against Nepal Rastra Bank's
//   published licensed-institution list, so NO entry carries a `verifiedAt`
//   date. Before launch an administrator must confirm each entry against the
//   NRB source and stamp it (see /admin/banks). `templateIds` stays empty for
//   every bank until a cheque template has actually been measured from a real
//   sample — a bank with no template is shown to users as "template pending",
//   never as a guessable layout.
//
//   Class A (commercial banks) is complete including merged institutions, so a
//   user holding an older cheque can still find their bank. Class B/C/D are
//   seeded with the well-known names; the remainder can be imported through the
//   admin catalogue importer without touching code.
// ---------------------------------------------------------------------------

import type { Bank, NrbClass } from "../lib/types.ts";

/** ISO date this catalogue revision was assembled (not an NRB verification). */
export const CATALOGUE_REVISION = "2026-09-17";

export const CATALOGUE_DISCLAIMER =
  "Catalogue entries are not yet confirmed against the Nepal Rastra Bank licensed-institution list. " +
  "Bank names, codes and statuses must be verified by an administrator before launch, and no cheque " +
  "template exists for a bank until its layout has been measured from a physical sample.";

function active(id: string, name: string, nrbClass: NrbClass, code?: string): Bank {
  return { id, name, nrbClass, code, status: "active", enabled: true, templateIds: [] };
}

function merged(id: string, name: string, nrbClass: NrbClass, supersededBy: string, code?: string): Bank {
  return { id, name, nrbClass, code, status: "merged", supersededBy, enabled: true, templateIds: [] };
}

// ---------------------------------------------------------------------------
// Class "A" — commercial banks
// ---------------------------------------------------------------------------

const COMMERCIAL_ACTIVE: Bank[] = [
  active("adbl", "Agricultural Development Bank Limited", "A", "ADBLNPKA"),
  active("citizens", "Citizens Bank International Limited", "A", "CTZNBNKA"),
  active("everest", "Everest Bank Limited", "A", "EVBLNPKA"),
  active("global-ime", "Global IME Bank Limited", "A", "GLBBNPKA"),
  active("himalayan", "Himalayan Bank Limited", "A", "HIMANPKA"),
  active("kumari", "Kumari Bank Limited", "A", "KMBLNPKA"),
  active("laxmi-sunrise", "Laxmi Sunrise Bank Limited", "A", "LXBLNPKA"),
  active("machhapuchchhre", "Machhapuchchhre Bank Limited", "A", "MBLENPKA"),
  active("nabil", "Nabil Bank Limited", "A", "NARBNPKA"),
  active("nepal-bank", "Nepal Bank Limited", "A", "NEBLNPKA"),
  active("nepal-investment-mega", "Nepal Investment Mega Bank Limited", "A", "NIBLNPKT"),
  active("nepal-sbi", "Nepal SBI Bank Limited", "A", "NSBINPKA"),
  active("nic-asia", "NIC Asia Bank Limited", "A", "NICENPKA"),
  active("nmb", "NMB Bank Limited", "A", "NMBBNPKA"),
  active("prabhu", "Prabhu Bank Limited", "A", "PRBUNPKA"),
  active("prime", "Prime Commercial Bank Limited", "A", "PCBLNPKA"),
  active("rastriya-banijya", "Rastriya Banijya Bank Limited", "A", "RBBANPKA"),
  active("sanima", "Sanima Bank Limited", "A", "SNMANPKA"),
  active("siddhartha", "Siddhartha Bank Limited", "A", "SIDDNPKA"),
  active("standard-chartered", "Standard Chartered Bank Nepal Limited", "A", "SCBLNPKA"),
];

const COMMERCIAL_MERGED: Bank[] = [
  merged("nepal-bangladesh-bank", "Nepal Bangladesh Bank Limited", "A", "nabil", "NBBLNPKA"),
  merged("bank-of-kathmandu", "Bank of Kathmandu Limited", "A", "global-ime", "BOKLNPKA"),
  merged("mega-bank", "Mega Bank Nepal Limited", "A", "nepal-investment-mega", "MBNLNPKA"),
  merged("nepal-investment-bank", "Nepal Investment Bank Limited", "A", "nepal-investment-mega", "NIBLNPKT"),
  merged("century-bank", "Century Commercial Bank Limited", "A", "prabhu", "CCBNNPKA"),
  merged("nepal-credit-commerce", "Nepal Credit and Commerce Bank Limited", "A", "siddhartha", "NCCBNPKA"),
  merged("sunrise-bank", "Sunrise Bank Limited", "A", "laxmi-sunrise", "SRBLNPKA"),
  merged("civil-bank", "Civil Bank Limited", "A", "sanima", "CIVLNPKA"),
  merged("siddhartha-development", "Siddhartha Development Bank Limited", "B", "siddhartha"),
];

// ---------------------------------------------------------------------------
// Class "B" — national level development banks
// ---------------------------------------------------------------------------

const DEVELOPMENT_BANKS: Bank[] = [
  active("muktinath-bikas", "Muktinath Bikas Bank Limited", "B"),
  active("kamana-sewa-bikas", "Kamana Sewa Bikas Bank Limited", "B"),
  active("garima-bikas", "Garima Bikas Bank Limited", "B"),
  active("shangri-la-development", "Shangri-la Development Bank Limited", "B"),
  active("mahalaxmi-bikas", "Mahalaxmi Bikas Bank Limited", "B"),
  active("lumbini-bikas", "Lumbini Bikas Bank Limited", "B"),
  active("jyoti-bikas", "Jyoti Bikas Bank Limited", "B"),
  active("excel-development", "Excel Development Bank Limited", "B"),
  active("corporate-development", "Corporate Development Bank Limited", "B"),
  active("narayani-development", "Narayani Development Bank Limited", "B"),
  active("sindhu-bikas", "Sindhu Bikas Bank Limited", "B"),
  active("miteri-development", "Miteri Development Bank Limited", "B"),
  active("sahayogi-vikas", "Sahayogi Vikas Bank Limited", "B"),
  active("karnali-development", "Karnali Development Bank Limited", "B"),
  active("green-development", "Green Development Bank Limited", "B"),
];

// ---------------------------------------------------------------------------
// Class "C" — finance companies
// ---------------------------------------------------------------------------

const FINANCE_COMPANIES: Bank[] = [
  active("icfc-finance", "ICFC Finance Limited", "C"),
  active("manjushree-finance", "Manjushree Finance Limited", "C"),
  active("gurkhas-finance", "Gurkhas Finance Limited", "C"),
  active("shree-investment-finance", "Shree Investment and Finance Company Limited", "C"),
  active("best-finance", "Best Finance Company Limited", "C"),
  active("progressive-finance", "Progressive Finance Limited", "C"),
  active("pokhara-finance", "Pokhara Finance Limited", "C"),
  active("guheshwori-merchant-finance", "Guheshwori Merchant Banking and Finance Limited", "C"),
  active("samriddhi-finance", "Samriddhi Finance Company Limited", "C"),
  active("central-finance", "Central Finance Company Limited", "C"),
  active("reliance-finance", "Reliance Finance Limited", "C"),
  active("janaki-finance", "Janaki Finance Company Limited", "C"),
  active("multipurpose-finance", "Multipurpose Finance Company Limited", "C"),
  active("nepal-finance", "Nepal Finance Limited", "C"),
  active("capital-merchant-finance", "Capital Merchant Banking and Finance Limited", "C"),
  active("goodwill-finance", "Goodwill Finance Limited", "C"),
  active("sundhara-finance", "Sundhara Finance Limited", "C"),
];

// ---------------------------------------------------------------------------
// Class "D" — microfinance financial institutions (seed subset)
// ---------------------------------------------------------------------------

const MICROFINANCE: Bank[] = [
  active("chhimek-laghubitta", "Chhimek Laghubitta Bittiya Sanstha Limited", "D"),
  active("nirdhan-utthan-laghubitta", "Nirdhan Utthan Laghubitta Bittiya Sanstha Limited", "D"),
  active("csd-laghubitta", "Center for Self-help Development (CSD) Laghubitta Bittiya Sanstha Limited", "D"),
  active("sana-kisan-bikas", "Sana Kisan Bikas Laghubitta Bittiya Sanstha Limited", "D"),
  active("swabalamban-laghubitta", "Swabalamban Laghubitta Bittiya Sanstha Limited", "D"),
  active("deprosc-laghubitta", "Deprosc Laghubitta Bittiya Sanstha Limited", "D"),
  active("nerude-laghubitta", "Nerude Laghubitta Bittiya Sanstha Limited", "D"),
  active("naya-nepal-laghubitta", "Naya Nepal Laghubitta Bittiya Sanstha Limited", "D"),
  active("mithila-laghubitta", "Mithila Laghubitta Bittiya Sanstha Limited", "D"),
  active("first-micro-finance", "First Micro Finance Laghubitta Bittiya Sanstha Limited", "D"),
  active("kalika-laghubitta", "Kalika Laghubitta Bittiya Sanstha Limited", "D"),
  active("manushi-laghubitta", "Manushi Laghubitta Bittiya Sanstha Limited", "D"),
  active("shrijana-laghubitta", "Shrijana Laghubitta Bittiya Sanstha Limited", "D"),
  active("womi-laghubitta", "Womi Laghubitta Bittiya Sanstha Limited", "D"),
];

/** The complete seeded catalogue. Bank <-> template wiring is applied by
 *  lib/catalogue.ts from the template definitions, so a bank is never listed as
 *  having a template that does not exist. */
export const BANK_LIST: Bank[] = [
  ...COMMERCIAL_ACTIVE,
  ...COMMERCIAL_MERGED,
  ...DEVELOPMENT_BANKS,
  ...FINANCE_COMPANIES,
  ...MICROFINANCE,
];

export const BANK_GROUPS: { nrbClass: NrbClass; label: string; note: string }[] = [
  { nrbClass: "A", label: "Class A · Commercial banks", note: "Complete, including merged institutions." },
  { nrbClass: "B", label: "Class B · Development banks", note: "Seeded subset — extend via admin import." },
  { nrbClass: "C", label: "Class C · Finance companies", note: "Seeded subset — extend via admin import." },
  { nrbClass: "D", label: "Class D · Microfinance institutions", note: "Seed subset — import the full NRB list via admin." },
];
