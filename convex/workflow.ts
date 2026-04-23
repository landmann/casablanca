import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import {
	type MutationCtx,
	mutation,
	type QueryCtx,
	query,
} from "./_generated/server";
import { requireCurrentMembership } from "./auth";
import {
	contactKindValidator,
	conversationStateValidator,
	leadKindValidator,
	messageBodyFormatValidator,
} from "./workflowValidators";

const raiseWorkflowError = (code: string, message: string): never => {
	throw new Error(`${code}:${message}`);
};

const requireWorkflowMembership = async (
	ctx: QueryCtx | MutationCtx,
	allowedRoles?: Array<Doc<"agencyMemberships">["role"]>,
) => {
	const { membership, userId } = await requireCurrentMembership(ctx);

	if (allowedRoles && !allowedRoles.includes(membership.role)) {
		raiseWorkflowError(
			"FORBIDDEN",
			"You do not have permission to perform this workflow action",
		);
	}

	return {
		agencyId: membership.agencyId,
		membership,
		userId,
	};
};

const byNewestMessage = (
	a: Pick<Doc<"conversations">, "lastMessageAt" | "_id">,
	b: Pick<Doc<"conversations">, "lastMessageAt" | "_id">,
) => {
	if (a.lastMessageAt !== b.lastMessageAt) {
		return b.lastMessageAt - a.lastMessageAt;
	}

	return a._id.toString().localeCompare(b._id.toString());
};

const loadMembershipMap = async (
	ctx: QueryCtx | MutationCtx,
	agencyId: Id<"agencies">,
) => {
	const memberships = await ctx.db
		.query("agencyMemberships")
		.withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
		.collect();

	return new Map(
		memberships
			.filter((membership) => membership.status === "active")
			.map((membership) => [
				membership.userId,
				membership.displayName ?? membership.userId,
			]),
	);
};

const ownerLabelForConversation = (
	conversation: Pick<Doc<"conversations">, "ownerType" | "ownerUserId">,
	membershipMap: Map<string, string>,
) => {
	if (conversation.ownerType === "ai") {
		return "AI";
	}

	if (conversation.ownerType === "unassigned") {
		return "Unassigned";
	}

	if (!conversation.ownerUserId) {
		return "Assigned";
	}

	return (
		membershipMap.get(conversation.ownerUserId) ?? conversation.ownerUserId
	);
};

const getConversationDocOrThrow = async (
	ctx: QueryCtx | MutationCtx,
	conversationId: Id<"conversations">,
): Promise<Doc<"conversations">> => {
	const conversation = await ctx.db.get(conversationId);
	if (conversation === null) {
		raiseWorkflowError("NOT_FOUND", "Conversation not found");
	}

	return conversation as Doc<"conversations">;
};

const getConversationOrThrow = async (
	ctx: QueryCtx | MutationCtx,
	agencyId: Id<"agencies">,
	conversationId: string,
): Promise<Doc<"conversations">> => {
	const normalizedId = ctx.db.normalizeId("conversations", conversationId);
	if (normalizedId === null) {
		raiseWorkflowError("NOT_FOUND", "Conversation not found");
	}

	const conversation = await getConversationDocOrThrow(
		ctx,
		normalizedId as Id<"conversations">,
	);
	if (!conversation || conversation.agencyId !== agencyId) {
		raiseWorkflowError("NOT_FOUND", "Conversation not found");
	}

	return conversation;
};

const getActiveAssignment = async (
	ctx: QueryCtx | MutationCtx,
	conversationId: Id<"conversations">,
) => {
	const assignments = await ctx.db
		.query("assignments")
		.withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
		.collect();

	return assignments.filter((assignment) => assignment.active).at(-1) ?? null;
};

const getLatestHandoff = async (
	ctx: QueryCtx | MutationCtx,
	conversationId: Id<"conversations">,
) => {
	const handoffs = await ctx.db
		.query("handoffEvents")
		.withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
		.collect();

	return handoffs.at(-1) ?? null;
};

const getManualChannelId = async (
	ctx: QueryCtx | MutationCtx,
	agencyId: Id<"agencies">,
): Promise<Id<"channels">> => {
	const channels = await ctx.db
		.query("channels")
		.withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
		.collect();

	const manualChannel = channels.find((channel) => channel.type === "manual");
	if (manualChannel) {
		return manualChannel._id;
	}

	if ("insert" in ctx.db) {
		const now = Date.now();
		return (ctx as MutationCtx).db.insert("channels", {
			agencyId,
			type: "manual",
			label: "Manual intake",
			status: "active",
			provider: "internal",
			createdAt: now,
			updatedAt: now,
		});
	}

	return raiseWorkflowError("VALIDATION", "Manual intake channel is missing");
};

const normalizeEmail = (value?: string | null) => value?.trim().toLowerCase();

const normalizePhone = (value?: string | null) =>
	value?.replace(/[^+\d]/g, "").trim();

