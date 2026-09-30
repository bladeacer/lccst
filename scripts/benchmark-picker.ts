import { spawnSync } from "child_process";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

/** One model that a harness can run. */
export interface Choice {
  /** Harness that runs the model. */
  harness: string;
  /** Provider part of the model identifier. */
  provider: string;
  /** Model part of the model identifier. */
  model: string;
  /** Full identifier that the harness expects. */
  id: string;
  /** Directory name of the run, built as `provider-harness-model`. */
  tag: string;
}

/** Harness that the picker can drive. */
export interface Harness {
  /** Name of the harness command. */
  name: string;
  /** Configuration file that the harness reads from its workspace. */
  config: string;
}

/** The harnesses that the playground supports. */
export const HARNESSES: Harness[] = [
  { name: "opencode", config: "opencode.json" },
  { name: "kilo", config: "kilo.json" }
];

/** Model identifier of one free model, such as `:free` or `-free`. */
const FREE_MODEL = /(:free|-free|\/free)$/;

/** Registry that publishes the price and the abilities of every model. */
const REGISTRY_URL = "https://models.dev/api.json";

/** Milliseconds the picker waits for the registry before it gives up. */
const REGISTRY_TIMEOUT_MS = 10_000;

/** Command that offers a fuzzy search over the models. */
const FUZZY_COMMAND = "fzf";

/** Prompt that the fuzzy search shows above its list. */
const FUZZY_PROMPT = "model> ";

/**
 * Models that choose another model for each request.
 *
 * A report names the model that ran. A model that routes each request to
 * another model would leave the report naming a model that never ran, so a run
 * must never start on one. The registry marks no model as a router, so the
 * picker names them here.
 *
 * Every entry is the tail of the identifier that the registry uses as the key
 * of a model. A harness prefixes its own name, so a kilo identifier names the
 * same model as an opencode identifier under a longer name.
 */
const ROUTER_MODELS = [
  "openrouter/auto",
  "openrouter/free",
  "kilo-auto/balanced",
  "kilo-auto/efficient",
  "kilo-auto/frontier",
  "kilo-auto/free",
  "kilo-auto/small"
];

/**
 * Model families whose authors do not recommend them for agentic work.
 *
 * The registry states that a model is small and fast, and it states no warning
 * about agentic use. Only the author of a model can say that its model does not
 * fit the work, so the picker names the family here. Add a family when its
 * author says that the model does not fit an agent.
 */
const AGENT_UNSUITED_MODELS = [
  // Liquid AI states that its LFM models do not serve agentic workloads well.
  /(^|\/)lfm/i
];

/** One model of the registry, with the facts that the picker reads. */
export interface RegistryModel {
  /** Every number that the registry states as a price. */
  cost: Record<string, unknown>;
  /** Kinds of token that the model reads. */
  input: string[];
  /** Kinds of token that the model writes. */
  output: string[];
  /** Say whether the model can call a tool. */
  toolCall: boolean;
}

/** Models of the registry, keyed by the identifier that a harness prints. */
export type RegistryModels = Map<string, RegistryModel>;

/** Characters that a directory name may not use from a model identifier. */
const UNSAFE_NAME = /[^a-zA-Z0-9._-]+/g;

/**
 * Split a model identifier into the parts of one run.
 *
 * The function accepts any identifier of the form `provider/model`, where the
 * model part may hold a slash. It returns `null` for anything else.
 */
export function toChoice(harness: string, id: string): Choice | null {
  const trimmed = id.trim();
  const separator = trimmed.indexOf("/");
  if (separator <= 0 || separator === trimmed.length - 1) {
    return null;
  }
  const provider = trimmed.slice(0, separator);
  const model = trimmed.slice(separator + 1);
  return {
    harness,
    provider,
    model,
    id: trimmed,
    tag: `${provider}-${harness}-${model.replace(UNSAFE_NAME, "-")}`
  };
}

/**
 * Say whether one model costs nothing to run.
 *
 * A model name that carries a free marker is free. A model without the marker
 * is free when the registry states no charge for it, so a free model such as
 * `kilo/stealth/space-bunny-alpha` reaches the menu. The name rule stays the
 * first test, because it works without a network.
 */
export function isFree(choice: Choice, models?: RegistryModels): boolean {
  if (FREE_MODEL.test(choice.id)) {
    return true;
  }
  const model = models?.get(choice.id);
  return model !== undefined && isFreeByPrice(model);
}

