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

/** State of one free model of one harness. */
export function isFree(choice: Choice): boolean {
  return FREE_MODEL.test(choice.id);
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

/** Build the list of choices for every harness that the path holds. */
export function collectChoices(freeOnly: boolean): Choice[] {
  const choices: Choice[] = [];
  for (const harness of HARNESSES) {
    for (const id of listModels(harness.name)) {
      const choice = toChoice(harness.name, id);
      if (choice && (!freeOnly || isFree(choice))) {
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
  const choices = collectChoices(freeOnly);

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

  console.log("LCCST benchmark picker");
  console.log(freeOnly ? "Free models only. Set BENCH_ALL_MODELS=1 for every model." : "Every model.");
  const reader = createReader();
  const choice = await selectChoice(choices, reader);
  reader.close();
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
