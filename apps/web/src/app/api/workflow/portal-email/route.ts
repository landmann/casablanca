import { createHash } from "node:crypto";

import { api, portalEmailIngressSchema } from "@casedra/api";
import { NextRequest, NextResponse } from "next/server";

import { env } from "@/env";
import { createConvexClient } from "@/server/convexClient";

const buildDedupeKey = (payload: {
	agencySlug: string;
	channel: { externalChannelId?: string; label?: string };
	contact: { email?: string; phone?: string };
	lead: { externalLeadId?: string };
	message: {
		body: string;
		sentAt?: number;
		providerMessageId?: string;
		externalEventId?: string;
		subject?: string;
	};
}) =>
	createHash("sha256")
		.update(
			[
				payload.agencySlug,
				payload.channel.externalChannelId ?? payload.channel.label ?? "portal-email",
				payload.lead.externalLeadId ?? "",
				payload.contact.email?.toLowerCase().trim() ?? "",
				payload.contact.phone?.replace(/[^+\d]/g, "").trim() ?? "",
				payload.message.providerMessageId ?? "",
				payload.message.externalEventId ?? "",
				payload.message.subject ?? "",
				payload.message.body,
				payload.message.sentAt !== undefined
					? String(payload.message.sentAt)
					: "",
			].join("|"),
		)
		.digest("hex");

const statusFromError = (message: string) => {
	if (message.startsWith("FORBIDDEN:")) {
		return 403;
	}
	if (message.startsWith("NOT_FOUND:")) {
		return 404;
	}
	if (message.startsWith("VALIDATION:")) {
		return 400;
	}

	return 500;
};

export async function POST(request: NextRequest) {
	if (!env.WORKFLOW_INGEST_SECRET) {
		return NextResponse.json(
			{ error: "Workflow ingestion is not configured." },
			{ status: 503 },
		);
	}

	const requestSecret = request.headers.get("x-casedra-ingest-secret");
	if (requestSecret !== env.WORKFLOW_INGEST_SECRET) {
		return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
	}

	const parsed = portalEmailIngressSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{
				error: "Invalid portal email payload.",
				issues: parsed.error.flatten(),
			},
			{ status: 400 },
		);
	}

	const sentAt = parsed.data.message.sentAt ?? Date.now();
	const dedupeKey =
		parsed.data.message.dedupeKey ??
		buildDedupeKey({
			agencySlug: parsed.data.agencySlug,
			channel: parsed.data.channel,
			contact: parsed.data.contact,
			lead: parsed.data.lead,
			message: parsed.data.message,
		});

	try {
		const convex = createConvexClient();
		const result = await convex.mutation(api.workflow.ingestPortalEmail, {
			ingestSecret: env.WORKFLOW_INGEST_SECRET,
			agencySlug: parsed.data.agencySlug,
			channel: parsed.data.channel,
			contact: parsed.data.contact,
			lead: parsed.data.lead,
			summary: parsed.data.summary,
			nextRecommendedStep: parsed.data.nextRecommendedStep,
			message: {
				...parsed.data.message,
				sentAt,
				dedupeKey,
			},
		});

		return NextResponse.json({
			ok: true,
			...result,
			dedupeKey,
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Workflow ingestion failed.";

		return NextResponse.json(
			{ error: message },
			{ status: statusFromError(message) },
		);
	}
}
