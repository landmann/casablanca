"use client";

import type { ConversationState } from "@casedra/types";
import {
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	cn,
	Textarea,
} from "@casedra/ui";
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
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { trpc } from "@/trpc/shared";

const queueFilters: Array<{ value: "all" | ConversationState; label: string }> =
	[
		{ value: "all", label: "Todos" },
		{ value: "new", label: "Nuevo" },
		{ value: "awaiting_human", label: "Necesita responsable" },
		{ value: "human_active", label: "Con responsable" },
		{ value: "closed", label: "Cerrado" },
	];

const stateLabel: Record<ConversationState, string> = {
	new: "Nuevo",
	bot_active: "Casedra responde",
	awaiting_human: "Necesita responsable",
	human_active: "Con responsable",
	closed: "Cerrado",
};

const handoffTriggerLabel: Record<string, string> = {
	low_confidence: "Necesita revisión",
	lead_requested_human: "Pidió atención humana",
	manual_takeover: "Toma manual",
	routing_rule: "Regla de reparto",
	manager_reassign: "Reasignación de responsable",
	other: "Otro",
};

const messageDirectionLabel: Record<string, string> = {
	inbound: "Entrante",
	outbound: "Saliente",
	internal: "Interno",
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
		return "Todavía no";
	}

	return new Intl.DateTimeFormat("es-ES", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(value);
};

