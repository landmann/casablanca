import { redirect } from "next/navigation";

import { DEFAULT_SLUG } from "./docs";

export default function MasterPlanIndex() {
  redirect(`/masterplan/${DEFAULT_SLUG}`);
}
