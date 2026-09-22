import { describe, it } from "node:test";
import assert from "node:assert/strict";
import en from "../../messages/en.json";
import ne from "../../messages/ne.json";
import { locales, defaultLocale } from "../config";

type Tree = Record<string, unknown>;

function flatten(obj: Tree, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object") {
      Object.assign(out, flatten(value as Tree, path));
    } else {
      out[path] = String(value);
    }
  }
  return out;
}

const enFlat = flatten(en as Tree);
const neFlat = flatten(ne as Tree);
const enKeys = Object.keys(enFlat).sort();
const neKeys = Object.keys(neFlat).sort();

const DEVANAGARI = /[\u0900-\u097F]/u;

function placeholders(value: string): string[] {
  return value.match(/\{[^}]+\}/g)?.sort() ?? [];
}

describe("i18n message coverage", () => {
  it("en and ne have identical key sets", () => {
    const missingInNe = enKeys.filter((k) => !neFlat[k]);
    const missingInEn = neKeys.filter((k) => !enFlat[k]);
    assert.deepEqual(missingInNe, [], `Keys missing in ne.json: ${missingInNe.join(", ")}`);
    assert.deepEqual(missingInEn, [], `Keys missing in en.json: ${missingInEn.join(", ")}`);
  });

  it("has no empty or whitespace-only values", () => {
    const emptyEn = enKeys.filter((k) => !enFlat[k].trim());
    const emptyNe = neKeys.filter((k) => !neFlat[k].trim());
    assert.deepEqual(emptyEn, [], `Empty values in en.json: ${emptyEn.join(", ")}`);
    assert.deepEqual(emptyNe, [], `Empty values in ne.json: ${emptyNe.join(", ")}`);
  });

  it("keeps ICU placeholders identical across locales", () => {
    const mismatches: string[] = [];
    for (const key of enKeys) {
      const a = placeholders(enFlat[key]);
      const b = placeholders(neFlat[key] ?? "");
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        mismatches.push(`${key}: en=${JSON.stringify(a)} ne=${JSON.stringify(b)}`);
      }
    }
    assert.deepEqual(mismatches, [], `Placeholder mismatches:\n${mismatches.join("\n")}`);
  });

  it("translates core UI sections (nav, dashboard, auth) into Devanagari", () => {
    const untranslated: string[] = [];
    for (const key of neKeys) {
      if (!/^(nav|dashboard|auth)\./.test(key)) continue;
      if (!DEVANAGARI.test(neFlat[key])) {
        untranslated.push(`${key} = ${neFlat[key]}`);
      }
    }
    assert.deepEqual(untranslated, [], `Not translated to Nepali:\n${untranslated.join("\n")}`);
  });

  it("does not leave English placeholder copy in Nepali nav labels", () => {
    for (const key of neKeys) {
      if (!key.startsWith("nav.")) continue;
      assert.notEqual(neFlat[key], enFlat[key], `nav.${key.split(".")[1]} was not translated`);
    }
  });
});

describe("i18n config", () => {
  it("declares exactly the locales that have message files", () => {
    assert.deepEqual(locales, ["en", "ne"]);
  });

  it("defaultLocale is a supported locale", () => {
    assert.ok(locales.includes(defaultLocale), `${defaultLocale} not in locales`);
  });
});