const getPortalEmailChannelId = async (
	ctx: MutationCtx,
	agencyId: Id<"agencies">,
	args: {
		externalChannelId?: string;
		label?: string;
		provider?: string;
		sourceLabel?: string;
	},
): Promise<Id<"channels">> => {
	const channels = await ctx.db
		.query("channels")
		.withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
		.collect();

	const existingChannel =
		channels.find(
			(channel) =>
				channel.type === "portal_email" &&
				args.externalChannelId &&
				channel.externalChannelId === args.externalChannelId,
		) ??
		channels.find(
			(channel) =>
				channel.type === "portal_email" &&
				args.label &&
				channel.label === args.label,
		) ??
		channels.find((channel) => channel.type === "portal_email");

	if (existingChannel) {
		const updates: Partial<Doc<"channels">> = {};
		if (!existingChannel.externalChannelId && args.externalChannelId) {
			updates.externalChannelId = args.externalChannelId;
		}
		if (
			args.label &&
			existingChannel.label !== args.label &&
			!existingChannel.externalChannelId
		) {
			updates.label = args.label;
		}
		if (
			args.provider &&
			existingChannel.provider !== args.provider &&
			existingChannel.provider === "forwarded_email"
		) {
			updates.provider = args.provider;
		}
		if (Object.keys(updates).length > 0) {
			await ctx.db.patch(existingChannel._id, {
				...updates,
				updatedAt: Date.now(),
			});
		}

		return existingChannel._id;
	}

	const now = Date.now();
	return ctx.db.insert("channels", {
		agencyId,
		type: "portal_email",
		label: args.label ?? args.sourceLabel ?? "Portal email",
		status: "active",
		provider: args.provider ?? "forwarded_email",
		externalChannelId: args.externalChannelId,
		createdAt: now,
		updatedAt: now,
	});
};

const findOrCreateContact = async (
	ctx: MutationCtx,
	agencyId: Id<"agencies">,
	contact: {
		kind: Doc<"contacts">["kind"];
		fullName?: string;
		email?: string;
		phone?: string;
		preferredLanguage?: string;
		notes?: string;
	},
) => {
	const normalizedEmail = normalizeEmail(contact.email);
	const normalizedPhone = normalizePhone(contact.phone);
	const contacts = await ctx.db
		.query("contacts")
		.withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
		.collect();

	const existingContact = contacts.find((candidate) => {
		const candidateEmail = normalizeEmail(candidate.email);
		const candidatePhone = normalizePhone(candidate.phone);

		return Boolean(
			(normalizedEmail && candidateEmail === normalizedEmail) ||
				(normalizedPhone && candidatePhone === normalizedPhone),
		);
	});

	if (existingContact) {
		const updates: Partial<Doc<"contacts">> = {};
		if (!existingContact.fullName && contact.fullName) {
			updates.fullName = contact.fullName;
		}
		if (!existingContact.email && normalizedEmail) {
			updates.email = normalizedEmail;
		}
		if (!existingContact.phone && normalizedPhone) {
			updates.phone = normalizedPhone;
		}
		if (!existingContact.preferredLanguage && contact.preferredLanguage) {
			updates.preferredLanguage = contact.preferredLanguage;
		}
		if (!existingContact.notes && contact.notes) {
			updates.notes = contact.notes;
		}
		if (existingContact.kind === "unknown" && contact.kind !== "unknown") {
			updates.kind = contact.kind;
		}
		if (Object.keys(updates).length > 0) {
			await ctx.db.patch(existingContact._id, {
				...updates,
				updatedAt: Date.now(),
			});
		}

		return existingContact._id;
	}

	const now = Date.now();
	return ctx.db.insert("contacts", {
		agencyId,
		kind: contact.kind,
		fullName: contact.fullName,
		email: normalizedEmail,
		phone: normalizedPhone,
		preferredLanguage: contact.preferredLanguage,
		notes: contact.notes,
		createdAt: now,
		updatedAt: now,
	});
};

const findPortalEmailConversation = async (
	ctx: MutationCtx,
	args: {
		agencyId: Id<"agencies">;
		channelId: Id<"channels">;
		contactId: Id<"contacts">;
		listingId: Id<"listings"> | null;
	},
) => {
	const channelConversations = await ctx.db
		.query("conversations")
		.withIndex("by_channel", (q) =>
			q.eq("agencyId", args.agencyId).eq("channelId", args.channelId),
		)
		.collect();

	return (
		channelConversations
			.filter((conversation) => {
				if (conversation.sourceType !== "portal_email") {
					return false;
				}

				if (conversation.contactId !== args.contactId) {
					return false;
				}

				if (args.listingId && conversation.listingId !== args.listingId) {
					return false;
				}

				return true;
			})
			.sort((a, b) => {
				if (a.state === "closed" && b.state !== "closed") {
					return 1;
				}

				if (a.state !== "closed" && b.state === "closed") {
					return -1;
				}

				return byNewestMessage(a, b);
			})[0] ?? null
	);
};

