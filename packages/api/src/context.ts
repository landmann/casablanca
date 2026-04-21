import type {
	MediaGenerationRequest,
	MediaGenerationResult,
} from "@casedra/types";
import type { ConvexHttpClient } from "convex/browser";

export interface CasedraSession {
	userId: string;
	sessionId: string | null;
}

export interface CasedraContext {
	convex: ConvexHttpClient;
	session: CasedraSession | null;
	fal: {
		generateMedia: (
			request: MediaGenerationRequest,
		) => Promise<MediaGenerationResult>;
	};
}

export const createContext = (context: CasedraContext) => context;

export type Context = Awaited<ReturnType<typeof createContext>>;
