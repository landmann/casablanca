import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { MasterPlanDoc } from "./docs";

export const readDocContent = (doc: MasterPlanDoc): string => {
  const path = join(process.cwd(), "..", "..", "MASTER-PLAN", doc.filename);
  return readFileSync(path, "utf8");
};