const serializeConversation = async (
	ctx: QueryCtx | MutationCtx,
	conversation: Doc<"conversations">,
	membershipMap: Map<string, string>,
) => {
	const [contact, channel, lead, activeAssignment, latestHandoff] =
		await Promise.all([
			conversation.contactId
				? ctx.db.get(conversation.contactId)
				: Promise.resolve(null),
			conversation.channelId
				? ctx.db.get(conversation.channelId)
				: Promise.resolve(null),
			ctx.db.get(conversation.leadId),
			getActiveAssignment(ctx, conversation._id),
			getLatestHandoff(ctx, conversation._id),
		]);

	return {
		id: conversation._id,
		agencyId: conversation.agencyId,
		leadId: conversation.leadId,
		contactId: conversation.contactId ?? null,
		channelId: conversation.channelId ?? null,
		listingId: conversation.listingId ?? null,
		state: conversation.state,
		ownerType: conversation.ownerType,
		ownerUserId: conversation.ownerUserId ?? null,
		ownerLabel: ownerLabelForConversation(conversation, membershipMap),
		version: conversation.version,
		sourceType: conversation.sourceType,
		sourceLabel: conversation.sourceLabel,
		summary: conversation.summary ?? null,
		nextRecommendedStep: conversation.nextRecommendedStep ?? null,
		firstResponseAt: conversation.firstResponseAt ?? null,
		lastInboundAt: conversation.lastInboundAt ?? null,
		lastOutboundAt: conversation.lastOutboundAt ?? null,
		lastMessageAt: conversation.lastMessageAt,
		reopenedAt: conversation.reopenedAt ?? null,
		closedAt: conversation.closedAt ?? null,
		createdAt: conversation.createdAt,
		updatedAt: conversation.updatedAt,
		contact: contact
			? {
					id: contact._id,
					kind: contact.kind,
					fullName: contact.fullName ?? null,
					email: contact.email ?? null,
					phone: contact.phone ?? null,
					preferredLanguage: contact.preferredLanguage ?? null,
					notes: contact.notes ?? null,
				}
			: null,
		contactName: contact?.fullName ?? "Unknown contact",
		channel: channel
			? {
					id: channel._id,
					type: channel.type,
					label: channel.label,
					status: channel.status,
					provider: channel.provider,
				}
			: null,
		lead: lead
			? {
					id: lead._id,
					kind: lead.kind,
					status: lead.status,
					receivedAt: lead.receivedAt,
				}
			: null,
		activeAssignment: activeAssignment
			? {
					id: activeAssignment._id,
					assigneeUserId: activeAssignment.assigneeUserId,
					assigneeLabel:
						membershipMap.get(activeAssignment.assigneeUserId) ??
						activeAssignment.assigneeUserId,
					assignedByUserId: activeAssignment.assignedByUserId,
					assignedByLabel:
						membershipMap.get(activeAssignment.assignedByUserId) ??
						activeAssignment.assignedByUserId,
					reason: activeAssignment.reason,
					createdAt: activeAssignment.createdAt,
				}
			: null,
		latestHandoff: latestHandoff
			? {
					id: latestHandoff._id,
					trigger: latestHandoff.trigger,
					fromOwnerType: latestHandoff.fromOwnerType,
					fromUserId: latestHandoff.fromUserId ?? null,
					fromLabel: latestHandoff.fromUserId
						? (membershipMap.get(latestHandoff.fromUserId) ??
							latestHandoff.fromUserId)
						: latestHandoff.fromOwnerType === "ai"
							? "AI"
							: "Unassigned",
					toOwnerType: latestHandoff.toOwnerType,
					toUserId: latestHandoff.toUserId ?? null,
					toLabel: latestHandoff.toUserId
						? (membershipMap.get(latestHandoff.toUserId) ??
							latestHandoff.toUserId)
						: latestHandoff.toOwnerType === "ai"
							? "AI"
							: "Unassigned",
					summarySnapshot: latestHandoff.summarySnapshot ?? null,
					recommendation: latestHandoff.recommendation ?? null,
					createdAt: latestHandoff.createdAt,
				}
			: null,
	};
};

const closeActiveAssignments = async (
	ctx: MutationCtx,
	conversationId: Id<"conversations">,
	endedAt: number,
) => {
	const assignments = await ctx.db
		.query("assignments")
		.withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
		.collect();

	for (const assignment of assignments) {
		if (!assignment.active) {
			continue;
		}

		await ctx.db.patch(assignment._id, {
			active: false,
			endedAt,
		});
	}
};

const claimHumanOwnership = async (
	ctx: MutationCtx,
	args: {
		agencyId: Id<"agencies">;
		conversation: Doc<"conversations">;
		userId: string;
		now: number;
		reason: string;
		trigger: Doc<"handoffEvents">["trigger"];
	},
) => {
	if (
		args.conversation.ownerType === "human" &&
		args.conversation.ownerUserId === args.userId
	) {
		return;
	}

	if (
		args.conversation.ownerType === "human" &&
		args.conversation.ownerUserId &&
		args.conversation.ownerUserId !== args.userId
	) {
		raiseWorkflowError(
			"INVALID_OWNERSHIP",
			"Conversation is already owned by another teammate",
		);
	}

	await closeActiveAssignments(ctx, args.conversation._id, args.now);
	await ctx.db.insert("assignments", {
		agencyId: args.agencyId,
		conversationId: args.conversation._id,
		assigneeUserId: args.userId,
		assignedByUserId: args.userId,
		reason: args.reason,
		active: true,
		createdAt: args.now,
	});

	await ctx.db.insert("handoffEvents", {
		agencyId: args.agencyId,
		conversationId: args.conversation._id,
		fromOwnerType: args.conversation.ownerType,
		fromUserId: args.conversation.ownerUserId,
		toOwnerType: "human",
		toUserId: args.userId,
		trigger: args.trigger,
		summarySnapshot: args.conversation.summary,
		recommendation: args.conversation.nextRecommendedStep,
		createdAt: args.now,
	});
};

const roundPct = (value: number) => Math.round(value * 10) / 10;

const median = (values: number[]) => {
	if (!values.length) {
		return null;
	}

	const sorted = [...values].sort((a, b) => a - b);
	const midpoint = Math.floor(sorted.length / 2);

	if (sorted.length % 2 === 0) {
		return Math.round((sorted[midpoint - 1]! + sorted[midpoint]!) / 2);
	}

	return sorted[midpoint]!;
};

