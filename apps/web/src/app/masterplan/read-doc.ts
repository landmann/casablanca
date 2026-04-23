import "server-only";

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { MasterPlanDoc } from "./docs";

export const readDocContent = (doc: MasterPlanDoc): string => {
  const path = join(process.cwd(), "..", "..", doc.path);
  if (!existsSync(path)) {
    return [
      `# ${doc.title}`,
      "",
      `The source file for \`${doc.path}\` is not present in this checkout yet.`,
      "",
      "This route is kept live so the masterplan index remains stable while the document is being added.",
    ].join("\n");
  }

  return readFileSync(path, "utf8");
};
