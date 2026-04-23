"use client";

import type { ConversationState } from "@casedra/types";
import {
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Textarea,
	cn,
} from "@casedra/ui";
import { UserButton } from "@clerk/nextjs";
import {
	AlertCircle,
	ArrowLeft,
	ArrowRightLeft,
	Bot,
	Building2,
	CheckCircle2,
	Clock3,
	LoaderCircle,
	MessageSquareText,
	RefreshCcw,
	ShieldCheck,
	UserCircle2,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { trpc } from "@/trpc/shared";

const queueFilters: Array<{ value: "all" | ConversationState; label: string }> =
	[
		{ value: "all", label: "All" },
		{ value: "new", label: "New" },
		{ value: "awaiting_human", label: "Awaiting human" },
		{ value: "human_active", label: "Human active" },
		{ value: "closed", label: "Closed" },
	];

const stateLabel: Record<ConversationState, string> = {
	new: "New",
	bot_active: "Bot active",
	awaiting_human: "Awaiting human",
	human_active: "Human active",
	closed: "Closed",
};

const handoffTriggerLabel: Record<string, string> = {
	low_confidence: "Low confidence",
	lead_requested_human: "Lead requested human",
	manual_takeover: "Manual takeover",
	routing_rule: "Routing rule",
	manager_reassign: "Manager reassign",
	other: "Other",
};

const nextStateOptions = (conversation: {
	state: ConversationState;
	ownerType: "unassigned" | "ai" | "human";
}) => {
	const transitions: Record<ConversationState, ConversationState[]> = {
		new: [],
		bot_active: ["awaiting_human"],
		awaiting_human: conversation.ownerType === "human" ? ["human_active"] : [],
		human_active: ["closed"],
		closed: [],
	};

	return transitions[conversation.state];
};

const formatTimestamp = (value: number | null | undefined) => {
	if (!value) {
		return "Not yet";
	}

	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(value);
};

const formatRelativeTime = (value: number | null | undefined) => {
	if (!value) {
		return "No activity";
	}

	const deltaMinutes = Math.round((value - Date.now()) / (60 * 1000));
	const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

	if (Math.abs(deltaMinutes) < 60) {
		return formatter.format(deltaMinutes, "minute");
	}

	const deltaHours = Math.round(deltaMinutes / 60);
	if (Math.abs(deltaHours) < 24) {
		return formatter.format(deltaHours, "hour");
	}

	const deltaDays = Math.round(deltaHours / 24);
	return formatter.format(deltaDays, "day");
};

const feedbackFromError = (error: unknown) =>
	error instanceof Error ? error.message : "Workflow action failed";

const formatPercent = (value: number | null | undefined) => {
	if (value === null || value === undefined) {
		return "Not yet";
	}

	return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
};

const formatDuration = (value: number | null | undefined) => {
	if (value === null || value === undefined) {
		return "Not yet";
	}

	if (value < 60) {
		return `${value}s`;
	}

	const hours = Math.floor(value / 3600);
	const minutes = Math.floor((value % 3600) / 60);
	const seconds = value % 60;

	if (hours > 0) {
		return `${hours}h ${minutes}m`;
	}

	if (seconds === 0) {
		return `${minutes}m`;
	}

	return `${minutes}m ${seconds}s`;
};

const queueSkeletonKeys = [
	"queue-skeleton-0",
	"queue-skeleton-1",
	"queue-skeleton-2",
	"queue-skeleton-3",
];

const QueueSkeleton = () => (
	<div className="space-y-3">
		{queueSkeletonKeys.map((key) => (
			<div
				key={key}
				className="animate-pulse rounded-[22px] border border-border/70 bg-secondary/55 p-4"
			>
				<div className="h-4 w-28 rounded-full bg-border/80" />
				<div className="mt-3 h-3 w-44 rounded-full bg-border/70" />
				<div className="mt-4 h-3 w-full rounded-full bg-border/60" />
				<div className="mt-2 h-3 w-4/5 rounded-full bg-border/60" />
			</div>
		))}
	</div>
);

const ThreadSkeleton = () => (
	<div className="space-y-4">
		<div className="animate-pulse rounded-[24px] border border-border/70 bg-secondary/55 p-6">
			<div className="h-4 w-32 rounded-full bg-border/80" />
			<div className="mt-3 h-7 w-56 rounded-full bg-border/70" />
			<div className="mt-5 h-3 w-full rounded-full bg-border/60" />
			<div className="mt-2 h-3 w-11/12 rounded-full bg-border/60" />
			<div className="mt-2 h-3 w-4/5 rounded-full bg-border/60" />
		</div>
		<div className="animate-pulse rounded-[24px] border border-border/70 bg-secondary/55 p-6">
			<div className="h-4 w-24 rounded-full bg-border/80" />
			<div className="mt-4 h-3 w-full rounded-full bg-border/60" />
			<div className="mt-2 h-3 w-5/6 rounded-full bg-border/60" />
			<div className="mt-2 h-3 w-3/4 rounded-full bg-border/60" />
		</div>
	</div>
);

function StateChip({ state }: { state: ConversationState }) {
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em]",
				state === "closed" &&
					"border-border bg-background text-muted-foreground",
				state === "new" && "border-primary/25 bg-primary/10 text-primary",
				state === "bot_active" && "border-border bg-secondary text-foreground",
				state === "awaiting_human" &&
					"border-primary/30 bg-primary/10 text-foreground",
				state === "human_active" &&
					"border-border bg-background text-foreground",
			)}
		>
			{stateLabel[state]}
		</span>
	);
}

