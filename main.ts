import { setFlagsFromString } from "node:v8";
setFlagsFromString("--no-incremental-marking");
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const mod = await import(new URL("./solve.js", import.meta.url).href);
const run = mod.default;

const inputDir = process.env.MAKEFUN_INPUT_DIR ?? "/input";
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

const cases = JSON.parse(readFileSync(join(inputDir, "cases.json"), "utf8"));
const answers = cases.map((c) => run(c.input));
writeFileSync(join(outputDir, "answers.json"), JSON.stringify(answers));