const assertVersion = (
	conversation: Doc<"conversations">,
	expectedVersion: number,
) => {
	if (conversation.version !== expectedVersion) {
		raiseWorkflowError(
			"STALE_STATE",
			"Conversation changed before your action was applied",
		);
	}
};

const serializeMessages = async (
	ctx: QueryCtx | MutationCtx,
	conversation: Doc<"conversations">,
	membershipMap: Map<string, string>,
) => {
	const [contact, messages] = await Promise.all([
		conversation.contactId
			? ctx.db.get(conversation.contactId)
			: Promise.resolve(null),
		ctx.db
			.query("messages")
			.withIndex("by_conversation", (q) =>
				q.eq("conversationId", conversation._id),
			)
			.collect(),
	]);

	return messages
		.sort((a, b) => {
			if (a.sentAt !== b.sentAt) {
				return a.sentAt - b.sentAt;
			}

			if (a.createdAt !== b.createdAt) {
				return a.createdAt - b.createdAt;
			}

			return a._id.toString().localeCompare(b._id.toString());
		})
		.map((message) => ({
			id: message._id,
			conversationId: message.conversationId,
			direction: message.direction,
			senderType: message.senderType,
			senderUserId: message.senderUserId ?? null,
			senderLabel:
				message.senderType === "lead"
					? (contact?.fullName ?? "Lead")
					: message.senderType === "ai"
						? "Casedra AI"
						: message.senderType === "system"
							? "System"
							: message.senderUserId
								? (membershipMap.get(message.senderUserId) ??
									message.senderUserId)
								: "Agent",
			body: message.body,
			bodyFormat: message.bodyFormat,
			sentAt: message.sentAt,
			createdAt: message.createdAt,
		}));
};

const allowedStateTransitions: Record<
	Doc<"conversations">["state"],
	Array<Doc<"conversations">["state"]>
> = {
	new: ["bot_active"],
	bot_active: ["awaiting_human"],
	awaiting_human: ["human_active"],
	human_active: ["closed"],
	closed: [],
};

export const listConversations = query({
	args: {
		state: v.optional(conversationStateValidator),
		search: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const { agencyId } = await requireWorkflowMembership(ctx);
		const state = args.state;
		const conversations = state
			? await ctx.db
					.query("conversations")
					.withIndex("by_state", (q) =>
						q.eq("agencyId", agencyId).eq("state", state),
					)
					.collect()
			: await ctx.db
					.query("conversations")
					.withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
					.collect();
		const membershipMap = await loadMembershipMap(ctx, agencyId);
		const items = await Promise.all(
			conversations
				.sort(byNewestMessage)
				.map((conversation) =>
					serializeConversation(ctx, conversation, membershipMap),
				),
		);

		if (!args.search) {
			return items;
		}

		const needle = args.search.toLowerCase();
		return items.filter((item) =>
			[
				item.contactName,
				item.sourceLabel,
				item.summary ?? "",
				item.nextRecommendedStep ?? "",
			]
				.join(" ")
				.toLowerCase()
				.includes(needle),
		);
	},
});

export const getConversationById = query({
	args: {
		conversationId: v.string(),
	},
	handler: async (ctx, args) => {
		const { agencyId } = await requireWorkflowMembership(ctx);
		const conversation = await getConversationOrThrow(
			ctx,
			agencyId,
			args.conversationId,
		);
		const membershipMap = await loadMembershipMap(ctx, agencyId);
		return serializeConversation(ctx, conversation, membershipMap);
	},
});

export const listMessagesByConversation = query({
	args: {
		conversationId: v.string(),
	},
	handler: async (ctx, args) => {
		const { agencyId } = await requireWorkflowMembership(ctx);
		const conversation = await getConversationOrThrow(
			ctx,
			agencyId,
			args.conversationId,
		);
		const membershipMap = await loadMembershipMap(ctx, agencyId);
		return serializeMessages(ctx, conversation, membershipMap);
	},
});

export const getInboxSummary = query({
	args: {},
	handler: async (ctx) => {
		const { agencyId } = await requireWorkflowMembership(ctx);
		const [conversations, handoffEvents] = await Promise.all([
			ctx.db
				.query("conversations")
				.withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
				.collect(),
			ctx.db
				.query("handoffEvents")
				.withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
				.collect(),
		]);

		const leads = await Promise.all(
			conversations.map((conversation) => ctx.db.get(conversation.leadId)),
		);
		const leadByConversation = new Map(
			conversations.map((conversation, index) => [conversation._id, leads[index]]),
		);
		const handoffConversationIds = new Set(
			handoffEvents.map((handoffEvent) => handoffEvent.conversationId),
		);
		const manualTakeoverConversationIds = new Set(
			handoffEvents
				.filter((handoffEvent) => handoffEvent.trigger === "manual_takeover")
				.map((handoffEvent) => handoffEvent.conversationId),
		);

		const responseTimes = conversations.flatMap((conversation) => {
			const lead = leadByConversation.get(conversation._id);
			if (!lead || !conversation.firstResponseAt) {
				return [];
			}

			return [Math.max(0, Math.round((conversation.firstResponseAt - lead.receivedAt) / 1000))];
		});

		const totalConversations = conversations.length;

		return {
			totalConversations,
			countsByState: {
				new: conversations.filter((conversation) => conversation.state === "new")
					.length,
				botActive: conversations.filter(
					(conversation) => conversation.state === "bot_active",
				).length,
				awaitingHuman: conversations.filter(
					(conversation) => conversation.state === "awaiting_human",
				).length,
				humanActive: conversations.filter(
					(conversation) => conversation.state === "human_active",
				).length,
				closed: conversations.filter(
					(conversation) => conversation.state === "closed",
				).length,
			},
			medianFirstResponseSeconds: median(responseTimes),
			responseCoveragePct:
				totalConversations > 0
					? roundPct(
							(conversations.filter((conversation) => conversation.firstResponseAt)
								.length /
								totalConversations) *
								100,
						)
					: null,
			handoffRatePct:
				totalConversations > 0
					? roundPct((handoffConversationIds.size / totalConversations) * 100)
					: null,
			manualTakeoverRatePct:
				totalConversations > 0
					? roundPct(
							(manualTakeoverConversationIds.size / totalConversations) * 100,
						)
					: null,
			reopenedConversationRatePct:
				totalConversations > 0
					? roundPct(
							(conversations.filter((conversation) => conversation.reopenedAt)
								.length /
								totalConversations) *
								100,
						)
					: null,
		};
	},
});

