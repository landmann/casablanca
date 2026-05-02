import { isClerkAPIResponseError } from "@clerk/nextjs/errors";

type ConvexTokenGetter = (options: {
	template: "convex";
}) => Promise<string | null>;

const isMissingConvexJwtTemplateError = (error: unknown) =>
	error instanceof Error &&
	error.message.includes("No JWT template exists with name: convex");

export const getOptionalConvexAuthToken = async (
	getToken: ConvexTokenGetter,
) => {
	try {
		return await getToken({ template: "convex" });
	} catch (error) {
		if (
			isMissingConvexJwtTemplateError(error) ||
			(isClerkAPIResponseError(error) && error.status === 404)
		) {
			return null;
		}

		throw error;
	}
};
