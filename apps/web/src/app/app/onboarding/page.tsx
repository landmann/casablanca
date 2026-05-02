import { getAvailableLocalizaStrategies } from "@/server/localiza/availability";
import OnboardingFlow, { type OnboardingStepKey } from "./OnboardingFlow";

type OnboardingPageProps = {
	searchParams?: Promise<{
		step?: string;
		sourceUrl?: string;
		localizaCandidateId?: string;
	}>;
};

export default async function OnboardingPage({
	searchParams,
}: OnboardingPageProps) {
	const resolvedSearchParams = searchParams ? await searchParams : undefined;
	const initialStep =
		(resolvedSearchParams?.step as OnboardingStepKey | undefined) ?? "brand";
	const availableLocalizaStrategies = getAvailableLocalizaStrategies();

	return (
		<OnboardingFlow
			initialStep={initialStep}
			initialSourceUrl={resolvedSearchParams?.sourceUrl ?? ""}
			initialLocalizaCandidateId={
				resolvedSearchParams?.localizaCandidateId ?? ""
			}
			availableLocalizaStrategies={availableLocalizaStrategies}
		/>
	);
}
