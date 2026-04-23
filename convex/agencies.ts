import type { Doc, Id } from "./_generated/dataModel";
import {
	type MutationCtx,
	mutation,
	type QueryCtx,
	query,
} from "./_generated/server";
import {
	findCurrentMembership,
	requireAuthenticatedUserId,
	requireCurrentMembership,
} from "./auth";

const DEFAULT_COUNTRY = "Spain";
const DEFAULT_TIMEZONE = "Europe/Madrid";
const DEFAULT_AGENCY_NAME = "Casedra Workspace";

type SeedMember = {
	userId: string;
	role: "owner" | "agent";
	displayName: string;
};

type SeedConversation = {
	contact: {
		kind: "buyer" | "seller" | "unknown";
		fullName: string;
		email?: string;
		phone?: string;
		preferredLanguage?: string;
		notes?: string;
	};
	lead: {
		kind: "buyer_inquiry" | "seller_inquiry" | "valuation_request" | "other";
		channelId: Id<"channels">;
		sourceType: "whatsapp" | "portal_email" | "web_form" | "manual";
		sourceLabel: string;
		status: "new" | "active" | "closed";
		receivedAt: number;
	};
	conversation: {
		state: "new" | "bot_active" | "awaiting_human" | "human_active" | "closed";
		ownerType: "unassigned" | "ai" | "human";
		ownerUserId?: string;
		summary?: string;
		nextRecommendedStep?: string;
		closedAt?: number;
	};
	messages: Array<{
		direction: "inbound" | "outbound" | "internal";
		senderType: "lead" | "ai" | "user" | "system";
		senderUserId?: string;
		body: string;
		sentAt: number;
	}>;
	assignment?: {
		assigneeUserId: string;
		assignedByUserId: string;
		reason: string;
		active: boolean;
		createdAt: number;
		endedAt?: number;
	};
	handoff?: {
		fromOwnerType: "unassigned" | "ai" | "human";
		fromUserId?: string;
		toOwnerType: "unassigned" | "ai" | "human";
		toUserId?: string;
		trigger:
			| "low_confidence"
			| "lead_requested_human"
			| "manual_takeover"
			| "routing_rule"
			| "manager_reassign"
			| "other";
		createdAt: number;
	};
};

const slugify = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)+/g, "");

const serializeAgency = (agency: Doc<"agencies">) => ({
	id: agency._id,
	name: agency.name,
	slug: agency.slug,
	country: agency.country,
	timezone: agency.timezone,
	status: agency.status,
	createdAt: agency.createdAt,
	updatedAt: agency.updatedAt,
});

const serializeMembership = (membership: Doc<"agencyMemberships">) => ({
	id: membership._id,
	agencyId: membership.agencyId,
	userId: membership.userId,
	role: membership.role,
	status: membership.status,
	displayName: membership.displayName ?? null,
	createdAt: membership.createdAt,
	updatedAt: membership.updatedAt,
});

const loadCurrentAgencyForUser = async (
	ctx: QueryCtx | MutationCtx,
	userId: string,
) => {
	const membership = await findCurrentMembership(ctx, userId);
	if (!membership) {
		return null;
	}

	const agency = await ctx.db.get(membership.agencyId);
	if (!agency) {
		return null;
	}

	return {
		agency: serializeAgency(agency),
		membership: serializeMembership(membership),
	};
};

const buildUniqueSlug = async (ctx: MutationCtx, baseSlug: string) => {
	let candidate = baseSlug;
	let counter = 1;

	while (
		await ctx.db
			.query("agencies")
			.withIndex("by_slug", (q) => q.eq("slug", candidate))
			.unique()
	) {
		counter += 1;
		candidate = `${baseSlug}-${counter}`;
	}

	return candidate;
};

