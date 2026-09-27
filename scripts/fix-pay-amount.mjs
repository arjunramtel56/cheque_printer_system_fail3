import { readFileSync, writeFileSync } from "node:fs";

const file = "src/app/[locale]/dashboard/subscription/page.tsx";
let s = readFileSync(file, "utf8");

const broken = `    const p = PLAN_PRICING[plan];
    const amount =
      selectedDuration === "1" ? p.introPrice : p.monthlyPrice * Number(selectedDuration);
    return ;
  }`;

const fixed = `    const p = PLAN_PRICING[plan];
    const amount =
      selectedDuration === "1" ? p.introPrice : p.monthlyPrice * Number(selectedDuration);
    return \`NPR \${amount.toLocaleString()}\`;
  }`;

if (!s.includes(broken)) {
  console.error("BROKEN BLOCK NOT FOUND");
  process.exit(1);
}
s = s.replace(broken, fixed);
writeFileSync(file, s);
console.log("fixed");