export default function InboxScreen() {
	const utils = trpc.useUtils();
	const [filterState, setFilterState] = useState<"all" | ConversationState>(
		"all",
	);
	const [selectedConversationId, setSelectedConversationId] = useState<
		string | null
	>(null);
	const [feedback, setFeedback] = useState<string | null>(null);
	const [pendingAssigneeUserId, setPendingAssigneeUserId] = useState("");
	const [pendingState, setPendingState] = useState<ConversationState | "">("");
	const [composerMode, setComposerMode] = useState<"reply" | "note">("reply");
	const [composerBody, setComposerBody] = useState("");

	const agencyQuery = trpc.agencies.getCurrentAgency.useQuery();
	const createWorkspaceMutation =
		trpc.agencies.createDefaultAgencyForUser.useMutation();
	const inboxSummaryQuery = trpc.reporting.getInboxSummary.useQuery(undefined, {
		enabled: agencyQuery.status === "success",
	});
	const responseMetricsQuery = trpc.reporting.getResponseMetrics.useQuery(
		{ days: 7 },
		{
			enabled: agencyQuery.status === "success",
		},
	);
	const membershipsQuery = trpc.agencies.listMemberships.useQuery(undefined, {
		enabled: agencyQuery.status === "success",
	});
	const conversationsQuery = trpc.conversations.list.useQuery(undefined, {
		enabled: agencyQuery.status === "success",
	});

	const visibleConversations = useMemo(() => {
		const allConversations = conversationsQuery.data ?? [];
		if (filterState === "all") {
			return allConversations;
		}

		return allConversations.filter(
			(conversation) => conversation.state === filterState,
		);
	}, [conversationsQuery.data, filterState]);

	useEffect(() => {
		if (!visibleConversations.length) {
			setSelectedConversationId(null);
			return;
		}

		if (!selectedConversationId) {
			setSelectedConversationId(visibleConversations[0]?.id ?? null);
			return;
		}

		const stillVisible = visibleConversations.some(
			(conversation) => conversation.id === selectedConversationId,
		);

		if (!stillVisible) {
			setSelectedConversationId(visibleConversations[0]?.id ?? null);
		}
	}, [selectedConversationId, visibleConversations]);

	const conversationDetailQuery = trpc.conversations.byId.useQuery(
		{ id: selectedConversationId ?? "" },
		{
			enabled: Boolean(selectedConversationId),
		},
	);
	const messagesQuery = trpc.messages.listByConversation.useQuery(
		{ id: selectedConversationId ?? "" },
		{
			enabled: Boolean(selectedConversationId),
		},
	);

	const conversationDetail = conversationDetailQuery.data;
	const currentUserId = agencyQuery.data?.membership.userId ?? null;
	const canManageAssignments =
		agencyQuery.data?.membership.role === "owner" ||
		agencyQuery.data?.membership.role === "manager";

	useEffect(() => {
		if (!conversationDetail || !membershipsQuery.data?.length) {
			return;
		}

		const defaultAssignee =
			conversationDetail.ownerType === "human" && conversationDetail.ownerUserId
				? conversationDetail.ownerUserId
				: (membershipsQuery.data.find(
						(membership) =>
							membership.userId !== conversationDetail.ownerUserId,
					)?.userId ??
					membershipsQuery.data[0]?.userId ??
					"");

		setPendingAssigneeUserId(defaultAssignee);
		setPendingState(nextStateOptions(conversationDetail)[0] ?? "");
	}, [conversationDetail, membershipsQuery.data]);

	useEffect(() => {
		setComposerMode("reply");
		setComposerBody("");
	}, [selectedConversationId]);

	const invalidateWorkflow = async (conversationId: string | null) => {
		await Promise.all([
			utils.conversations.list.invalidate(),
			utils.reporting.getInboxSummary.invalidate(),
			utils.reporting.getResponseMetrics.invalidate({ days: 7 }),
		]);

		if (conversationId) {
			await Promise.all([
				utils.conversations.byId.invalidate({ id: conversationId }),
				utils.messages.listByConversation.invalidate({ id: conversationId }),
			]);
		}
	};

	const takeOverMutation = trpc.conversations.takeOver.useMutation();
	const reassignMutation = trpc.conversations.reassign.useMutation();
	const setStateMutation = trpc.conversations.setState.useMutation();
	const createOutboundMutation = trpc.messages.createOutbound.useMutation();
	const createInternalNoteMutation = trpc.messages.createInternalNote.useMutation();

	const handleTakeOver = async () => {
		if (!conversationDetail) {
			return;
		}

		try {
			setFeedback(null);
			await takeOverMutation.mutateAsync({
				id: conversationDetail.id,
				expectedVersion: conversationDetail.version,
			});
			await invalidateWorkflow(conversationDetail.id);
			setFeedback("Conversation is now assigned to you.");
		} catch (error) {
			await invalidateWorkflow(conversationDetail.id);
			setFeedback(feedbackFromError(error));
		}
	};

	const handleReassign = async () => {
		if (!conversationDetail || !pendingAssigneeUserId) {
			return;
		}

		try {
			setFeedback(null);
			await reassignMutation.mutateAsync({
				id: conversationDetail.id,
				assigneeUserId: pendingAssigneeUserId,
				expectedVersion: conversationDetail.version,
			});
			await invalidateWorkflow(conversationDetail.id);
			setFeedback("Conversation reassigned.");
		} catch (error) {
			await invalidateWorkflow(conversationDetail.id);
			setFeedback(feedbackFromError(error));
		}
	};

	const handleStateChange = async () => {
		if (!conversationDetail || !pendingState) {
			return;
		}

		try {
			setFeedback(null);
			await setStateMutation.mutateAsync({
				id: conversationDetail.id,
				state: pendingState,
				expectedVersion: conversationDetail.version,
			});
			await invalidateWorkflow(conversationDetail.id);
			setFeedback(`Conversation moved to ${stateLabel[pendingState]}.`);
		} catch (error) {
			await invalidateWorkflow(conversationDetail.id);
			setFeedback(feedbackFromError(error));
		}
	};

	const handleComposerSubmit = async () => {
		if (
			!conversationDetail ||
			!composerBody.trim() ||
			(composerMode === "reply" && replyBlockedByOwnership)
		) {
			return;
		}

		try {
			setFeedback(null);
			if (composerMode === "reply") {
				await createOutboundMutation.mutateAsync({
					id: conversationDetail.id,
					body: composerBody.trim(),
				});
				setFeedback("Reply recorded and conversation ownership updated.");
			} else {
				await createInternalNoteMutation.mutateAsync({
					id: conversationDetail.id,
					body: composerBody.trim(),
				});
				setFeedback("Internal note added.");
			}
			setComposerBody("");
			await invalidateWorkflow(conversationDetail.id);
		} catch (error) {
			await invalidateWorkflow(conversationDetail.id);
			setFeedback(feedbackFromError(error));
		}
	};

	const totalCounts = useMemo(() => {
		if (inboxSummaryQuery.data) {
			return {
				all: inboxSummaryQuery.data.totalConversations,
				new: inboxSummaryQuery.data.countsByState.new,
				bot_active: inboxSummaryQuery.data.countsByState.botActive,
				awaiting_human: inboxSummaryQuery.data.countsByState.awaitingHuman,
				human_active: inboxSummaryQuery.data.countsByState.humanActive,
				closed: inboxSummaryQuery.data.countsByState.closed,
			};
		}

		const allConversations = conversationsQuery.data ?? [];
		return {
			all: allConversations.length,
			new: allConversations.filter(
				(conversation) => conversation.state === "new",
			).length,
			bot_active: allConversations.filter(
				(conversation) => conversation.state === "bot_active",
			).length,
			awaiting_human: allConversations.filter(
				(conversation) => conversation.state === "awaiting_human",
			).length,
			human_active: allConversations.filter(
				(conversation) => conversation.state === "human_active",
			).length,
			closed: allConversations.filter(
				(conversation) => conversation.state === "closed",
			).length,
		};
	}, [conversationsQuery.data, inboxSummaryQuery.data]);

	const takeoverDisabled =
		!conversationDetail ||
		conversationDetail.state === "closed" ||
		(conversationDetail.ownerType === "human" &&
			conversationDetail.ownerUserId !== currentUserId);

	const showBackButtonOnMobile = Boolean(selectedConversationId);
	const missingMembership =
		agencyQuery.error?.message === "No agency membership is available for this user";
	const replyBlockedByOwnership =
		conversationDetail?.ownerType === "human" &&
		conversationDetail.ownerUserId !== currentUserId;
	const composerDisabled =
		!conversationDetail ||
		!composerBody.trim() ||
		(composerMode === "reply" &&
			(conversationDetail.state === "closed" || replyBlockedByOwnership));

	if (agencyQuery.isLoading) {
		return (
			<div className="mx-auto min-h-screen w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
				<ThreadSkeleton />
			</div>
		);
	}

	if (agencyQuery.isError) {
		return (
			<div className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 sm:px-8">
				<Card className="rounded-[28px] border-border/80 bg-background/95">
					<CardHeader>
						<CardTitle className="font-serif text-3xl font-normal">
							Inbox unavailable
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<p className="text-sm leading-6 text-muted-foreground">
							{agencyQuery.error.message}
						</p>
						<div className="flex flex-wrap gap-3">
							{missingMembership ? (
								<Button
									onClick={async () => {
										try {
											await createWorkspaceMutation.mutateAsync();
											await agencyQuery.refetch();
										} catch {
											// Surface the mutation error below without interrupting the retry flow.
										}
									}}
									className="rounded-full px-5"
									disabled={createWorkspaceMutation.isPending}
								>
									{createWorkspaceMutation.isPending ? (
										<LoaderCircle
											className="mr-2 h-4 w-4 animate-spin"
											aria-hidden="true"
										/>
									) : null}
									Create workspace
								</Button>
							) : null}
							<Button
								onClick={() => agencyQuery.refetch()}
								className="rounded-full px-5"
							>
								Retry
							</Button>
							<Button asChild variant="outline" className="rounded-full px-5">
								<Link href="/app/studio">Back to studio</Link>
							</Button>
						</div>
						{createWorkspaceMutation.error ? (
							<p className="text-sm leading-6 text-destructive">
								{createWorkspaceMutation.error.message}
							</p>
						) : null}
					</CardContent>
				</Card>
			</div>
		);
	}

	const agency = agencyQuery.data;
	if (!agency) {
		return null;
	}

	return (
		<div className="min-h-screen bg-background text-foreground">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-6 sm:px-8 sm:py-8">
				<header className="relative overflow-hidden rounded-[32px] border border-border/80 bg-background/92 p-6 shadow-[0_24px_80px_rgba(31,26,20,0.07)] sm:p-8">
					<div className="pointer-events-none absolute inset-0">
						<div className="absolute left-[-5rem] top-[-4rem] h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(156,97,55,0.14),transparent_62%)] blur-3xl" />
						<div className="absolute right-[-4rem] top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(232,223,204,0.95),transparent_68%)] blur-3xl" />
					</div>

					<div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
						<div className="space-y-4">
							<div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/90 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
								<Building2
									className="h-3.5 w-3.5 text-primary"
									aria-hidden="true"
								/>
								Live workflow
							</div>
							<div>
								<h1 className="font-serif text-[2.6rem] font-normal leading-tight sm:text-[4.2rem]">
									Inbox
								</h1>
								<p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
									{agency.agency.name} is now running on real workflow records
									with explicit ownership, handoff history, and transcript
									state.
								</p>
							</div>
						</div>

						<div className="flex flex-col gap-4 lg:items-end">
							<div className="flex items-center gap-3">
								<Button asChild variant="outline" className="rounded-full px-5">
									<Link href="/app/studio">Studio preview</Link>
								</Button>
								<UserButton />
							</div>
							<p className="text-sm text-muted-foreground">
								Timezone: {agency.agency.timezone}
							</p>
						</div>
					</div>
				</header>

				<section className="grid gap-4 lg:grid-cols-4">
					<Card className="rounded-[26px] border-border/80 bg-background/95">
						<CardContent className="flex items-center gap-4 p-5">
							<div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
								<MessageSquareText className="h-5 w-5" aria-hidden="true" />
							</div>
							<div>
								<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
									Total queue
								</p>
								<p className="mt-1 text-2xl font-semibold text-foreground">
									{totalCounts.all}
								</p>
							</div>
						</CardContent>
					</Card>
					<Card className="rounded-[26px] border-border/80 bg-background/95">
						<CardContent className="flex items-center gap-4 p-5">
							<div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
								<Clock3 className="h-5 w-5" aria-hidden="true" />
							</div>
							<div>
								<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
									Awaiting human
								</p>
								<p className="mt-1 text-2xl font-semibold text-foreground">
									{totalCounts.awaiting_human}
								</p>
							</div>
						</CardContent>
					</Card>
					<Card className="rounded-[26px] border-border/80 bg-background/95">
						<CardContent className="flex items-center gap-4 p-5">
							<div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
								<Users className="h-5 w-5" aria-hidden="true" />
							</div>
							<div>
								<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
									Human active
								</p>
								<p className="mt-1 text-2xl font-semibold text-foreground">
									{totalCounts.human_active}
								</p>
							</div>
						</CardContent>
					</Card>
					<Card className="rounded-[26px] border-border/80 bg-background/95">
						<CardContent className="flex items-center gap-4 p-5">
							<div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
								<ShieldCheck className="h-5 w-5" aria-hidden="true" />
							</div>
							<div>
								<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
									Closed cleanly
								</p>
								<p className="mt-1 text-2xl font-semibold text-foreground">
									{totalCounts.closed}
								</p>
							</div>
						</CardContent>
					</Card>
				</section>

				<section className="grid gap-4 lg:grid-cols-4">
					<Card className="rounded-[26px] border-border/80 bg-background/95">
						<CardContent className="flex items-center gap-4 p-5">
							<div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
								<Clock3 className="h-5 w-5" aria-hidden="true" />
							</div>
							<div>
								<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
									Median first response
								</p>
								<p className="mt-1 text-2xl font-semibold text-foreground">
									{formatDuration(
										responseMetricsQuery.data?.medianFirstResponseSeconds ??
											inboxSummaryQuery.data?.medianFirstResponseSeconds,
									)}
								</p>
							</div>
						</CardContent>
					</Card>
					<Card className="rounded-[26px] border-border/80 bg-background/95">
						<CardContent className="flex items-center gap-4 p-5">
							<div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
								<ShieldCheck className="h-5 w-5" aria-hidden="true" />
							</div>
							<div>
								<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
									Response coverage
								</p>
								<p className="mt-1 text-2xl font-semibold text-foreground">
									{formatPercent(
										responseMetricsQuery.data?.responseCoveragePct ??
											inboxSummaryQuery.data?.responseCoveragePct,
									)}
								</p>
							</div>
						</CardContent>
					</Card>
					<Card className="rounded-[26px] border-border/80 bg-background/95">
						<CardContent className="flex items-center gap-4 p-5">
							<div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
								<ArrowRightLeft className="h-5 w-5" aria-hidden="true" />
							</div>
							<div>
								<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
									Handoff rate
								</p>
								<p className="mt-1 text-2xl font-semibold text-foreground">
									{formatPercent(
										responseMetricsQuery.data?.handoffRatePct ??
											inboxSummaryQuery.data?.handoffRatePct,
									)}
								</p>
							</div>
						</CardContent>
					</Card>
					<Card className="rounded-[26px] border-border/80 bg-background/95">
						<CardContent className="flex items-center gap-4 p-5">
							<div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
								<RefreshCcw className="h-5 w-5" aria-hidden="true" />
							</div>
							<div>
								<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
									Reopened after close
								</p>
								<p className="mt-1 text-2xl font-semibold text-foreground">
									{formatPercent(
										inboxSummaryQuery.data?.reopenedConversationRatePct,
									)}
								</p>
							</div>
						</CardContent>
					</Card>
				</section>

				<div aria-live="polite" className="min-h-6 text-sm text-foreground">
					{feedback ? feedback : null}
				</div>

				<section className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
					<Card
						className={cn(
							"rounded-[30px] border-border/80 bg-background/95 shadow-[0_24px_70px_rgba(31,26,20,0.06)]",
							selectedConversationId ? "hidden lg:block" : "block",
						)}
					>
						<CardHeader className="space-y-5">
							<div className="flex items-center justify-between gap-3">
								<div>
									<CardTitle className="font-serif text-[2rem] font-normal leading-tight">
										Queue
									</CardTitle>
									<p className="mt-2 text-sm leading-6 text-muted-foreground">
										Every inbound conversation with explicit state and
										ownership.
									</p>
								</div>
								<Button
									variant="ghost"
									size="icon"
									className="rounded-full"
									onClick={() => conversationsQuery.refetch()}
									aria-label="Refresh queue"
								>
									<RefreshCcw className="h-4 w-4" aria-hidden="true" />
								</Button>
							</div>

							<div className="flex flex-wrap gap-2">
								{queueFilters.map((filter) => (
									<button
										key={filter.value}
										type="button"
										onClick={() => setFilterState(filter.value)}
										className={cn(
											"rounded-full border px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
											filterState === filter.value
												? "border-primary bg-primary text-primary-foreground"
												: "border-border bg-background text-muted-foreground hover:text-foreground",
										)}
									>
										{filter.label}{" "}
										<span className="ml-1 text-primary-foreground/80">
											{totalCounts[filter.value]}
										</span>
									</button>
								))}
							</div>
						</CardHeader>

						<CardContent className="space-y-3">
							{conversationsQuery.isLoading ? (
								<QueueSkeleton />
							) : conversationsQuery.isError ? (
								<div className="rounded-[22px] border border-destructive/20 bg-destructive/5 p-5 text-sm leading-6 text-foreground">
									<div className="flex items-start gap-3">
										<AlertCircle
											className="mt-0.5 h-4 w-4 text-destructive"
											aria-hidden="true"
										/>
										<div className="space-y-3">
											<p>{conversationsQuery.error.message}</p>
											<Button
												variant="outline"
												className="rounded-full px-4"
												onClick={() => conversationsQuery.refetch()}
											>
												Retry queue
											</Button>
										</div>
									</div>
								</div>
							) : !visibleConversations.length ? (
								<div className="rounded-[24px] border border-border/80 bg-secondary/55 p-6">
									<p className="text-sm font-medium text-foreground">
										No conversations here yet.
									</p>
									<p className="mt-2 text-sm leading-6 text-muted-foreground">
										{filterState === "all"
											? "Bootstrap data or live ingestion will show up here."
											: `There are no conversations in ${queueFilters.find((filter) => filter.value === filterState)?.label.toLowerCase()}.`}
									</p>
								</div>
							) : (
								visibleConversations.map((conversation) => (
									<button
										key={conversation.id}
										type="button"
										onClick={() => setSelectedConversationId(conversation.id)}
										className={cn(
											"w-full rounded-[24px] border p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
											selectedConversationId === conversation.id
												? "border-primary/40 bg-primary/10 shadow-[0_16px_42px_rgba(156,97,55,0.10)]"
												: "border-border/80 bg-secondary/45 hover:border-primary/25 hover:bg-secondary/70",
										)}
									>
										<div className="flex flex-col gap-3">
											<div className="flex items-start justify-between gap-4">
												<div>
													<p className="text-base font-semibold text-foreground">
														{conversation.contactName}
													</p>
													<p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
														{conversation.channel?.label ??
															conversation.sourceLabel}
													</p>
												</div>
												<StateChip state={conversation.state} />
											</div>

											<p className="text-sm leading-6 text-foreground/90">
												{conversation.summary ??
													"No summary yet. Open the thread to review context."}
											</p>

											<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
												<span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1">
													<UserCircle2
														className="h-3.5 w-3.5"
														aria-hidden="true"
													/>
													{conversation.ownerLabel}
												</span>
												<span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1">
													<Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
													{formatRelativeTime(conversation.lastMessageAt)}
												</span>
											</div>
										</div>
									</button>
								))
							)}
						</CardContent>
					</Card>

					<div
						className={cn(
							selectedConversationId ? "block" : "hidden lg:block",
							"min-w-0",
						)}
					>
						{!selectedConversationId ? (
							<Card className="rounded-[30px] border-border/80 bg-background/95">
								<CardContent className="flex min-h-[520px] flex-col items-center justify-center gap-4 p-10 text-center">
									<MessageSquareText
										className="h-9 w-9 text-primary"
										aria-hidden="true"
									/>
									<div className="space-y-2">
										<p className="font-serif text-3xl font-normal">
											Select a conversation
										</p>
										<p className="max-w-md text-sm leading-6 text-muted-foreground">
											Pick any queue item to inspect the transcript, see
											ownership history, and act on the thread.
										</p>
									</div>
								</CardContent>
							</Card>
						) : conversationDetailQuery.isLoading || messagesQuery.isLoading ? (
							<ThreadSkeleton />
						) : conversationDetailQuery.isError || messagesQuery.isError ? (
							<Card className="rounded-[30px] border-border/80 bg-background/95">
								<CardContent className="space-y-4 p-8">
									<div className="flex items-start gap-3">
										<AlertCircle
											className="mt-0.5 h-4 w-4 text-destructive"
											aria-hidden="true"
										/>
										<div>
											<p className="text-sm font-medium text-foreground">
												Thread failed to load
											</p>
											<p className="mt-2 text-sm leading-6 text-muted-foreground">
												{conversationDetailQuery.error?.message ??
													messagesQuery.error?.message}
											</p>
										</div>
									</div>
									<Button
										variant="outline"
										className="rounded-full px-5"
										onClick={() => {
											void conversationDetailQuery.refetch();
											void messagesQuery.refetch();
										}}
									>
										Retry thread
									</Button>
								</CardContent>
							</Card>
						) : conversationDetail ? (
							<div className="space-y-6">
								<Card className="rounded-[30px] border-border/80 bg-background/95 shadow-[0_24px_70px_rgba(31,26,20,0.06)]">
									<CardHeader className="space-y-6">
										<div className="flex items-start justify-between gap-4">
											<div className="space-y-3">
												{showBackButtonOnMobile ? (
													<Button
														variant="ghost"
														className="h-9 rounded-full px-3 lg:hidden"
														onClick={() => setSelectedConversationId(null)}
													>
														<ArrowLeft
															className="mr-2 h-4 w-4"
															aria-hidden="true"
														/>
														Back
													</Button>
												) : null}
												<div>
													<p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
														{conversationDetail.channel?.label ??
															conversationDetail.sourceLabel}
													</p>
													<h2 className="mt-2 font-serif text-[2.2rem] font-normal leading-tight sm:text-[3rem]">
														{conversationDetail.contactName}
													</h2>
												</div>
											</div>
											<StateChip state={conversationDetail.state} />
										</div>

										<div className="grid gap-3 md:grid-cols-3">
											<div className="rounded-[22px] border border-border/80 bg-secondary/45 p-4">
												<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
													Owner
												</p>
												<p className="mt-2 text-base font-semibold text-foreground">
													{conversationDetail.ownerLabel}
												</p>
												<p className="mt-1 text-sm text-muted-foreground">
													{conversationDetail.activeAssignment?.reason ??
														"Current owner comes from conversation state."}
												</p>
											</div>
											<div className="rounded-[22px] border border-border/80 bg-secondary/45 p-4">
												<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
													Last activity
												</p>
												<p className="mt-2 text-base font-semibold text-foreground">
													{formatRelativeTime(conversationDetail.lastMessageAt)}
												</p>
												<p className="mt-1 text-sm text-muted-foreground">
													Updated{" "}
													{formatTimestamp(conversationDetail.lastMessageAt)}
												</p>
											</div>
											<div className="rounded-[22px] border border-border/80 bg-secondary/45 p-4">
												<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
													First response
												</p>
												<p className="mt-2 text-base font-semibold text-foreground">
													{conversationDetail.firstResponseAt
														? "Recorded"
														: "Pending"}
												</p>
												<p className="mt-1 text-sm text-muted-foreground">
													{formatTimestamp(conversationDetail.firstResponseAt)}
												</p>
											</div>
										</div>
									</CardHeader>

									<CardContent className="space-y-6">
										<div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
											<div className="space-y-4">
												<div className="rounded-[24px] border border-border/80 bg-background p-5">
													<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
														Summary
													</p>
													<p className="mt-3 text-sm leading-7 text-foreground/90">
														{conversationDetail.summary ??
															"No summary yet. The transcript is still the source of truth."}
													</p>
												</div>
												<div className="rounded-[24px] border border-border/80 bg-background p-5">
													<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
														Next recommended step
													</p>
													<p className="mt-3 text-sm leading-7 text-foreground/90">
														{conversationDetail.nextRecommendedStep ??
															"No recommendation has been stored yet."}
													</p>
												</div>
											</div>

											<div className="space-y-4">
												<div className="rounded-[24px] border border-border/80 bg-background p-5">
													<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
														Contact
													</p>
													<div className="mt-3 space-y-2 text-sm text-foreground/90">
														<p>
															{conversationDetail.contact?.email ??
																"No email recorded"}
														</p>
														<p>
															{conversationDetail.contact?.phone ??
																"No phone recorded"}
														</p>
														<p>
															Lead type:{" "}
															{conversationDetail.lead?.kind.replaceAll(
																"_",
																" ",
															) ?? "Unknown"}
														</p>
													</div>
												</div>
												<div className="rounded-[24px] border border-border/80 bg-background p-5">
													<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
														Latest handoff
													</p>
													<p className="mt-3 text-sm leading-7 text-foreground/90">
														{conversationDetail.latestHandoff
															? `${handoffTriggerLabel[conversationDetail.latestHandoff.trigger] ?? conversationDetail.latestHandoff.trigger} moved this thread from ${conversationDetail.latestHandoff.fromLabel} to ${conversationDetail.latestHandoff.toLabel}.`
															: "No handoff event recorded yet."}
													</p>
												</div>
											</div>
										</div>

										<div className="grid gap-4 rounded-[24px] border border-border/80 bg-secondary/45 p-5 lg:grid-cols-[auto_auto_1fr]">
											<div className="space-y-2">
												<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
													Takeover
												</p>
												<Button
													className="rounded-full px-5"
													disabled={
														takeoverDisabled || takeOverMutation.isPending
													}
													onClick={handleTakeOver}
												>
													{takeOverMutation.isPending ? (
														<LoaderCircle
															className="mr-2 h-4 w-4 animate-spin"
															aria-hidden="true"
														/>
													) : (
														<Bot className="mr-2 h-4 w-4" aria-hidden="true" />
													)}
													{conversationDetail.ownerUserId === currentUserId &&
													conversationDetail.state === "human_active"
														? "You own this thread"
														: "Take over"}
												</Button>
											</div>

											<div className="space-y-2">
												<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
													Reassign
												</p>
												<div className="flex flex-wrap gap-2">
													<select
														value={pendingAssigneeUserId}
														onChange={(event) =>
															setPendingAssigneeUserId(event.target.value)
														}
														className="h-10 min-w-[190px] rounded-full border border-border bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
														disabled={
															!canManageAssignments ||
															!membershipsQuery.data?.length
														}
													>
														{membershipsQuery.data?.map((membership) => (
															<option
																key={membership.id}
																value={membership.userId}
															>
																{membership.displayName ?? membership.userId}
															</option>
														))}
													</select>
													<Button
														variant="outline"
														className="rounded-full px-5"
														disabled={
															!canManageAssignments ||
															!pendingAssigneeUserId ||
															reassignMutation.isPending ||
															(conversationDetail.ownerType === "human" &&
																conversationDetail.ownerUserId ===
																	pendingAssigneeUserId)
														}
														onClick={handleReassign}
													>
														{reassignMutation.isPending ? (
															<LoaderCircle
																className="mr-2 h-4 w-4 animate-spin"
																aria-hidden="true"
															/>
														) : (
															<ArrowRightLeft
																className="mr-2 h-4 w-4"
																aria-hidden="true"
															/>
														)}
														Reassign
													</Button>
												</div>
											</div>

											<div className="space-y-2">
												<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
													State
												</p>
												<div className="flex flex-wrap gap-2">
													<select
														value={pendingState}
														onChange={(event) =>
															setPendingState(
																event.target.value as ConversationState,
															)
														}
														className="h-10 min-w-[190px] rounded-full border border-border bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
														disabled={
															!nextStateOptions(conversationDetail).length
														}
													>
														{nextStateOptions(conversationDetail).length ? (
															nextStateOptions(conversationDetail).map(
																(state) => (
																	<option key={state} value={state}>
																		{stateLabel[state]}
																	</option>
																),
															)
														) : (
															<option value="">No valid transition</option>
														)}
													</select>
													<Button
														variant="outline"
														className="rounded-full px-5"
														disabled={
															!pendingState || setStateMutation.isPending
														}
														onClick={handleStateChange}
													>
														{setStateMutation.isPending ? (
															<LoaderCircle
																className="mr-2 h-4 w-4 animate-spin"
																aria-hidden="true"
															/>
														) : (
															<CheckCircle2
																className="mr-2 h-4 w-4"
																aria-hidden="true"
															/>
														)}
														Update state
													</Button>
												</div>
											</div>
										</div>
									</CardContent>
								</Card>

								<Card className="rounded-[30px] border-border/80 bg-background/95 shadow-[0_24px_70px_rgba(31,26,20,0.06)]">
									<CardHeader className="space-y-4">
										<div className="flex flex-wrap items-center justify-between gap-3">
											<CardTitle className="font-serif text-[2rem] font-normal leading-tight">
												Write
											</CardTitle>
											<div className="flex flex-wrap gap-2">
												<button
													type="button"
													onClick={() => setComposerMode("reply")}
													className={cn(
														"rounded-full border px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
														composerMode === "reply"
															? "border-primary bg-primary text-primary-foreground"
															: "border-border bg-background text-muted-foreground hover:text-foreground",
													)}
												>
													Reply
												</button>
												<button
													type="button"
													onClick={() => setComposerMode("note")}
													className={cn(
														"rounded-full border px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
														composerMode === "note"
															? "border-primary bg-primary text-primary-foreground"
															: "border-border bg-background text-muted-foreground hover:text-foreground",
													)}
												>
													Internal note
												</button>
											</div>
										</div>
										<p className="text-sm leading-6 text-muted-foreground">
											{composerMode === "reply"
												? "A human reply records first response timing when needed and claims ownership of the thread."
												: "Internal notes stay in the transcript without counting as a customer response."}
										</p>
									</CardHeader>
									<CardContent className="space-y-4">
										<Textarea
											value={composerBody}
											onChange={(event) => setComposerBody(event.target.value)}
											placeholder={
												composerMode === "reply"
													? "Write the reply you want this lead to receive."
													: "Add context for the next teammate."
											}
											className="min-h-[140px] rounded-[24px] border-border/80 px-4 py-4"
										/>
										<div className="flex flex-wrap items-center justify-between gap-3">
											<p className="text-sm text-muted-foreground">
												{replyBlockedByOwnership &&
												composerMode === "reply"
													? "Replies are blocked until the current owner hands this thread off or a manager reassigns it."
													: conversationDetail.state === "closed" &&
															composerMode === "reply"
													? "Closed conversations need to be reopened by new inbound activity before replying."
													: composerMode === "reply"
														? "Replying from here marks the thread as human active."
														: "Notes are visible to your agency only."}
											</p>
											<Button
												className="rounded-full px-5"
												onClick={handleComposerSubmit}
												disabled={
													composerDisabled ||
													createOutboundMutation.isPending ||
													createInternalNoteMutation.isPending
												}
											>
												{createOutboundMutation.isPending ||
												createInternalNoteMutation.isPending ? (
													<LoaderCircle
														className="mr-2 h-4 w-4 animate-spin"
														aria-hidden="true"
													/>
												) : null}
												{composerMode === "reply" ? "Send reply" : "Save note"}
											</Button>
										</div>
									</CardContent>
								</Card>

								<Card className="rounded-[30px] border-border/80 bg-background/95 shadow-[0_24px_70px_rgba(31,26,20,0.06)]">
									<CardHeader>
										<CardTitle className="font-serif text-[2rem] font-normal leading-tight">
											Transcript
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-4">
										{messagesQuery.data?.map((message) => (
											<div
												key={message.id}
												className={cn(
													"rounded-[24px] border p-5",
													message.direction === "inbound" &&
														"border-border/80 bg-background",
													message.direction === "outbound" &&
														"border-primary/25 bg-primary/10",
													message.direction === "internal" &&
														"border-border/80 bg-secondary/55",
												)}
											>
												<div className="flex flex-wrap items-center justify-between gap-3">
													<div>
														<p className="text-sm font-semibold text-foreground">
															{message.senderLabel}
														</p>
														<p className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
															{message.direction}
														</p>
													</div>
													<p className="text-xs text-muted-foreground">
														{formatTimestamp(message.sentAt)}
													</p>
												</div>
												<p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-foreground/90">
													{message.body}
												</p>
											</div>
										))}
									</CardContent>
								</Card>
							</div>
						) : null}
					</div>
				</section>
			</div>
		</div>
	);
}