const insertSeedConversation = async (
	ctx: MutationCtx,
	agencyId: Id<"agencies">,
	payload: SeedConversation,
) => {
	const now = payload.lead.receivedAt;
	const contactId = await ctx.db.insert("contacts", {
		agencyId,
		kind: payload.contact.kind,
		fullName: payload.contact.fullName,
		email: payload.contact.email,
		phone: payload.contact.phone,
		preferredLanguage: payload.contact.preferredLanguage,
		notes: payload.contact.notes,
		createdAt: now,
		updatedAt: now,
	});

	const leadId = await ctx.db.insert("leads", {
		agencyId,
		contactId,
		channelId: payload.lead.channelId,
		kind: payload.lead.kind,
		sourceType: payload.lead.sourceType,
		sourceLabel: payload.lead.sourceLabel,
		status: payload.lead.status,
		receivedAt: payload.lead.receivedAt,
		createdAt: now,
		updatedAt: now,
	});

	const outboundMessages = payload.messages.filter(
		(message) => message.direction === "outbound",
	);
	const inboundMessages = payload.messages.filter(
		(message) => message.direction === "inbound",
	);
	const lastMessageAt = payload.messages.reduce(
		(latest, message) => Math.max(latest, message.sentAt),
		payload.lead.receivedAt,
	);
	const conversationCreatedAt = Math.min(
		...payload.messages.map((message) => message.sentAt),
		payload.lead.receivedAt,
	);
	const conversationId = await ctx.db.insert("conversations", {
		agencyId,
		leadId,
		contactId,
		channelId: payload.lead.channelId,
		state: payload.conversation.state,
		ownerType: payload.conversation.ownerType,
		ownerUserId: payload.conversation.ownerUserId,
		version: 1,
		sourceType: payload.lead.sourceType,
		sourceLabel: payload.lead.sourceLabel,
		summary: payload.conversation.summary,
		nextRecommendedStep: payload.conversation.nextRecommendedStep,
		firstResponseAt: outboundMessages[0]?.sentAt,
		lastInboundAt: inboundMessages.at(-1)?.sentAt,
		lastOutboundAt: outboundMessages.at(-1)?.sentAt,
		lastMessageAt,
		closedAt: payload.conversation.closedAt,
		createdAt: conversationCreatedAt,
		updatedAt: lastMessageAt,
	});

	for (const message of payload.messages) {
		await ctx.db.insert("messages", {
			agencyId,
			conversationId,
			direction: message.direction,
			senderType: message.senderType,
			senderUserId: message.senderUserId,
			body: message.body,
			bodyFormat: "plain_text",
			sentAt: message.sentAt,
			createdAt: message.sentAt,
		});
	}

	if (payload.assignment) {
		await ctx.db.insert("assignments", {
			agencyId,
			conversationId,
			assigneeUserId: payload.assignment.assigneeUserId,
			assignedByUserId: payload.assignment.assignedByUserId,
			reason: payload.assignment.reason,
			active: payload.assignment.active,
			createdAt: payload.assignment.createdAt,
			endedAt: payload.assignment.endedAt,
		});
	}

	if (payload.handoff) {
		await ctx.db.insert("handoffEvents", {
			agencyId,
			conversationId,
			fromOwnerType: payload.handoff.fromOwnerType,
			fromUserId: payload.handoff.fromUserId,
			toOwnerType: payload.handoff.toOwnerType,
			toUserId: payload.handoff.toUserId,
			trigger: payload.handoff.trigger,
			summarySnapshot: payload.conversation.summary,
			recommendation: payload.conversation.nextRecommendedStep,
			createdAt: payload.handoff.createdAt,
		});
	}
};