/**
 * Say whether the registry charges nothing for one model.
 *
 * A model name says nothing about a price. The identifier
 * `stealth/space-bunny-alpha` names a free model at the provider `kilo` and a
 * model that costs 0.05 per input token at the provider `nano-gpt`, so the
 * picker reads the price instead of guessing from the name.
 *
 * A charge is any number that the registry states for a model, because every
 * such number is a token that the user pays for. A model is free only when the
 * registry states `input` and `output` at zero, and when it states no charge
 * for anything else. The check covers `input_audio`, `output_audio`,
 * `reasoning`, `cache_read`, `cache_write`, and `context_over_200k`, and it
 * covers every entry of `tiers`, because a long context can cost more than a
 * short one. A price object that omits `input` or `output` states no price for
 * that token, and an unknown price is not a price of zero. Such a model is not
 * free, because a run that costs the user tokens must not start on a guess.
 */
export function isFreeByPrice(model: RegistryModel): boolean {
  return model.cost.input === 0 && model.cost.output === 0 && !chargesAnyToken(model.cost);
}

/**
 * Say whether the registry states a charge for any token of a price.
 *
 * The function reads every number of the price and every number of every
 * `tiers` entry, so a new chargeable field cannot slip past the picker.
 */
function chargesAnyToken(cost: Record<string, unknown>): boolean {
  const charges = [cost, ...(Array.isArray(cost.tiers) ? cost.tiers : [])];
  return charges.some((entry) =>
    Object.values(asRecord(entry)).some((value) => typeof value === "number" && value !== 0)
  );
}

/**
 * Say whether one model can run a benchmark phase.
 *
 * A benchmark phase asks a model to read a task, write files, and call tools.
 * A model that cannot call a tool cannot do the work, and a model that writes
 * no text cannot write a file. The registry states both facts, so the picker
 * reads them and drops the image, audio, and video models, together with the
 * models of a small size that a vendor states to be unfit for agentic work.
 *
 * The function also drops a model that routes each request to another model,
 * because a report would then name a model that never ran.
 *
 * A model that the registry does not state is kept. The name rule already
 * accepted it, and the picker cannot judge what the registry does not describe.
 */
export function isAgentic(choice: Choice, models: RegistryModels): boolean {
  if (ROUTER_MODELS.some((router) => choice.id.endsWith(router))) {
    return false;
  }
  if (AGENT_UNSUITED_MODELS.some((pattern) => pattern.test(choice.model))) {
    return false;
  }
  const model = models.get(choice.id);
  if (!model) {
    return true;
  }
  return model.toolCall && model.input.includes("text") && model.output.includes("text");
}

/**
 * Read the models of the registry, keyed by the identifier a harness prints.
 *
 * The function is pure, so a unit test can call it with a stored payload.
 */
export function collectRegistryModels(registry: unknown): RegistryModels {
  const models: RegistryModels = new Map();
  for (const [providerId, provider] of Object.entries(asRecord(registry))) {
    for (const [modelId, model] of Object.entries(asRecord(asRecord(provider)?.models))) {
      const entry = asRecord(model);
      const modalities = asRecord(entry?.modalities);
      models.set(`${providerId}/${modelId}`, {
        cost: asRecord(entry?.cost),
        input: toTokens(modalities.input),
        output: toTokens(modalities.output),
        toolCall: entry?.tool_call === true
      });
    }
  }
  return models;
}

/** Read a list of token kinds. A value that is not a list of text yields none. */
function toTokens(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((kind): kind is string => typeof kind === "string")
    : [];
}

/**
 * Read the models of the registry.
 *
 * The function asks the registry for the price and the abilities of every model
 * that a harness offers. It returns an empty map when the registry does not
 * answer, and the picker then falls back to the model name and to the lists that
 * the picker keeps in its own source. A run without a network still offers every
 * model that carries a free marker.
 */
export async function readRegistryModels(): Promise<RegistryModels> {
  try {
    const signal = AbortSignal.timeout(REGISTRY_TIMEOUT_MS);
    const response = await fetch(REGISTRY_URL, { signal });
    return response.ok ? collectRegistryModels(await response.json()) : new Map();
  } catch {
    return new Map();
  }
}

/** Narrow a parsed value to a record. Any other value becomes an empty record. */
function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

/**
 * Read the model identifiers of one harness.
 *
 * The function returns an empty list when the harness is not on the path, so
 * the picker can skip it without failing the run.
 */
export function listModels(harness: string): string[] {
  const result = spawnSync(harness, ["models"], { encoding: "utf-8", timeout: 60000 });
  if (result.error || result.status !== 0) {
    return [];
  }
  return (result.stdout ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.includes("/"));
}

