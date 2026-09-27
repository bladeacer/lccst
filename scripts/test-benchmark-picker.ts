import {
  HARNESSES,
  collectChoices,
  filterChoices,
  formatMenu,
  isFree,
  pipeRefusal,
  toChoice
} from "./benchmark-picker.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) { passed++; console.log(`  PASS: ${name}`); }
  else { failed++; console.error(`  FAIL: ${name}`); }
}

// -- Identifier parsing -------------------------------------------
const opencode = toChoice("opencode", "opencode/space-bunny-free");
assert(opencode?.provider === "opencode", "the provider is the first segment");
assert(opencode?.model === "space-bunny-free", "the model is the rest of the identifier");
assert(opencode?.tag === "opencode-opencode-space-bunny-free", "the tag joins the three parts");
assert(opencode?.id === "opencode/space-bunny-free", "the full identifier is kept");

const nested = toChoice("kilo", "kilo/stepfun/step-3.7-flash:free");
assert(nested?.provider === "kilo", "a nested model keeps its provider");
assert(nested?.tag === "kilo-kilo-stepfun-step-3.7-flash-free", "a nested tag drops the slash");
assert(nested?.tag.includes("/") === false, "a tag holds no slash");

assert(toChoice("opencode", "nospace") === null, "an identifier without a slash is skipped");
assert(toChoice("opencode", "/leading") === null, "an identifier without a provider is skipped");
assert(toChoice("opencode", "trailing/") === null, "an identifier without a model is skipped");

// -- Free model test ----------------------------------------------
assert(isFree(toChoice("opencode", "opencode/space-bunny-free")!), "a -free model is free");
assert(isFree(toChoice("kilo", "kilo/stepfun/step-3.7-flash:free")!), "a :free model is free");
assert(isFree(toChoice("kilo", "kilo/openrouter/free")!), "a /free model is free");
assert(!isFree(toChoice("kilo", "kilo/anthropic/claude-opus-latest")!), "a paid model is not free");
assert(!isFree(toChoice("opencode", "opencode/big-pickle")!), "a model without a marker is not free");

// -- Filtering ----------------------------------------------------
const choices = [
  toChoice("opencode", "opencode/space-bunny-free")!,
  toChoice("opencode", "opencode/hy3-free")!,
  toChoice("kilo", "kilo/stepfun/step-3.7-flash:free")!
];
assert(filterChoices(choices, "").length === 3, "an empty filter keeps every choice");
assert(filterChoices(choices, "kilo").length === 1, "a filter matches the harness");
assert(filterChoices(choices, "free").length === 3, "a filter matches the model text");
assert(filterChoices(choices, "step flash").length === 1, "a filter holds many terms");
assert(filterChoices(choices, "nothing").length === 0, "a filter with no match is empty");
assert(
  filterChoices(choices, "KILO STEP").length === 1,
  "a filter ignores the case of the terms"
);

// -- Menu ---------------------------------------------------------
const menu = formatMenu(choices);
const rows = menu.split("\n");
assert(rows.length === 3, "the menu holds one row per choice");
assert(rows[0].includes("1)  opencode  opencode/space-bunny-free"), "the menu numbers the first row");
assert(/3\)\s+kilo\s+kilo\/stepfun/.test(rows[2]), "the menu pads a short harness name");
assert(
  rows.every((row, index) => row.indexOf(choices[index].id) === rows[0].indexOf(choices[0].id)),
  "the menu aligns the model column"
);

// -- Harness registry ---------------------------------------------
assert(HARNESSES.length >= 2, "the registry holds at least two harnesses");
assert(
  HARNESSES.every((harness) => harness.config.endsWith(".json")),
  "every harness names a configuration file"
);

// -- Terminal guard -----------------------------------------------
assert(pipeRefusal({}, true) === null, "a terminal may start a run");
assert(pipeRefusal({}, false) !== null, "a pipe may not start a run");
assert(
  (pipeRefusal({}, false) ?? "").includes("BENCH_ALLOW_PIPE"),
  "the refusal names the override"
);
assert(pipeRefusal({ BENCH_ALLOW_PIPE: "1" }, false) === null, "the override allows a pipe");
assert(pipeRefusal({ BENCH_ALLOW_PIPE: "0" }, false) !== null, "only the value 1 overrides");

// -- Discovery ----------------------------------------------------
const discovered = collectChoices(true);
assert(Array.isArray(discovered), "discovery returns a list");
if (discovered.length > 0) {
  assert(
    discovered.every((choice) => isFree(choice)),
    "discovery keeps only free models by default"
  );
  assert(
    discovered.every((choice) => choice.tag.includes(choice.harness)),
    "every discovered choice carries its harness in the tag"
  );
} else {
  console.log("  SKIP: no harness on the path, so discovery returns nothing to check");
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