const seedDefaultWorkspace = async (
	ctx: MutationCtx,
	agencyId: Id<"agencies">,
	ownerUserId: string,
) => {
	const now = Date.now();
	const members: SeedMember[] = [
		{
			userId: ownerUserId,
			role: "owner",
			displayName: "Workspace owner",
		},
		{
			userId: "demo:marta-ruiz",
			role: "agent",
			displayName: "Marta Ruiz",
		},
		{
			userId: "demo:javier-ortega",
			role: "agent",
			displayName: "Javier Ortega",
		},
	];

	for (const member of members) {
		await ctx.db.insert("agencyMemberships", {
			agencyId,
			userId: member.userId,
			role: member.role,
			status: "active",
			displayName: member.displayName,
			createdAt: now,
			updatedAt: now,
		});
	}

	const portalEmailChannelId = await ctx.db.insert("channels", {
		agencyId,
		type: "portal_email",
		label: "Idealista forwards",
		status: "active",
		provider: "forwarded_email",
		config: {
			mailbox: "leads@casedra.local",
		},
		createdAt: now,
		updatedAt: now,
	});

	const whatsappChannelId = await ctx.db.insert("channels", {
		agencyId,
		type: "whatsapp",
		label: "Front desk WhatsApp",
		status: "active",
		provider: "twilio",
		config: {
			phoneNumber: "+34 600 123 456",
		},
		createdAt: now,
		updatedAt: now,
	});

	const webFormChannelId = await ctx.db.insert("channels", {
		agencyId,
		type: "web_form",
		label: "Owner valuation form",
		status: "active",
		provider: "web",
		createdAt: now,
		updatedAt: now,
	});

	await ctx.db.insert("channels", {
		agencyId,
		type: "manual",
		label: "Manual intake",
		status: "active",
		provider: "internal",
		createdAt: now,
		updatedAt: now,
	});

	await insertSeedConversation(ctx, agencyId, {
		contact: {
			kind: "buyer",
			fullName: "Ana Garcia",
			email: "ana@example.com",
			phone: "+34 612 431 210",
			preferredLanguage: "es",
		},
		lead: {
			kind: "buyer_inquiry",
			channelId: portalEmailChannelId,
			sourceType: "portal_email",
			sourceLabel: "Idealista forwards",
			status: "active",
			receivedAt: now - 55 * 60 * 1000,
		},
		conversation: {
			state: "awaiting_human",
			ownerType: "human",
			ownerUserId: "demo:marta-ruiz",
			summary:
				"Buyer wants a Saturday viewing in Chamberi and asked about renovation timing after the bot qualified budget.",
			nextRecommendedStep:
				"Confirm the earliest viewing slot and answer the renovation works question with human context.",
		},
		messages: [
			{
				direction: "inbound",
				senderType: "lead",
				body: "Hola, is the Chamberi flat still available? We could visit on Saturday.",
				sentAt: now - 55 * 60 * 1000,
			},
			{
				direction: "outbound",
				senderType: "ai",
				body: "Yes, it is available. Could you share your budget and preferred visit window?",
				sentAt: now - 52 * 60 * 1000,
			},
			{
				direction: "inbound",
				senderType: "lead",
				body: "Budget is around 780k. Also, how disruptive are the hallway works?",
				sentAt: now - 46 * 60 * 1000,
			},
			{
				direction: "internal",
				senderType: "system",
				body: "Low-confidence handoff created for human review.",
				sentAt: now - 44 * 60 * 1000,
			},
		],
		assignment: {
			assigneeUserId: "demo:marta-ruiz",
			assignedByUserId: ownerUserId,
			reason: "Low-confidence handoff from AI",
			active: true,
			createdAt: now - 44 * 60 * 1000,
		},
		handoff: {
			fromOwnerType: "ai",
			toOwnerType: "human",
			toUserId: "demo:marta-ruiz",
			trigger: "low_confidence",
			createdAt: now - 44 * 60 * 1000,
		},
	});

	await insertSeedConversation(ctx, agencyId, {
		contact: {
			kind: "buyer",
			fullName: "Carlos Moreno",
			phone: "+34 611 111 222",
			preferredLanguage: "es",
		},
		lead: {
			kind: "buyer_inquiry",
			channelId: whatsappChannelId,
			sourceType: "whatsapp",
			sourceLabel: "Front desk WhatsApp",
			status: "active",
			receivedAt: now - 38 * 60 * 1000,
		},
		conversation: {
			state: "bot_active",
			ownerType: "ai",
			summary:
				"Buyer is asking about parking and current availability on a Chamartin listing over WhatsApp.",
			nextRecommendedStep:
				"Let AI continue qualifying until the buyer asks for a viewing or a financing exception.",
		},
		messages: [
			{
				direction: "inbound",
				senderType: "lead",
				body: "Hi, does the Chamartin place include parking?",
				sentAt: now - 38 * 60 * 1000,
			},
			{
				direction: "outbound",
				senderType: "ai",
				body: "Yes, one covered space is included. Would you like photos of the garage access as well?",
				sentAt: now - 36 * 60 * 1000,
			},
			{
				direction: "inbound",
				senderType: "lead",
				body: "Yes please, and is the apartment ready for move-in this month?",
				sentAt: now - 33 * 60 * 1000,
			},
		],
	});

	await insertSeedConversation(ctx, agencyId, {
		contact: {
			kind: "seller",
			fullName: "Lucia Vega",
			email: "lucia@example.com",
			phone: "+34 633 200 999",
			preferredLanguage: "es",
		},
		lead: {
			kind: "valuation_request",
			channelId: webFormChannelId,
			sourceType: "web_form",
			sourceLabel: "Owner valuation form",
			status: "new",
			receivedAt: now - 78 * 60 * 1000,
		},
		conversation: {
			state: "new",
			ownerType: "unassigned",
			summary:
				"Seller requested a valuation for a three-bedroom flat and wants a meeting next week.",
			nextRecommendedStep:
				"Assign an agent and offer two valuation call windows while collecting the exact address.",
		},
		messages: [
			{
				direction: "inbound",
				senderType: "lead",
				body: "I would like a valuation for my flat in Salamanca and I can meet next week.",
				sentAt: now - 78 * 60 * 1000,
			},
		],
	});

	await insertSeedConversation(ctx, agencyId, {
		contact: {
			kind: "buyer",
			fullName: "Sofia Navarro",
			email: "sofia@example.com",
			preferredLanguage: "en",
		},
		lead: {
			kind: "buyer_inquiry",
			channelId: portalEmailChannelId,
			sourceType: "portal_email",
			sourceLabel: "Idealista forwards",
			status: "closed",
			receivedAt: now - 26 * 60 * 60 * 1000,
		},
		conversation: {
			state: "closed",
			ownerType: "human",
			ownerUserId: "demo:javier-ortega",
			summary:
				"Buyer booked a viewing, received the brochure, and the initial inquiry is complete.",
			nextRecommendedStep:
				"Reopen only if the buyer sends follow-up questions after the viewing.",
			closedAt: now - 22 * 60 * 60 * 1000,
		},
		messages: [
			{
				direction: "inbound",
				senderType: "lead",
				body: "Could I see the brochure and arrange a viewing for Friday?",
				sentAt: now - 26 * 60 * 60 * 1000,
			},
			{
				direction: "outbound",
				senderType: "user",
				senderUserId: "demo:javier-ortega",
				body: "Absolutely. I have sent the brochure and reserved a Friday slot at 17:00.",
				sentAt: now - 25 * 60 * 60 * 1000,
			},
			{
				direction: "internal",
				senderType: "system",
				body: "Conversation marked closed after viewing was confirmed.",
				sentAt: now - 22 * 60 * 60 * 1000,
			},
		],
		assignment: {
			assigneeUserId: "demo:javier-ortega",
			assignedByUserId: ownerUserId,
			reason: "Handled buyer viewing follow-up",
			active: false,
			createdAt: now - 26 * 60 * 60 * 1000,
			endedAt: now - 22 * 60 * 60 * 1000,
		},
	});
};

