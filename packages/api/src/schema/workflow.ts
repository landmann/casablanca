import { z } from "zod";

export const conversationStateSchema = z.enum([
	"new",
	"bot_active",
	"awaiting_human",
	"human_active",
	"closed",
]);

export const contactKindSchema = z.enum(["buyer", "seller", "unknown"]);
export const leadKindSchema = z.enum([
	"buyer_inquiry",
	"seller_inquiry",
	"valuation_request",
	"other",
]);
export const messageBodyFormatSchema = z.enum(["plain_text", "markdown"]);

export const conversationListFiltersSchema = z.object({
	state: conversationStateSchema.optional(),
	search: z.string().optional(),
});

export const conversationIdSchema = z.object({
	id: z.string().min(1, "Conversation id is required"),
});

export const conversationVersionSchema = z.object({
	id: z.string().min(1, "Conversation id is required"),
	expectedVersion: z.number().int().min(0),
});

export const takeOverConversationInputSchema = conversationVersionSchema;

export const reassignConversationInputSchema = conversationVersionSchema.extend(
	{
		assigneeUserId: z.string().min(1, "Assignee is required"),
		reason: z.string().min(1).max(240).optional(),
	},
);

export const setConversationStateInputSchema = conversationVersionSchema.extend(
	{
		state: conversationStateSchema,
	},
);

export const createManualConversationInputSchema = z.object({
	contact: z.object({
		kind: contactKindSchema.default("unknown"),
		fullName: z.string().min(1, "Contact name is required"),
		email: z.string().email().optional(),
		phone: z.string().optional(),
		preferredLanguage: z.string().optional(),
		notes: z.string().optional(),
	}),
	lead: z.object({
		kind: leadKindSchema,
		sourceLabel: z.string().min(1).optional(),
		listingId: z.string().min(1).optional(),
		rawPayload: z.any().optional(),
	}),
	initialMessage: z.object({
		body: z.string().min(1, "An initial message is required"),
		bodyFormat: messageBodyFormatSchema.optional(),
		sentAt: z.number().int().optional(),
	}),
	summary: z.string().optional(),
	nextRecommendedStep: z.string().optional(),
});

export const createInternalNoteInputSchema = conversationIdSchema.extend({
	body: z.string().min(1, "A note body is required"),
	bodyFormat: messageBodyFormatSchema.optional(),
});

export const createOutboundMessageInputSchema = conversationIdSchema.extend({
	body: z.string().min(1, "A reply body is required"),
	bodyFormat: messageBodyFormatSchema.optional(),
});

export const responseMetricsInputSchema = z.object({
	days: z.number().int().min(1).max(90).default(7),
});

export const portalEmailIngressSchema = z.object({
	agencySlug: z.string().min(1, "Agency slug is required"),
	channel: z
		.object({
			externalChannelId: z.string().min(1).optional(),
			label: z.string().min(1).optional(),
			provider: z.string().min(1).optional(),
		})
		.default({}),
	contact: z.object({
		kind: contactKindSchema.default("buyer"),
		fullName: z.string().min(1).optional(),
		email: z.string().email().optional(),
		phone: z.string().optional(),
		preferredLanguage: z.string().optional(),
		notes: z.string().optional(),
	}),
	lead: z.object({
		kind: leadKindSchema.default("buyer_inquiry"),
		externalLeadId: z.string().min(1).optional(),
		listingId: z.string().min(1).optional(),
		sourceLabel: z.string().min(1).optional(),
		rawPayload: z.any().optional(),
	}),
	message: z.object({
		body: z.string().min(1, "A message body is required"),
		sentAt: z.number().int().optional(),
		dedupeKey: z.string().min(1).optional(),
		providerMessageId: z.string().min(1).optional(),
		externalEventId: z.string().min(1).optional(),
		subject: z.string().optional(),
		metadata: z.record(z.string(), z.any()).optional(),
	}),
	summary: z.string().optional(),
	nextRecommendedStep: z.string().optional(),
});
