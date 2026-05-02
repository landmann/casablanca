import { env } from "@/env";

const DEFAULT_ALLOWED_APP_EMAILS = [
	"nlandmanc@gmail.com",
	"debbielandman77@gmail.com",
] as const;

type ClerkUserLike = {
	primaryEmailAddress?: {
		emailAddress?: string | null;
	} | null;
	primaryEmailAddressId?: string | null;
	emailAddresses?: Array<{
		id: string;
		emailAddress: string;
	}>;
} | null;

const normalizeEmailAddress = (emailAddress?: string | null) =>
	emailAddress?.trim().toLowerCase() ?? null;

const parseAllowedEmailAddressList = (value?: string) =>
	value
		?.split(",")
		.map((emailAddress) => normalizeEmailAddress(emailAddress))
		.filter((emailAddress): emailAddress is string => Boolean(emailAddress)) ??
	[];

const getAllowedAppEmails = () =>
	new Set([
		...DEFAULT_ALLOWED_APP_EMAILS,
		...parseAllowedEmailAddressList(env.APP_ALLOWED_EMAILS),
	]);

export const getCurrentUserPrimaryEmailAddress = (user: ClerkUserLike) => {
	const primaryEmailAddress = normalizeEmailAddress(
		user?.primaryEmailAddress?.emailAddress,
	);

	if (primaryEmailAddress) {
		return primaryEmailAddress;
	}

	const matchingEmailAddress = user?.emailAddresses?.find(
		(emailAddress) => emailAddress.id === user?.primaryEmailAddressId,
	);

	if (matchingEmailAddress?.emailAddress) {
		return normalizeEmailAddress(matchingEmailAddress.emailAddress);
	}

	return normalizeEmailAddress(user?.emailAddresses?.[0]?.emailAddress);
};

export const isAllowedAppEmailAddress = (emailAddress?: string | null) => {
	const normalizedEmailAddress = normalizeEmailAddress(emailAddress);

	return Boolean(
		normalizedEmailAddress && getAllowedAppEmails().has(normalizedEmailAddress),
	);
};

export const isAllowedAppUser = (user: ClerkUserLike) =>
	isAllowedAppEmailAddress(getCurrentUserPrimaryEmailAddress(user));