export const getCurrentAgencyForUser = query({
	args: {},
	handler: async (ctx) => {
		const { userId } = await requireCurrentMembership(ctx);
		return loadCurrentAgencyForUser(ctx, userId);
	},
});

export const listMemberships = query({
	args: {},
	handler: async (ctx) => {
		const { membership } = await requireCurrentMembership(ctx);
		const memberships = await ctx.db
			.query("agencyMemberships")
			.withIndex("by_agency", (q) => q.eq("agencyId", membership.agencyId))
			.collect();

		const roleRank: Record<Doc<"agencyMemberships">["role"], number> = {
			owner: 0,
			manager: 1,
			agent: 2,
		};

		return memberships
			.filter((membership) => membership.status === "active")
			.sort((a, b) => {
				const rankDiff = roleRank[a.role] - roleRank[b.role];
				if (rankDiff !== 0) {
					return rankDiff;
				}

				return (a.displayName ?? a.userId).localeCompare(
					b.displayName ?? b.userId,
				);
			})
			.map(serializeMembership);
	},
});

export const createDefaultAgencyForUser = mutation({
	args: {},
	handler: async (ctx) => {
		const userId = await requireAuthenticatedUserId(ctx);
		const existing = await loadCurrentAgencyForUser(ctx, userId);
		if (existing) {
			return existing;
		}

		const now = Date.now();
		const baseSlug = slugify(`casedra-${userId.slice(0, 8)}`);
		const slug = await buildUniqueSlug(ctx, baseSlug);
		const agencyId = await ctx.db.insert("agencies", {
			name: DEFAULT_AGENCY_NAME,
			slug,
			country: DEFAULT_COUNTRY,
			timezone: DEFAULT_TIMEZONE,
			status: "active",
			createdAt: now,
			updatedAt: now,
		});

		if (process.env.NODE_ENV === "production") {
			await ctx.db.insert("agencyMemberships", {
				agencyId,
				userId,
				role: "owner",
				status: "active",
				displayName: "Workspace owner",
				createdAt: now,
				updatedAt: now,
			});

			await ctx.db.insert("channels", {
				agencyId,
				type: "manual",
				label: "Manual intake",
				status: "active",
				provider: "internal",
				createdAt: now,
				updatedAt: now,
			});
		} else {
			await seedDefaultWorkspace(ctx, agencyId, userId);
		}

		const created = await loadCurrentAgencyForUser(ctx, userId);
		if (!created) {
			throw new Error("INTERNAL:Failed to bootstrap the default agency");
		}

		return created;
	},
});
