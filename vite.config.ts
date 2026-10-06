import { fileURLToPath } from "node:url";
import { rceneApp } from "./rcene/config/vite.ts";

// Port and AI flag come from ./project.json. Nothing outside this folder is read.
export default rceneApp({ dir: fileURLToPath(new URL(".", import.meta.url)) });