export const getResponseMetrics = query({
	args: {
		days: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const { agencyId } = await requireWorkflowMembership(ctx);
		const days = Math.max(1, Math.floor(args.days ?? 7));
		const windowStart = Date.now() - days * 24 * 60 * 60 * 1000;
		const [allConversations, handoffEvents] = await Promise.all([
			ctx.db
				.query("conversations")
				.withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
				.collect(),
			ctx.db
				.query("handoffEvents")
				.withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
				.collect(),
		]);

		const conversations = allConversations.filter(
			(conversation) =>
				conversation.createdAt >= windowStart ||
				conversation.lastMessageAt >= windowStart,
		);
		const conversationIds = new Set(
			conversations.map((conversation) => conversation._id),
		);
		const leads = await Promise.all(
			conversations.map((conversation) => ctx.db.get(conversation.leadId)),
		);
		const handoffConversationIds = new Set(
			handoffEvents
				.filter((handoffEvent) =>
					conversationIds.has(handoffEvent.conversationId),
				)
				.map((handoffEvent) => handoffEvent.conversationId),
		);

		const responseTimes = conversations.flatMap((conversation, index) => {
			const lead = leads[index];
			if (!lead || !conversation.firstResponseAt) {
				return [];
			}

			return [Math.max(0, Math.round((conversation.firstResponseAt - lead.receivedAt) / 1000))];
		});
		const totalConversations = conversations.length;
		const respondedConversationCount = conversations.filter(
			(conversation) => conversation.firstResponseAt,
		).length;

		return {
			days,
			windowStart,
			totalConversations,
			respondedConversationCount,
			medianFirstResponseSeconds: median(responseTimes),
			responseCoveragePct:
				totalConversations > 0
					? roundPct((respondedConversationCount / totalConversations) * 100)
					: null,
			handoffRatePct:
				totalConversations > 0
					? roundPct((handoffConversationIds.size / totalConversations) * 100)
					: null,
		};
	},
});

export const createManualConversation = mutation({
	args: {
		contact: v.object({
			kind: contactKindValidator,
			fullName: v.string(),
			email: v.optional(v.string()),
			phone: v.optional(v.string()),
			preferredLanguage: v.optional(v.string()),
			notes: v.optional(v.string()),
		}),
		lead: v.object({
			kind: leadKindValidator,
			sourceLabel: v.optional(v.string()),
			listingId: v.optional(v.string()),
			rawPayload: v.optional(v.any()),
		}),
		initialMessage: v.object({
			body: v.string(),
			bodyFormat: v.optional(messageBodyFormatValidator),
			sentAt: v.optional(v.number()),
		}),
		summary: v.optional(v.string()),
		nextRecommendedStep: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const { agencyId } = await requireWorkflowMembership(ctx);
		const now = Date.now();
		const sentAt = args.initialMessage.sentAt ?? now;
		const channelId = await getManualChannelId(ctx, agencyId);
		const listingId = args.lead.listingId
			? ctx.db.normalizeId("listings", args.lead.listingId)
			: null;

		if (args.lead.listingId && !listingId) {
			raiseWorkflowError("VALIDATION", "Listing id is invalid");
		}

		const contactId = await ctx.db.insert("contacts", {
			agencyId,
			kind: args.contact.kind,
			fullName: args.contact.fullName,
			email: args.contact.email,
			phone: args.contact.phone,
			preferredLanguage: args.contact.preferredLanguage,
			notes: args.contact.notes,
			createdAt: now,
			updatedAt: now,
		});

		const leadId = await ctx.db.insert("leads", {
			agencyId,
			contactId,
			channelId,
			listingId: listingId ?? undefined,
			kind: args.lead.kind,
			sourceType: "manual",
			sourceLabel: args.lead.sourceLabel ?? "Manual intake",
			status: "new",
			receivedAt: sentAt,
			rawPayload: args.lead.rawPayload,
			createdAt: now,
			updatedAt: now,
		});

		const conversationId = await ctx.db.insert("conversations", {
			agencyId,
			leadId,
			contactId,
			channelId,
			listingId: listingId ?? undefined,
			state: "new",
			ownerType: "unassigned",
			version: 1,
			sourceType: "manual",
			sourceLabel: args.lead.sourceLabel ?? "Manual intake",
			summary: args.summary,
			nextRecommendedStep: args.nextRecommendedStep,
			lastInboundAt: sentAt,
			lastMessageAt: sentAt,
			createdAt: now,
			updatedAt: now,
		});

		await ctx.db.insert("messages", {
			agencyId,
			conversationId,
			direction: "inbound",
			senderType: "lead",
			body: args.initialMessage.body,
			bodyFormat: args.initialMessage.bodyFormat ?? "plain_text",
			sentAt,
			createdAt: now,
		});

		const membershipMap = await loadMembershipMap(ctx, agencyId);
		const conversation = await getConversationDocOrThrow(ctx, conversationId);

		return serializeConversation(ctx, conversation, membershipMap);
	},
});