const formatRelativeTime = (value: number | null | undefined) => {
	if (!value) {
		return "Sin actividad";
	}

	const deltaMinutes = Math.round((value - Date.now()) / (60 * 1000));
	const formatter = new Intl.RelativeTimeFormat("es-ES", { numeric: "auto" });

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
	error instanceof Error ? error.message : "La acción del flujo ha fallado";

const formatPercent = (value: number | null | undefined) => {
	if (value === null || value === undefined) {
		return "Todavía no";
	}

	return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
};

const formatDuration = (value: number | null | undefined) => {
	if (value === null || value === undefined) {
		return "Todavía no";
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

	// biome-ignore lint/correctness/useExhaustiveDependencies: Reset composer whenever the selected thread changes.
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
	const createInternalNoteMutation =
		trpc.messages.createInternalNote.useMutation();

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
			setFeedback("La conversación está ahora asignada a ti.");
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
			setFeedback("Conversación reasignada.");
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
			setFeedback(`Conversación movida a ${stateLabel[pendingState]}.`);
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
				setFeedback(
					"Respuesta registrada y responsable de conversación actualizado.",
				);
			} else {
				await createInternalNoteMutation.mutateAsync({
					id: conversationDetail.id,
					body: composerBody.trim(),
				});
				setFeedback("Nota interna añadida.");
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
	const agencyErrorMessage = agencyQuery.error?.message ?? "";
	const agencyErrorCode = agencyQuery.error?.data?.code;
	const missingMembership =
		agencyErrorCode === "FORBIDDEN" ||
		agencyErrorCode === "NOT_FOUND" ||
		/agency.*membership/i.test(agencyErrorMessage);
	const replyBlockedByOwnership =
		conversationDetail?.ownerType === "human" &&
		conversationDetail.ownerUserId !== currentUserId;
	const composerDisabled =
		!conversationDetail ||
		!composerBody.trim() ||
		(composerMode === "reply" &&
			(conversationDetail.state === "closed" || replyBlockedByOwnership));
	const topMetrics = [
		{
			label: "Bandeja",
			value: totalCounts.all,
			icon: MessageSquareText,
		},
		{
			label: "Esperando",
			value: totalCounts.awaiting_human,
			icon: Clock3,
		},
		{
			label: "Primera respuesta",
			value: formatDuration(
				responseMetricsQuery.data?.medianFirstResponseSeconds ??
					inboxSummaryQuery.data?.medianFirstResponseSeconds,
			),
			icon: Clock3,
		},
		{
			label: "Cobertura",
			value: formatPercent(
				responseMetricsQuery.data?.responseCoveragePct ??
					inboxSummaryQuery.data?.responseCoveragePct,
			),
			icon: ShieldCheck,
		},
	] as const;

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
							Bandeja no disponible
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
											// Muestra el error de la mutación abajo sin cortar el reintento.
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
									Crear espacio de trabajo
								</Button>
							) : null}
							<Button
								onClick={() => agencyQuery.refetch()}
								className="rounded-full px-5"
							>
								Reintentar
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
				<header className="rounded-[28px] border border-border/80 bg-background/95 p-5 shadow-[0_18px_60px_rgba(31,26,20,0.06)] sm:p-6">
					<div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
						<div>
							<div className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
								<Building2
									className="h-3.5 w-3.5 text-primary"
									aria-hidden="true"
								/>
								{agency.agency.name}
							</div>
							<h1 className="mt-2 font-serif text-[2.4rem] font-normal leading-tight sm:text-[3.4rem]">
								Bandeja
							</h1>
						</div>

						<div className="flex flex-col gap-4 lg:items-end">
							<p className="text-sm text-muted-foreground">
								Zona horaria: {agency.agency.timezone}
							</p>
						</div>
					</div>
				</header>

				<section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					{topMetrics.map((metric) => {
						const Icon = metric.icon;

						return (
							<Card
								key={metric.label}
								className="rounded-[24px] border-border/80 bg-background/95"
							>
								<CardContent className="flex items-center gap-4 p-4">
									<div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
										<Icon className="h-4 w-4" aria-hidden="true" />
									</div>
									<div>
										<p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
											{metric.label}
										</p>
										<p className="mt-1 text-2xl font-semibold text-foreground">
											{metric.value}
										</p>
									</div>
								</CardContent>
							</Card>
						);
					})}
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
										Hilos
									</CardTitle>
									<p className="mt-2 text-sm leading-6 text-muted-foreground">
										Estado, responsable y última actividad.
									</p>
								</div>
								<Button
									variant="ghost"
									size="icon"
									className="rounded-full"
									onClick={() => conversationsQuery.refetch()}
									aria-label="Actualizar bandeja"
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
												Reintentar bandeja
											</Button>
										</div>
									</div>
								</div>
							) : !visibleConversations.length ? (
								<div className="rounded-[24px] border border-border/80 bg-secondary/55 p-6">
									<p className="text-sm font-medium text-foreground">
										Todavía no hay conversaciones aquí.
									</p>
									<p className="mt-2 text-sm leading-6 text-muted-foreground">
										{filterState === "all"
											? "Los hilos aparecerán aquí cuando entre actividad."
											: `No hay conversaciones en ${queueFilters.find((filter) => filter.value === filterState)?.label.toLowerCase()}.`}
									</p>
								</div>
							) : (
								visibleConversations.map((conversation) => (
									<button
										key={conversation.id}
										type="button"
										onClick={() => setSelectedConversationId(conversation.id)}
										className={cn(
											"w-full rounded-[24px] border p-5 text-left transition-[background-color,border-color,box-shadow,transform] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
													"Todavía no hay resumen. Abre el hilo para revisar el contexto."}
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
											Selecciona una conversación
										</p>
										<p className="max-w-md text-sm leading-6 text-muted-foreground">
											Elige un hilo para leer, responder o reasignar.
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
												No se pudo cargar el hilo
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
										Reintentar hilo
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
														Volver
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
													Responsable
												</p>
												<p className="mt-2 text-base font-semibold text-foreground">
													{conversationDetail.ownerLabel}
												</p>
												<p className="mt-1 text-sm text-muted-foreground">
													{conversationDetail.activeAssignment?.reason ??
														"Asignado según el estado actual."}
												</p>
											</div>
											<div className="rounded-[22px] border border-border/80 bg-secondary/45 p-4">
												<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
													Última actividad
												</p>
												<p className="mt-2 text-base font-semibold text-foreground">
													{formatRelativeTime(conversationDetail.lastMessageAt)}
												</p>
												<p className="mt-1 text-sm text-muted-foreground">
													Actualizado{" "}
													{formatTimestamp(conversationDetail.lastMessageAt)}
												</p>
											</div>
											<div className="rounded-[22px] border border-border/80 bg-secondary/45 p-4">
												<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
													Primera respuesta
												</p>
												<p className="mt-2 text-base font-semibold text-foreground">
													{conversationDetail.firstResponseAt
														? "Registrada"
														: "Pendiente"}
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
														Resumen
													</p>
													<p className="mt-3 text-sm leading-7 text-foreground/90">
														{conversationDetail.summary ??
															"Todavía no hay resumen. La transcripción sigue siendo la fuente de verdad."}
													</p>
												</div>
												<div className="rounded-[24px] border border-border/80 bg-background p-5">
													<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
														Siguiente paso recomendado
													</p>
													<p className="mt-3 text-sm leading-7 text-foreground/90">
														{conversationDetail.nextRecommendedStep ??
															"Todavía no hay ninguna recomendación guardada."}
													</p>
												</div>
											</div>

											<div className="space-y-4">
												<div className="rounded-[24px] border border-border/80 bg-background p-5">
													<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
														Contacto
													</p>
													<div className="mt-3 space-y-2 text-sm text-foreground/90">
														<p>
															{conversationDetail.contact?.email ??
																"No hay correo registrado"}
														</p>
														<p>
															{conversationDetail.contact?.phone ??
																"No hay teléfono registrado"}
														</p>
														<p>
															Tipo de contacto:{" "}
															{conversationDetail.lead?.kind.replaceAll(
																"_",
																" ",
															) ?? "Desconocido"}
														</p>
													</div>
												</div>
												<div className="rounded-[24px] border border-border/80 bg-background p-5">
													<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
														Último traspaso
													</p>
													<p className="mt-3 text-sm leading-7 text-foreground/90">
														{conversationDetail.latestHandoff
															? `${handoffTriggerLabel[conversationDetail.latestHandoff.trigger] ?? conversationDetail.latestHandoff.trigger} movió este hilo de ${conversationDetail.latestHandoff.fromLabel} a ${conversationDetail.latestHandoff.toLabel}.`
															: "Todavía no hay traspasos registrados."}
													</p>
												</div>
											</div>
										</div>

										<div className="grid gap-4 rounded-[24px] border border-border/80 bg-secondary/45 p-5 lg:grid-cols-[auto_auto_1fr]">
											<div className="space-y-2">
												<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
													Toma de control
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
														? "Este hilo es tuyo"
														: "Tomar control"}
												</Button>
											</div>

											<div className="space-y-2">
												<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
													Reasignar
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
														Reasignar
													</Button>
												</div>
											</div>

											<div className="space-y-2">
												<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
													Estado
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
															<option value="">Sin transición válida</option>
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
														Actualizar estado
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
												Escribir
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
													Respuesta
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
													Nota interna
												</button>
											</div>
										</div>
										<p className="text-sm leading-6 text-muted-foreground">
											{composerMode === "reply"
												? "Respuesta visible para el contacto."
												: "Nota visible solo para tu equipo."}
										</p>
									</CardHeader>
									<CardContent className="space-y-4">
										<Textarea
											value={composerBody}
											onChange={(event) => setComposerBody(event.target.value)}
											placeholder={
												composerMode === "reply"
													? "Escribe la respuesta que quieres que reciba este contacto."
													: "Añade contexto para el siguiente responsable."
											}
											className="min-h-[140px] rounded-[24px] border-border/80 px-4 py-4"
										/>
										<div className="flex flex-wrap items-center justify-between gap-3">
											<p className="text-sm text-muted-foreground">
												{replyBlockedByOwnership && composerMode === "reply"
													? "Las respuestas están bloqueadas hasta que el responsable actual traspase este hilo o un responsable lo reasigne."
													: conversationDetail.state === "closed" &&
															composerMode === "reply"
														? "Las conversaciones cerradas necesitan una nueva actividad entrante antes de poder responder."
														: composerMode === "reply"
															? "Responder desde aquí deja el hilo en manos del equipo."
															: "Las notas solo son visibles para tu agencia."}
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
												{composerMode === "reply"
													? "Enviar respuesta"
													: "Guardar nota"}
											</Button>
										</div>
									</CardContent>
								</Card>

								<Card className="rounded-[30px] border-border/80 bg-background/95 shadow-[0_24px_70px_rgba(31,26,20,0.06)]">
									<CardHeader>
										<CardTitle className="font-serif text-[2rem] font-normal leading-tight">
											Transcripción
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
															{messageDirectionLabel[message.direction] ??
																message.direction}
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