/**
 * Build the list of choices for every harness that the path holds.
 *
 * The function drops every model that costs tokens and every model that cannot
 * run a phase. The price test and the agentic test are separate, so a paid
 * model stays out under `BENCH_ALL_MODELS=1` while a free image model stays out
 * under every setting.
 */
export function collectChoices(
  freeOnly: boolean,
  models: RegistryModels = new Map()
): Choice[] {
  const choices: Choice[] = [];
  for (const harness of HARNESSES) {
    for (const id of listModels(harness.name)) {
      const choice = toChoice(harness.name, id);
      if (choice && isAgentic(choice, models) && (!freeOnly || isFree(choice, models))) {
        choices.push(choice);
      }
    }
  }
  return choices.sort((a, b) => a.id.localeCompare(b.id));
}

/** Keep the choices that hold every term of the filter, in any order. */
export function filterChoices(choices: Choice[], filter: string): Choice[] {
  const terms = filter.toLowerCase().split(/\s+/).filter((term) => term.length > 0);
  if (terms.length === 0) {
    return choices;
  }
  return choices.filter((choice) => {
    const haystack = `${choice.harness} ${choice.id}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

/** Render the numbered list of choices for the terminal. */
export function formatMenu(choices: Choice[]): string {
  const width = String(choices.length).length;
  const rows = choices.map((choice, index) => {
    const number = String(index + 1).padStart(width, " ");
    return `  ${number})  ${choice.harness.padEnd(9)} ${choice.id}`;
  });
  return rows.join("\n");
}

/**
 * Say whether the fuzzy search command is on the path.
 *
 * The picker asks the command for its version, because a command that is on the
 * path but that cannot run must not take over the selection.
 */
export function hasFuzzySearch(): boolean {
  const result = spawnSync(FUZZY_COMMAND, ["--version"], { stdio: "ignore" });
  return !result.error && result.status === 0;
}

/**
 * Render the rows that the fuzzy search offers.
 *
 * Every row names the harness and the model, separated by a tab. A fuzzy
 * search matches the whole row, so a user can type part of a model name to
 * narrow the list, and part of a harness name to narrow it by harness.
 */
export function formatFuzzyRows(choices: Choice[]): string {
  return `${choices.map((choice) => `${choice.harness}\t${choice.id}`).join("\n")}\n`;
}

/**
 * Offer the choices in a fuzzy search and return the chosen one.
 *
 * The function hands the rows to the fuzzy search and waits for the user to
 * press Enter on a row. It returns `null` when the user leaves the search with
 * no row, so the caller reports that no model was selected.
 *
 * The search needs a terminal for its list, and the command opens the terminal
 * of the user by itself. The caller therefore checks for a terminal first.
 */
export function selectChoiceFuzzy(choices: Choice[]): Choice | null {
  const result = spawnSync(
    FUZZY_COMMAND,
    ["--reverse", `--prompt=${FUZZY_PROMPT}`, "--height=40%", "--border"],
    { input: formatFuzzyRows(choices), encoding: "utf-8" }
  );
  const row = (result.stdout ?? "").trim();
  if (result.error || result.status !== 0 || row.length === 0) {
    return null;
  }
  const id = row.split("\t").pop() ?? "";
  return choices.find((choice) => choice.id === id) ?? null;
}

/** One terminal reader that keeps every answer in order. */
export interface LineReader {
  /** Print a question and wait for one line. Returns `null` at end of input. */
  ask: (question: string) => Promise<string | null>;
  /** Release the terminal. */
  close: () => void;
}

/**
 * Open one reader for the whole picker session.
 *
 * The reader queues the lines that arrive early, because a pipe delivers every
 * line at once and a later question would otherwise lose its answer.
 */
export function createReader(): LineReader {
  const queue: string[] = [];
  const waiters: Array<(line: string | null) => void> = [];
  let ended = false;
  const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });

  terminal.on("line", (line) => {
    const waiter = waiters.shift();
    if (waiter) {
      waiter(line);
    } else {
      queue.push(line);
    }
  });
  terminal.on("close", () => {
    ended = true;
    while (waiters.length > 0) {
      waiters.shift()?.(null);
    }
  });

  return {
    ask: (question: string) => {
      process.stdout.write(question);
      const queued = queue.shift();
      if (queued !== undefined) {
        return Promise.resolve(queued);
      }
      if (ended) {
        return Promise.resolve(null);
      }
      return new Promise((resolve) => waiters.push(resolve));
    },
    close: () => terminal.close()
  };
}

/** Ask the user for one choice. Returns `null` when the user cancels. */
export async function selectChoice(
  choices: Choice[],
  reader: LineReader
): Promise<Choice | null> {
  if (choices.length === 0) {
    return null;
  }
  if (choices.length === 1) {
    return choices[0];
  }

  console.log(`\n${choices.length} models available.\n`);
  for (let filter = ""; ; ) {
    const visible = filterChoices(choices, filter);
    if (visible.length === 0) {
      console.log("\nNo model matches that filter.\n");
    } else {
      console.log(formatMenu(visible));
    }
    const answer = await reader.ask("\nFilter (empty to keep, number to pick): ");
    if (answer === null) {
      return null;
    }
    const text = answer.trim();
    if (text === "q") {
      return null;
    }
    if (/^\d+$/.test(text)) {
      // A number picks a row of the list on screen. Without a filter, that
      // list holds every model, so a bare number selects that row.
      const picked = visible[Number(text) - 1];
      if (picked) {
        return picked;
      }
      console.log(`\nThere is no model ${text}.`);
      continue;
    }
    filter = text;
    console.log("");
  }
}

/** Variable that lets a script choose a model without a terminal. */
const PIPE_VARIABLE = "BENCH_ALLOW_PIPE";

/**
 * Refuse to start a run that no human is watching.
 *
 * The picker launches a real model, so a stray newline in a pipe must not start
 * one. The function returns the reason to refuse, or `null` when the run may
 * start.
 */
export function pipeRefusal(env: NodeJS.ProcessEnv, isTTY: boolean): string | null {
  if (isTTY || env[PIPE_VARIABLE] === "1") {
    return null;
  }
  return (
    "The picker needs an interactive terminal, because the run that follows " +
    `costs model tokens. Start it from a terminal, or set ${PIPE_VARIABLE}=1 ` +
    "to let a script choose a model."
  );
}

function harnessOf(target: string): Harness {
  return HARNESSES.find((harness) => harness.name === target) ?? HARNESSES[0];
}

async function main(): Promise<void> {
  const target = process.argv[2] ?? "benchmark-free";
  const freeOnly = process.env.BENCH_ALL_MODELS !== "1";
  const models = await readRegistryModels();
  const choices = collectChoices(freeOnly, models);

  if (process.argv.includes("--list")) {
    console.log(formatMenu(choices));
    process.exit(0);
  }

  const refusal = pipeRefusal(process.env, process.stdin.isTTY === true);
  if (refusal) {
    console.error(refusal);
    process.exit(1);
  }

  if (choices.length === 0) {
    console.error(
      "No harness found a model. Install a harness, or set BENCH_PICK=0 and pass " +
        "HARNESS, PROVIDER and MODEL_NAME."
    );
    process.exit(1);
  }

  const fuzzy = hasFuzzySearch();
  console.log("LCCST benchmark picker");
  console.log(
    freeOnly
      ? "Free models only: a free marker in the name, or no charge in the registry."
      : "Every model."
  );
  console.log(
    `The registry described ${models.size} models. ` +
      `The menu offers ${choices.length} agentic models. ` +
      (freeOnly ? "Set BENCH_ALL_MODELS=1 for every model." : "")
  );
  console.log(
    fuzzy
      ? "Type part of a model name and press Enter."
      : "The fuzzy search is not on the path, so the menu asks for a filter."
  );

  // A reader takes over the standard input, so the picker opens one only when it
// asks for a filter. A fuzzy search must keep the whole keyboard.
  let choice: Choice | null;
  if (fuzzy) {
    choice = selectChoiceFuzzy(choices);
  } else {
    const reader = createReader();
    choice = await selectChoice(choices, reader);
    reader.close();
  }
  if (!choice) {
    console.error("No model selected.");
    process.exit(1);
  }

  console.log(`\nHarness:  ${choice.harness}`);
  console.log(`Model:    ${choice.id}`);
  console.log(`Run name: ${choice.tag}\n`);

  const result = spawnSync(
    "make",
    [
      target,
      "BENCH_PICK=0",
      `HARNESS=${choice.harness}`,
      `PROVIDER=${choice.provider}`,
      `MODEL_NAME=${choice.model.replace(UNSAFE_NAME, "-")}`,
      `BENCH_MODEL_ID=${choice.id}`,
      `BENCH_CONFIG=${harnessOf(choice.harness).config}`
    ],
    { cwd: ROOT, stdio: "inherit" }
  );
  process.exit(result.status ?? 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
