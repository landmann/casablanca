import { redirect } from "next/navigation";

import { calendarHref } from "../marketing-data";

export default function BookDemoPage() {
	redirect(calendarHref);
}
