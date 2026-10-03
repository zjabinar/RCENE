import { fileURLToPath } from "node:url";
import { rceneApp } from "@rcene/config/vite";

// Port and AI flag come from docs/projects/projects.json (row for this folder).
export default rceneApp({ dir: fileURLToPath(new URL(".", import.meta.url)) });
