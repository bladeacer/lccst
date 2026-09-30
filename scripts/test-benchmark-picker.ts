import {
  HARNESSES,
  collectChoices,
  collectRegistryModels,
  filterChoices,
  formatFuzzyRows,
  formatMenu,
  isAgentic,
  isFree,
  isFreeByPrice,
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
assert(!isFree(toChoice("opencode", "opencode/big-pickle")!), "a model without a marker costs");

// -- Registry prices and abilities --------------------------------
// The same model slug is free at one provider and paid at another, so the
// picker must read the price of the provider that the run will use.
const zero = { input: 0, output: 0, cache_read: 0, cache_write: 0 };
const price = (cost: unknown) => ({ models: { model: { cost } } });
const entry = (extra: Record<string, unknown>) => ({
  cost: { ...zero },
  modalities: { input: ["text"], output: ["text"] },
  tool_call: true,
  ...extra
});
const agent = (extra: Record<string, unknown>) => ({ models: { model: entry(extra) } });
const registry = {
  kilo: { models: { "stealth/space-bunny-alpha": entry({}) } },
  openrouter: { models: { "stealth/space-bunny-alpha": entry({}) } },
  "nano-gpt": {
    models: {
      "stealth/space-bunny-alpha": { ...entry({}), cost: { input: 0.05, output: 0.15 } }
    }
  },
  anthropic: { models: { "claude-opus-latest": {} } },
  // A price that omits a token states no price for that token.
  broken: {
    models: {
      "no-output-price": { cost: { input: 0 } },
      "no-input-price": { cost: { output: 0 } }
    }
  },
  // A charge on any token counts, not only on the input and the output.
  cached: price({ ...zero, cache_read: 0.5 }),
  audio: price({ ...zero, input_audio: 0.01 }),
  thinking: price({ ...zero, reasoning: 0.02 }),
  long: price({ ...zero, context_over_200k: 3 }),
  tiered: price({ ...zero, tiers: [{ input: 0, output: 0 }, { input: 6 }] }),
  words: price({ ...zero, note: "free" }),
  full: price({
    input: 0,
    output: 0,
    reasoning: 0,
    input_audio: 0,
    output_audio: 0,
    cache_read: 0,
    cache_write: 0,
    context_over_200k: 0,
    tiers: [{ input: 0, output: 0 }]
  }),
  // A model that cannot call a tool cannot run a phase.
  noTools: agent({ tool_call: false }),
  // A model that writes an image cannot write a file of the benchmark.
  imageOut: agent({ modalities: { input: ["text"], output: ["image"] } }),
  audioOut: agent({ modalities: { input: ["text"], output: ["audio"] } }),
  // A model that reads no text cannot read the task.
  noTextIn: agent({ modalities: { input: ["image"], output: ["text"] } }),
  brokenModalities: agent({ modalities: "text" })
};
const known = collectRegistryModels(registry);
const freeOf = (id: string) => isFreeByPrice(known.get(id)!);

assert(freeOf("kilo/stealth/space-bunny-alpha"), "a model of no charge is free");
assert(freeOf("openrouter/stealth/space-bunny-alpha"), "each provider is read on its own");
assert(freeOf("full/model"), "a model that states every charge at zero is free");
assert(freeOf("words/model"), "a text value in the price is not a charge");
assert(!freeOf("nano-gpt/stealth/space-bunny-alpha"), "the same slug at a paid provider costs");
assert(!freeOf("anthropic/claude-opus-latest"), "a model without a price is not free");
assert(!freeOf("broken/no-output-price"), "a price without an output price is not free");
assert(!freeOf("broken/no-input-price"), "a price without an input price is not free");
assert(!freeOf("cached/model"), "a charge on a cached read token is a charge");
assert(!freeOf("audio/model"), "a charge on an audio token is a charge");
assert(!freeOf("thinking/model"), "a charge on a reasoning token is a charge");
assert(!freeOf("long/model"), "a charge on a long context is a charge");
assert(!freeOf("tiered/model"), "a charge in a price tier is a charge");
assert(collectRegistryModels(null).size === 0, "an empty registry holds no model");
assert(
  collectRegistryModels("nonsense").size === 0,
  "a payload that is not a registry holds no model"
);

const alpha = toChoice("kilo", "kilo/stealth/space-bunny-alpha")!;
assert(!isFree(alpha), "an alpha model is not free by its name alone");
assert(isFree(alpha, known), "the registry makes an alpha model free");
assert(
  !isFree(toChoice("opencode", "nano-gpt/stealth/space-bunny-alpha")!, known),
  "the registry keeps a paid alpha model out"
);
assert(
  isFree(toChoice("kilo", "kilo/stepfun/step-3.7-flash:free")!, new Map()),
  "a free marker still works when the registry is empty"
);
assert(
  isFree(toChoice("opencode", "opencode/space-bunny-free")!, known),
  "a free marker works beside the registry prices"
);

// -- Agentic models -------------------------------------------------
assert(isAgentic(toChoice("kilo", "kilo/stealth/space-bunny-alpha")!, known),
  "a text model that calls tools is agentic");
assert(!isAgentic(toChoice("opencode", "noTools/model")!, known),
  "a model that cannot call a tool is not agentic");
assert(!isAgentic(toChoice("opencode", "imageOut/model")!, known),
  "a model that writes no text is not agentic");
assert(!isAgentic(toChoice("opencode", "audioOut/model")!, known),
  "a model that writes only audio is not agentic");
assert(!isAgentic(toChoice("opencode", "noTextIn/model")!, known),
  "a model that reads no text is not agentic");
assert(!isAgentic(toChoice("opencode", "brokenModalities/model")!, known),
  "a model whose modalities are not a list is not agentic");
assert(isAgentic(toChoice("opencode", "opencode/unknown-model")!, known),
  "a model that the registry does not describe is kept");

// A router would leave the report naming a model that never ran.
assert(!isAgentic(toChoice("opencode", "openrouter/auto")!, known), "a router is not agentic");
assert(
  !isAgentic(toChoice("kilo", "kilo/openrouter/auto")!, known),
  "a kilo router is not agentic"
);
assert(
  !isAgentic(toChoice("kilo", "kilo/kilo-auto/free")!, known),
  "a kilo-auto model is not agentic"
);
assert(!isAgentic(toChoice("opencode", "openrouter/openrouter/free")!, known),
  "a catch-all free route is not agentic");

// The authors of the LFM models state that they do not serve agentic work.
assert(!isAgentic(toChoice("kilo", "kilo/liquid/lfm-2.5-2.6b:free")!, known),
  "a model whose author rejects agentic use is dropped");
assert(!isAgentic(toChoice("kilo", "kilo/pioneer/LiquidAI/LFM2-24B-A2B")!, known),
  "the family rule covers every member of the family");
assert(isAgentic(toChoice("kilo", "kilo/inclusionai/ling-3.0-flash-sante:free")!, known),
  "a model of another family is kept");

const choices = [
  toChoice("opencode", "opencode/space-bunny-free")!,
  toChoice("opencode", "opencode/hy3-free")!,
  toChoice("kilo", "kilo/stepfun/step-3.7-flash:free")!
];

// -- Fuzzy search rows ---------------------------------------------
const fuzzyRows = formatFuzzyRows(choices).split("\n").filter((row) => row.length > 0);
assert(fuzzyRows.length === choices.length, "every choice becomes one row");
assert(
  fuzzyRows.every((row) => row.split("\t").length === 2),
  "a row holds the harness and the model"
);
assert(
  fuzzyRows.every((row) => choices.some((choice) => row.endsWith(choice.id))),
  "a row ends with the model that it offers"
);
assert(
  fuzzyRows.some((row) => row.startsWith("kilo\t")),
  "the harness leads the row so a search can narrow by harness"
);
assert(
  formatFuzzyRows([]) === "\n",
  "an empty list gives the search no row to offer"
);

// -- Filtering ----------------------------------------------------
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