export const ingestPortalEmail = mutation({
	args: {
		ingestSecret: v.string(),
		agencySlug: v.string(),
		channel: v.object({
			externalChannelId: v.optional(v.string()),
			label: v.optional(v.string()),
			provider: v.optional(v.string()),
		}),
		contact: v.object({
			kind: contactKindValidator,
			fullName: v.optional(v.string()),
			email: v.optional(v.string()),
			phone: v.optional(v.string()),
			preferredLanguage: v.optional(v.string()),
			notes: v.optional(v.string()),
		}),
		lead: v.object({
			kind: leadKindValidator,
			externalLeadId: v.optional(v.string()),
			listingId: v.optional(v.string()),
			sourceLabel: v.optional(v.string()),
			rawPayload: v.optional(v.any()),
		}),
		message: v.object({
			body: v.string(),
			sentAt: v.number(),
			dedupeKey: v.string(),
			providerMessageId: v.optional(v.string()),
			externalEventId: v.optional(v.string()),
			subject: v.optional(v.string()),
			metadata: v.optional(v.any()),
		}),
		summary: v.optional(v.string()),
		nextRecommendedStep: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const configuredSecret = process.env.WORKFLOW_INGEST_SECRET;
		if (!configuredSecret) {
			raiseWorkflowError(
				"FORBIDDEN",
				"Workflow ingestion is not configured for this deployment",
			);
		}
		if (args.ingestSecret !== configuredSecret) {
			raiseWorkflowError("FORBIDDEN", "Workflow ingestion secret is invalid");
		}

		const agency = await ctx.db
			.query("agencies")
			.withIndex("by_slug", (q) => q.eq("slug", args.agencySlug))
			.unique();
		if (!agency) {
			raiseWorkflowError("NOT_FOUND", "Agency not found for workflow ingestion");
		}

		const agencyId = agency!._id;
		const existingMessage = await ctx.db
			.query("messages")
			.withIndex("by_dedupe_key", (q) =>
				q.eq("agencyId", agencyId).eq("dedupeKey", args.message.dedupeKey),
			)
			.unique();

		if (existingMessage) {
			return {
				deduped: true,
				conversationId: existingMessage.conversationId,
				messageId: existingMessage._id,
			};
		}

		const now = Date.now();
		const listingId = args.lead.listingId
			? ctx.db.normalizeId("listings", args.lead.listingId)
			: null;
		if (args.lead.listingId && !listingId) {
			raiseWorkflowError("VALIDATION", "Listing id is invalid");
		}

		const channelId = await getPortalEmailChannelId(ctx, agencyId, {
			externalChannelId: args.channel.externalChannelId,
			label: args.channel.label ?? args.lead.sourceLabel,
			provider: args.channel.provider,
			sourceLabel: args.lead.sourceLabel,
		});
		const contactId = await findOrCreateContact(ctx, agencyId, args.contact);
		let lead =
			args.lead.externalLeadId
				? await ctx.db
						.query("leads")
						.withIndex("by_external_lead", (q) =>
							q.eq("agencyId", agencyId).eq("externalLeadId", args.lead.externalLeadId),
						)
						.unique()
					: null;
		let conversation = null;
		const existingLeadId = lead?._id;

		if (existingLeadId) {
			conversation = await ctx.db
				.query("conversations")
				.withIndex("by_lead", (q) => q.eq("leadId", existingLeadId))
				.unique();
		}

		if (!conversation) {
			conversation = await findPortalEmailConversation(ctx, {
				agencyId,
				channelId,
				contactId,
				listingId,
			});
		}

		if (!lead && conversation) {
			lead = await ctx.db.get(conversation.leadId);
		}

		let leadId = lead?._id;
		if (!leadId) {
			leadId = await ctx.db.insert("leads", {
				agencyId,
				contactId,
				channelId,
				listingId: listingId ?? undefined,
				kind: args.lead.kind,
				sourceType: "portal_email",
				sourceLabel: args.lead.sourceLabel ?? args.channel.label ?? "Portal email",
				externalLeadId: args.lead.externalLeadId,
				status: "new",
				receivedAt: args.message.sentAt,
				rawPayload: args.lead.rawPayload,
				createdAt: now,
				updatedAt: now,
			});
		} else {
			await ctx.db.patch(leadId, {
				contactId,
				channelId,
				listingId: listingId ?? lead?.listingId,
				status: "active",
				rawPayload: args.lead.rawPayload ?? lead?.rawPayload,
				updatedAt: now,
			});
		}

		if (!conversation && leadId) {
			conversation = await ctx.db
				.query("conversations")
				.withIndex("by_lead", (q) => q.eq("leadId", leadId))
				.unique();
		}

		if (!conversation) {
			const conversationId = await ctx.db.insert("conversations", {
				agencyId,
				leadId,
				contactId,
				channelId,
				listingId: listingId ?? undefined,
				state: "new",
				ownerType: "unassigned",
				version: 1,
				sourceType: "portal_email",
				sourceLabel: args.lead.sourceLabel ?? args.channel.label ?? "Portal email",
				summary: args.summary,
				nextRecommendedStep: args.nextRecommendedStep,
				lastInboundAt: args.message.sentAt,
				lastMessageAt: args.message.sentAt,
				createdAt: now,
				updatedAt: now,
			});
			conversation = await getConversationDocOrThrow(ctx, conversationId);
		} else {
			const updates: Partial<Doc<"conversations">> = {
				contactId,
				channelId,
				listingId: listingId ?? conversation.listingId,
				sourceLabel:
					args.lead.sourceLabel ?? args.channel.label ?? conversation.sourceLabel,
				lastInboundAt: Math.max(
					conversation.lastInboundAt ?? 0,
					args.message.sentAt,
				),
				lastMessageAt: Math.max(conversation.lastMessageAt, args.message.sentAt),
				updatedAt: now,
				version: conversation.version + 1,
			};

			if (!conversation.summary && args.summary) {
				updates.summary = args.summary;
			}
			if (!conversation.nextRecommendedStep && args.nextRecommendedStep) {
				updates.nextRecommendedStep = args.nextRecommendedStep;
			}

			if (conversation.state === "closed") {
				await closeActiveAssignments(ctx, conversation._id, now);
				await ctx.db.insert("messages", {
					agencyId,
					conversationId: conversation._id,
					direction: "internal",
					senderType: "system",
					body: "Conversation reopened after new inbound portal email activity.",
					bodyFormat: "plain_text",
					sentAt: Math.max(args.message.sentAt - 1, 0),
					createdAt: now,
				});
				updates.state = "new";
				updates.ownerType = "unassigned";
				updates.ownerUserId = undefined;
				updates.reopenedAt = args.message.sentAt;
				updates.closedAt = undefined;
			}

			await ctx.db.patch(conversation._id, updates);
			conversation = await getConversationDocOrThrow(ctx, conversation._id);
		}

		const messageId = await ctx.db.insert("messages", {
			agencyId,
			conversationId: conversation._id,
			direction: "inbound",
			senderType: "lead",
			body: args.message.subject
				? `${args.message.subject}\n\n${args.message.body}`.trim()
				: args.message.body,
			bodyFormat: "plain_text",
			providerMessageId: args.message.providerMessageId,
			externalEventId: args.message.externalEventId,
			dedupeKey: args.message.dedupeKey,
			sentAt: args.message.sentAt,
			metadata: args.message.metadata,
			createdAt: now,
		});

		return {
			deduped: false,
			conversationId: conversation._id,
			messageId,
		};
	},
});

