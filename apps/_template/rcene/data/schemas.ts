/**
 * zod schemas for the shipped files. Used by tests (fixtures must validate) and
 * by the data session to check its output before committing.
 */
import { z } from "zod";
import { FACILITY_KINDS, HAZARDS, LEVELS } from "./types.ts";

const position = z.tuple([z.number(), z.number()]).rest(z.number());
const ring = z.array(position).min(4);
const polygon = z.object({ type: z.literal("Polygon"), coordinates: z.array(ring).min(1) });
const multiPolygon = z.object({ type: z.literal("MultiPolygon"), coordinates: z.array(z.array(ring).min(1)).min(1) });
const area = z.union([polygon, multiPolygon]);
const point = z.object({ type: z.literal("Point"), coordinates: position });

const collection = <G extends z.ZodType, P extends z.ZodType>(geometry: G, properties: P) =>
  z.object({
    type: z.literal("FeatureCollection"),
    features: z.array(z.object({ type: z.literal("Feature"), geometry, properties })),
  });

export const hazardSchema = z.enum(HAZARDS);
export const levelSchema = z.enum(LEVELS);

export const boundarySchema = collection(area, z.object({ name: z.string() }).loose());
export const barangaysSchema = collection(area, z.object({ name: z.string().min(1) }).loose());
export const zonesSchema = collection(area, z.object({ hazard: hazardSchema, level: levelSchema }).loose());
export const facilitiesSchema = collection(
  point,
  z.object({ id: z.string().min(1), name: z.string(), kind: z.enum(FACILITY_KINDS) }).loose(),
);
export const heritageSchema = collection(
  point,
  z.object({ id: z.string().min(1), name: z.string().min(1), category: z.string() }).loose(),
);
export const sourcesSchema = z.array(
  z.object({
    file: z.string(),
    title: z.string(),
    attribution: z.string(),
    tier: z.enum(["open", "permission", "synthetic", "fixture"]),
  }).loose(),
);
