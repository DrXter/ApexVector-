// Send an AV-12 export to a model running on YOUR machine. Nothing leaves localhost.
//
//   AV_MODEL=<your-model-name> node examples/ask-local-model.mjs examples/sample-export.md
//
// Works with any local runtime that serves an OpenAI-compatible chat endpoint
// (Ollama, llama.cpp server, vLLM). Default endpoint is Ollama's:
//   http://localhost:11434/v1/chat/completions
// Override with AV_ENDPOINT. Local models can be wrong: read the output, do not trust it blindly.
import { readFileSync } from 'node:fs';
import { PROMPT_ASSIGNMENT_NOTE } from '../src/data/sample.js';

const file = process.argv[2];
const model = process.env.AV_MODEL;
const endpoint = process.env.AV_ENDPOINT || 'http://localhost:11434/v1/chat/completions';

if (!file || !model) {
  console.error('Usage: AV_MODEL=<model> node examples/ask-local-model.mjs <export.md|export.json>');
  process.exit(2);
}
const host = new URL(endpoint).hostname;
if (!['localhost', '127.0.0.1', '[::1]'].includes(host)) {
  console.error(`Refusing to send the export to ${host}. This script only talks to localhost.`);
  process.exit(2);
}

const exportText = readFileSync(file, 'utf8');
const content = `${PROMPT_ASSIGNMENT_NOTE}\n\n---\n\n${exportText}`;

const res = await fetch(endpoint, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ model, messages: [{ role: 'user', content }], stream: false }),
});
if (!res.ok) { console.error(`Local model returned ${res.status}: ${await res.text()}`); process.exit(1); }
const data = await res.json();
console.log(data.choices?.[0]?.message?.content ?? JSON.stringify(data, null, 2));