export const takeOverConversation = mutation({
	args: {
		conversationId: v.string(),
		expectedVersion: v.number(),
	},
	handler: async (ctx, args) => {
		const { agencyId, userId } = await requireWorkflowMembership(ctx);
		const now = Date.now();
		const conversation = await getConversationOrThrow(
			ctx,
			agencyId,
			args.conversationId,
		);
		assertVersion(conversation, args.expectedVersion);

		if (conversation.state === "closed") {
			raiseWorkflowError(
				"INVALID_STATE_TRANSITION",
				"Closed conversations cannot be taken over",
			);
		}

		if (
			conversation.ownerType === "human" &&
			conversation.ownerUserId === userId &&
			conversation.state === "human_active"
		) {
			const membershipMap = await loadMembershipMap(ctx, agencyId);
			return serializeConversation(ctx, conversation, membershipMap);
		}
		await claimHumanOwnership(ctx, {
			agencyId,
			conversation,
			userId,
			now,
			reason: "Manual takeover",
			trigger: "manual_takeover",
		});

		await ctx.db.patch(conversation._id, {
			state: "human_active",
			ownerType: "human",
			ownerUserId: userId,
			version: conversation.version + 1,
			updatedAt: now,
		});

		const updatedConversation = await getConversationDocOrThrow(
			ctx,
			conversation._id,
		);
		const membershipMap = await loadMembershipMap(ctx, agencyId);
		return serializeConversation(ctx, updatedConversation, membershipMap);
	},
});

export const reassignConversation = mutation({
	args: {
		conversationId: v.string(),
		assigneeUserId: v.string(),
		expectedVersion: v.number(),
		reason: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const { agencyId, userId } = await requireWorkflowMembership(ctx, [
			"owner",
			"manager",
		]);
		const now = Date.now();
		const conversation = await getConversationOrThrow(
			ctx,
			agencyId,
			args.conversationId,
		);
		assertVersion(conversation, args.expectedVersion);

		if (conversation.state === "closed") {
			raiseWorkflowError(
				"INVALID_STATE_TRANSITION",
				"Closed conversations cannot be reassigned",
			);
		}

		const targetMembership = await ctx.db
			.query("agencyMemberships")
			.withIndex("by_agency_and_user", (q) =>
				q.eq("agencyId", agencyId).eq("userId", args.assigneeUserId),
			)
			.unique();

		if (!targetMembership || targetMembership.status !== "active") {
			raiseWorkflowError(
				"INVALID_ASSIGNMENT",
				"Assignee is not an active member of this agency",
			);
		}

		await closeActiveAssignments(ctx, conversation._id, now);
		await ctx.db.insert("assignments", {
			agencyId,
			conversationId: conversation._id,
			assigneeUserId: args.assigneeUserId,
			assignedByUserId: userId,
			reason: args.reason ?? "Manager reassignment",
			active: true,
			createdAt: now,
		});

		await ctx.db.insert("handoffEvents", {
			agencyId,
			conversationId: conversation._id,
			fromOwnerType: conversation.ownerType,
			fromUserId: conversation.ownerUserId,
			toOwnerType: "human",
			toUserId: args.assigneeUserId,
			trigger: "manager_reassign",
			summarySnapshot: conversation.summary,
			recommendation: conversation.nextRecommendedStep,
			createdAt: now,
		});

		await ctx.db.patch(conversation._id, {
			state:
				conversation.state === "human_active"
					? "human_active"
					: "awaiting_human",
			ownerType: "human",
			ownerUserId: args.assigneeUserId,
			version: conversation.version + 1,
			updatedAt: now,
		});

		const updatedConversation = await getConversationDocOrThrow(
			ctx,
			conversation._id,
		);
		const membershipMap = await loadMembershipMap(ctx, agencyId);
		return serializeConversation(ctx, updatedConversation, membershipMap);
	},
});

