let cached: boolean | undefined;

/**
 * True when the browser can create a WebGL2 context. MapLibre 6 requires
 * WebGL2 and throws without it, so BaseMap checks first and shows a message
 * instead. The result is cached for the page.
 */
export function hasWebGL2(): boolean {
  if (cached !== undefined) return cached;
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    cached = gl !== null;
    // Free the probe context right away; browsers cap live contexts (~16).
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    cached = false;
  }
  return cached;
}
