/**
 * Production entry of the AI relay (rscene-api.service on the VPS). Built into one
 * dependency-free file, dist-server/api.mjs, by `npm run build:server`, so the server
 * needs only Node, no npm install. Settings and keys come from the environment
 * (systemd EnvironmentFile=/srv/rscene/.env). See sources/deploy/README.md (reference).
 */
import { createAiServer, readStandaloneSettings } from "../rcene/ai/server/standalone.ts";

const env = process.env;
const { port, host, perMinute, requireOrigin } = readStandaloneSettings(env);
const server = createAiServer({ env });

server.listen(port, host, () => {
  console.log(`rscene-api listening on http://${host}:${port} (provider ${env.AI_PROVIDER ?? "demo"}, ${perMinute || "no"} completions/min limit, origin ${requireOrigin ? "required" : "optional"})`);
});

const stop = () => server.close(() => process.exit(0));
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