export const setConversationState = mutation({
	args: {
		conversationId: v.string(),
		expectedVersion: v.number(),
		state: conversationStateValidator,
	},
	handler: async (ctx, args) => {
		const { agencyId } = await requireWorkflowMembership(ctx);
		const now = Date.now();
		const conversation = await getConversationOrThrow(
			ctx,
			agencyId,
			args.conversationId,
		);
		assertVersion(conversation, args.expectedVersion);

		if (conversation.state === args.state) {
			const membershipMap = await loadMembershipMap(ctx, agencyId);
			return serializeConversation(ctx, conversation, membershipMap);
		}

		if (!allowedStateTransitions[conversation.state].includes(args.state)) {
			raiseWorkflowError(
				"INVALID_STATE_TRANSITION",
				`Cannot move a conversation from ${conversation.state} to ${args.state}`,
			);
		}

		if (args.state === "bot_active" && conversation.ownerType !== "ai") {
			raiseWorkflowError(
				"INVALID_STATE_TRANSITION",
				"Only AI-owned conversations can enter bot_active",
			);
		}

		if (args.state === "human_active" && conversation.ownerType !== "human") {
			raiseWorkflowError(
				"INVALID_STATE_TRANSITION",
				"Only human-owned conversations can enter human_active",
			);
		}

		await ctx.db.patch(conversation._id, {
			state: args.state,
			closedAt: args.state === "closed" ? now : conversation.closedAt,
			version: conversation.version + 1,
			updatedAt: now,
		});

		const updatedConversation = await getConversationDocOrThrow(
			ctx,
			conversation._id,
		);
		const membershipMap = await loadMembershipMap(ctx, agencyId);
		return serializeConversation(ctx, updatedConversation, membershipMap);
	},
});

export const createOutboundMessage = mutation({
	args: {
		conversationId: v.string(),
		body: v.string(),
		bodyFormat: v.optional(messageBodyFormatValidator),
	},
	handler: async (ctx, args) => {
		const { agencyId, userId } = await requireWorkflowMembership(ctx);
		const now = Date.now();
		const conversation = await getConversationOrThrow(
			ctx,
			agencyId,
			args.conversationId,
		);

		if (conversation.state === "closed") {
			raiseWorkflowError(
				"INVALID_STATE_TRANSITION",
				"Closed conversations cannot receive new replies",
			);
		}

		await claimHumanOwnership(ctx, {
			agencyId,
			conversation,
			userId,
			now,
			reason: "Reply sent",
			trigger: "manual_takeover",
		});

		await ctx.db.insert("messages", {
			agencyId,
			conversationId: conversation._id,
			direction: "outbound",
			senderType: "user",
			senderUserId: userId,
			body: args.body,
			bodyFormat: args.bodyFormat ?? "plain_text",
			sentAt: now,
			createdAt: now,
		});

		await ctx.db.patch(conversation._id, {
			state: "human_active",
			ownerType: "human",
			ownerUserId: userId,
			firstResponseAt: conversation.firstResponseAt ?? now,
			lastOutboundAt: now,
			lastMessageAt: Math.max(conversation.lastMessageAt, now),
			version: conversation.version + 1,
			updatedAt: now,
		});

		const updatedConversation = await getConversationDocOrThrow(
			ctx,
			conversation._id,
		);
		const membershipMap = await loadMembershipMap(ctx, agencyId);
		return serializeMessages(ctx, updatedConversation, membershipMap);
	},
});

export const createInternalNote = mutation({
	args: {
		conversationId: v.string(),
		body: v.string(),
		bodyFormat: v.optional(messageBodyFormatValidator),
	},
	handler: async (ctx, args) => {
		const { agencyId, userId } = await requireWorkflowMembership(ctx);
		const now = Date.now();
		const conversation = await getConversationOrThrow(
			ctx,
			agencyId,
			args.conversationId,
		);

		await ctx.db.insert("messages", {
			agencyId,
			conversationId: conversation._id,
			direction: "internal",
			senderType: "user",
			senderUserId: userId,
			body: args.body,
			bodyFormat: args.bodyFormat ?? "plain_text",
			sentAt: now,
			createdAt: now,
		});

		await ctx.db.patch(conversation._id, {
			lastMessageAt: now,
			version: conversation.version + 1,
			updatedAt: now,
		});

		const updatedConversation = await getConversationDocOrThrow(
			ctx,
			conversation._id,
		);
		const membershipMap = await loadMembershipMap(ctx, agencyId);
		return serializeMessages(ctx, updatedConversation, membershipMap);
	},
});
