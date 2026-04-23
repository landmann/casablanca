const ALLOWED_APP_EMAILS = new Set([
	"nlandmanc@gmail.com",
	"debbielandman77@gmail.com",
]);

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

export const isAllowedAppEmailAddress = (emailAddress?: string | null) =>
	Boolean(emailAddress && ALLOWED_APP_EMAILS.has(normalizeEmailAddress(emailAddress)!));

export const isAllowedAppUser = (user: ClerkUserLike) =>
	isAllowedAppEmailAddress(getCurrentUserPrimaryEmailAddress(user));
