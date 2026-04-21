"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Globe2,
  ListChecks,
  Sparkles,
} from "lucide-react";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Textarea,
} from "@casedra/ui";
import type {
  AIGenerationRecord,
  BrandCreateInput,
  BrandSourceType,
  ListingCreateInput,
  ListingSourceType,
  MediaGenerationKind,
} from "@casedra/types";

const stepOrder = ["brand", "listings", "review"] as const;
export type OnboardingStepKey = (typeof stepOrder)[number];

const propertyOptions: ListingCreateInput["details"]["propertyType"][] = [
  "single_family",
  "multi_family",
  "condo",
  "townhouse",
  "land",
  "commercial",
];

const defaultBrand: BrandCreateInput = {
  companyName: "",
  website: "",
  tagline: "",
  voice: "",
  primaryColorHex: "#0f172a",
  secondaryColorHex: "",
  logoUrl: "",
  sourceType: "firecrawl",
  notes: "",
};

type ListingDraft = {
  title: string;
  sourceType: ListingSourceType;
  sourceUrl: string;
  location: ListingCreateInput["location"];
  details: {
    priceUsd: string;
    bedrooms: string;
    bathrooms: string;
    squareFeet?: string;
    propertyType: ListingCreateInput["details"]["propertyType"];
    description: string;
  };
};

type PlannedGeneration = Pick<AIGenerationRecord, "kind" | "listingId" | "mediaKey"> & {
  label: string;
};

const createListingDraft = (): ListingDraft => ({
  title: "",
  sourceType: "firecrawl",
  sourceUrl: "",
  location: {
    street: "",
    city: "",
    stateOrProvince: "",
    postalCode: "",
    country: "United States",
  },
  details: {
    priceUsd: "",
    bedrooms: "",
    bathrooms: "",
    squareFeet: "",
    propertyType: propertyOptions[0],
    description: "",
  },
});

const generationTemplates: { kind: MediaGenerationKind; label: string }[] = [
  { kind: "social_graphic", label: "Instagram carousel" },
  { kind: "flyer", label: "Open house flyer" },
  { kind: "short_form_video", label: "30s vertical video" },
  { kind: "property_description", label: "Listing description" },
  { kind: "email_copy", label: "Buyer nurture email" },
];

const brandTips: Record<BrandSourceType, string> = {
  firecrawl:
    "We will pull palette, messaging, and voice from your public site using Firecrawl.",
  manual:
    "Give us the essentials so Casedra can mirror your brand across every deliverable.",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function computePlannedGenerations(listings: ListingCreateInput[]): PlannedGeneration[] {
  return listings.flatMap((listing, listingIndex) => {
    const listingSlug = listing.slug && listing.slug.length > 0 ? listing.slug : slugify(listing.title);
    const listingId = listingSlug && listingSlug.length > 0 ? listingSlug : `listing-${listingIndex + 1}`;

    return generationTemplates.map((template) => ({
      kind: template.kind,
      label: template.label,
      listingId,
      mediaKey: `${listingId}-${template.kind}`,
    }));
  });
}

interface OnboardingFlowProps {
  initialStep: OnboardingStepKey;
}

export default function OnboardingFlow({ initialStep }: OnboardingFlowProps) {
  const normalizedStep = stepOrder.includes(initialStep) ? initialStep : "brand";
  const [currentStep, setCurrentStep] = useState<OnboardingStepKey>(normalizedStep);
  const [brand, setBrand] = useState<BrandCreateInput>(defaultBrand);
  const [brandSource, setBrandSource] = useState<BrandSourceType>("firecrawl");
  const [listingDraft, setListingDraft] = useState<ListingDraft>(() => createListingDraft());
  const [listings, setListings] = useState<ListingCreateInput[]>([]);

  useEffect(() => {
    setCurrentStep(normalizedStep);
  }, [normalizedStep]);

  useEffect(() => {
    setBrand((prev) => ({ ...prev, sourceType: brandSource }));
  }, [brandSource]);

  const currentIndex = stepOrder.indexOf(currentStep);
  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === stepOrder.length - 1;

  const plannedGenerations = useMemo(
    () => computePlannedGenerations(listings),
    [listings]
  );

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }),
    []
  );

  const canContinue = useMemo(() => {
    if (currentStep === "brand") {
      if (brandSource === "firecrawl") {
        return Boolean(brand.website && brand.website.trim().length > 0);
      }
      return Boolean(
        brand.companyName &&
          brand.companyName.trim().length > 1 &&
          brand.tagline &&
          brand.tagline.trim().length > 3
      );
    }

    if (currentStep === "listings") {
      return listings.length > 0;
    }

    return true;
  }, [brand.companyName, brand.tagline, brand.website, brandSource, currentStep, listings.length]);

  const goToStep = (step: OnboardingStepKey) => {
    setCurrentStep(step);
  };

  const goNext = () => {
    if (isLastStep) {
      return;
    }
    setCurrentStep(stepOrder[currentIndex + 1]);
  };

  const goPrevious = () => {
    if (isFirstStep) {
      return;
    }
    setCurrentStep(stepOrder[currentIndex - 1]);
  };

  const handleListingDraftChange = <K extends keyof ListingDraft>(key: K, value: ListingDraft[K]) => {
    setListingDraft((prev) => ({ ...prev, [key]: value }));
  };

  const resetListingDraft = () => {
    setListingDraft(createListingDraft());
  };

  const handleAddListing = () => {
    if (!listingDraft.title.trim()) {
      return;
    }

    const price = Number(listingDraft.details.priceUsd);
    const bedrooms = Number(listingDraft.details.bedrooms);
    const bathrooms = Number(listingDraft.details.bathrooms);
    const squareFeet = listingDraft.details.squareFeet
      ? Number(listingDraft.details.squareFeet)
      : undefined;

    const slug = slugify(listingDraft.title);

    const listing: ListingCreateInput = {
      title: listingDraft.title.trim(),
      slug,
      sourceType: listingDraft.sourceType,
      sourceUrl: listingDraft.sourceUrl ? listingDraft.sourceUrl.trim() : undefined,
      location: {
        street: listingDraft.location.street.trim(),
        city: listingDraft.location.city.trim(),
        stateOrProvince: listingDraft.location.stateOrProvince.trim(),
        postalCode: listingDraft.location.postalCode.trim(),
        country: listingDraft.location.country.trim(),
      },
      details: {
        priceUsd: Number.isFinite(price) ? price : 0,
        bedrooms: Number.isFinite(bedrooms) ? bedrooms : 0,
        bathrooms: Number.isFinite(bathrooms) ? bathrooms : 0,
        squareFeet: Number.isFinite(squareFeet ?? NaN) ? squareFeet : undefined,
        lotSizeSqFt: undefined,
        yearBuilt: undefined,
        propertyType: listingDraft.details.propertyType,
        description: listingDraft.details.description.trim(),
      },
      media: [],
    };

    setListings((prev) => [listing, ...prev]);
    resetListingDraft();
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12 sm:px-12">
        <header className="flex flex-col gap-3">
          <span className="inline-flex items-center gap-2 self-start rounded-full border border-border px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Onboarding
          </span>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Set up your brand, listings, and media studio plan
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
            We will tailor Casedra to your brokerage. Share your brand, add live listings, and preview the AI media plan we will generate for every property.
          </p>
        </header>

        <nav className="flex flex-wrap items-center gap-3">
          {stepOrder.map((step, index) => {
            const definition = stepDefinitions[step];
            const Icon = definition.icon;
            const isActive = currentStep === step;
            const isComplete = index < currentIndex;

            return (
              <button
                key={step}
                type="button"
                onClick={() => goToStep(step)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${
                  isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : isComplete
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{definition.label}</span>
                {isComplete ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                ) : null}
              </button>
            );
          })}
        </nav>

        <Card className="border-border/60 bg-background">
          <CardHeader className="space-y-2">
            <CardTitle>{stepDefinitions[currentStep].title}</CardTitle>
            <CardDescription>{stepDefinitions[currentStep].description}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 pt-0">
            {currentStep === "brand" ? (
              <>
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    Brand intake mode
                  </span>
                  <div className="inline-flex w-full flex-col gap-2 rounded-lg border border-border p-2 sm:flex-row">
                    {brandSourceOptions.map((source) => (
                      <Button
                        key={source.value}
                        type="button"
                        variant={brandSource === source.value ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => setBrandSource(source.value)}
                      >
                        <source.icon className="mr-2 h-4 w-4" aria-hidden="true" />
                        {source.label}
                      </Button>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">{brandTips[brandSource]}</p>
                </div>

                {brandSource === "firecrawl" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium text-foreground" htmlFor="brand-website">
                        Company website
                      </label>
                      <Input
                        id="brand-website"
                        placeholder="https://www.yourbrokerage.com"
                        value={brand.website ?? ""}
                        onChange={(event) =>
                          setBrand((prev) => ({ ...prev, website: event.target.value }))
                        }
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground" htmlFor="brand-company-name">
                        Company name (optional override)
                      </label>
                      <Input
                        id="brand-company-name"
                        placeholder="Casedra Realty"
                        value={brand.companyName}
                        onChange={(event) =>
                          setBrand((prev) => ({ ...prev, companyName: event.target.value }))
                        }
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground" htmlFor="brand-primary-color">
                        Primary brand color
                      </label>
                      <Input
                        id="brand-primary-color"
                        type="color"
                        value={brand.primaryColorHex ?? "#0f172a"}
                        onChange={(event) =>
                          setBrand((prev) => ({ ...prev, primaryColorHex: event.target.value }))
                        }
                        className="mt-2 h-10 w-32 p-1"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium text-foreground" htmlFor="brand-notes">
                        Notes for our team
                      </label>
                      <Textarea
                        id="brand-notes"
                        placeholder="Share tone preferences, assets we should reference, or MLS constraints."
                        value={brand.notes ?? ""}
                        onChange={(event) =>
                          setBrand((prev) => ({ ...prev, notes: event.target.value }))
                        }
                        className="mt-2"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-foreground" htmlFor="manual-company-name">
                        Company name
                      </label>
                      <Input
                        id="manual-company-name"
                        placeholder="Casedra Realty"
                        value={brand.companyName}
                        onChange={(event) =>
                          setBrand((prev) => ({ ...prev, companyName: event.target.value }))
                        }
                        className="mt-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground" htmlFor="manual-tagline">
                        Tagline
                      </label>
                      <Input
                        id="manual-tagline"
                        placeholder="Boutique marketing for every listing"
                        value={brand.tagline ?? ""}
                        onChange={(event) =>
                          setBrand((prev) => ({ ...prev, tagline: event.target.value }))
                        }
                        className="mt-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground" htmlFor="manual-website">
                        Website (optional)
                      </label>
                      <Input
                        id="manual-website"
                        placeholder="https://www.yourbrokerage.com"
                        value={brand.website ?? ""}
                        onChange={(event) =>
                          setBrand((prev) => ({ ...prev, website: event.target.value }))
                        }
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground" htmlFor="manual-color">
                        Primary brand color
                      </label>
                      <Input
                        id="manual-color"
                        type="color"
                        value={brand.primaryColorHex ?? "#0f172a"}
                        onChange={(event) =>
                          setBrand((prev) => ({ ...prev, primaryColorHex: event.target.value }))
                        }
                        className="mt-2 h-10 w-32 p-1"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium text-foreground" htmlFor="manual-voice">
                        Brand voice
                      </label>
                      <Textarea
                        id="manual-voice"
                        placeholder="Confident, knowledgeable, and concierge-level support for luxury buyers."
                        value={brand.voice ?? ""}
                        onChange={(event) =>
                          setBrand((prev) => ({ ...prev, voice: event.target.value }))
                        }
                        className="mt-2"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium text-foreground" htmlFor="manual-notes">
                        Notes for our team
                      </label>
                      <Textarea
                        id="manual-notes"
                        placeholder="MLS rules, brand guardrails, required disclosures, etc."
                        value={brand.notes ?? ""}
                        onChange={(event) =>
                          setBrand((prev) => ({ ...prev, notes: event.target.value }))
                        }
                        className="mt-2"
                      />
                    </div>
                  </div>
                )}
              </>
            ) : null}

            {currentStep === "listings" ? (
              <div className="grid gap-6">
                <div className="rounded-lg border border-border/70 bg-muted/30 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold">Add listings to populate the studio</h3>
                      <p className="text-sm text-muted-foreground">
                        Each listing unlocks a tailored media plan. Import via Firecrawl or enter details manually.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={
                          listingDraft.sourceType === "firecrawl" ? "default" : "outline"
                        }
                        onClick={() => handleListingDraftChange("sourceType", "firecrawl")}
                      >
                        <Globe2 className="mr-2 h-4 w-4" aria-hidden="true" />
                        Use Firecrawl
                      </Button>
                      <Button
                        type="button"
                        variant={
                          listingDraft.sourceType === "manual" ? "default" : "outline"
                        }
                        onClick={() => handleListingDraftChange("sourceType", "manual")}
                      >
                        <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                        Enter manually
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 rounded-lg border border-border/60 bg-background p-4">
                  <div>
                    <label className="text-sm font-medium text-foreground" htmlFor="listing-title">
                      Listing name
                    </label>
                    <Input
                      id="listing-title"
                      placeholder="Prospect Heights Brownstone"
                      value={listingDraft.title}
                      onChange={(event) =>
                        handleListingDraftChange("title", event.target.value)
                      }
                      className="mt-2"
                    />
                  </div>

                  {listingDraft.sourceType === "firecrawl" ? (
                    <div>
                      <label className="text-sm font-medium text-foreground" htmlFor="listing-source-url">
                        MLS or public listing URL
                      </label>
                      <Input
                        id="listing-source-url"
                        placeholder="https://streeteasy.com/building/..."
                        value={listingDraft.sourceUrl}
                        onChange={(event) =>
                          handleListingDraftChange("sourceUrl", event.target.value)
                        }
                        className="mt-2"
                      />
                    </div>
                  ) : null}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-foreground" htmlFor="listing-street">
                        Street address
                      </label>
                      <Input
                        id="listing-street"
                        placeholder="1458 Dean Street"
                        value={listingDraft.location.street}
                        onChange={(event) =>
                          setListingDraft((prev) => ({
                            ...prev,
                            location: { ...prev.location, street: event.target.value },
                          }))
                        }
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground" htmlFor="listing-city">
                        City
                      </label>
                      <Input
                        id="listing-city"
                        placeholder="Brooklyn"
                        value={listingDraft.location.city}
                        onChange={(event) =>
                          setListingDraft((prev) => ({
                            ...prev,
                            location: { ...prev.location, city: event.target.value },
                          }))
                        }
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground" htmlFor="listing-state">
                        State / Province
                      </label>
                      <Input
                        id="listing-state"
                        placeholder="NY"
                        value={listingDraft.location.stateOrProvince}
                        onChange={(event) =>
                          setListingDraft((prev) => ({
                            ...prev,
                            location: {
                              ...prev.location,
                              stateOrProvince: event.target.value,
                            },
                          }))
                        }
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground" htmlFor="listing-postal">
                        Postal code
                      </label>
                      <Input
                        id="listing-postal"
                        placeholder="11216"
                        value={listingDraft.location.postalCode}
                        onChange={(event) =>
                          setListingDraft((prev) => ({
                            ...prev,
                            location: {
                              ...prev.location,
                              postalCode: event.target.value,
                            },
                          }))
                        }
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground" htmlFor="listing-price">
                      Price (USD)
                    </label>
                    <Input
                      id="listing-price"
                      type="number"
                      min="0"
                      placeholder="2350000"
                      value={listingDraft.details.priceUsd}
                      onChange={(event) =>
                        setListingDraft((prev) => ({
                          ...prev,
                          details: { ...prev.details, priceUsd: event.target.value },
                        }))
                      }
                      className="mt-2"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="text-sm font-medium text-foreground" htmlFor="listing-beds">
                        Beds
                      </label>
                      <Input
                        id="listing-beds"
                        type="number"
                        min="0"
                        placeholder="4"
                        value={listingDraft.details.bedrooms}
                        onChange={(event) =>
                          setListingDraft((prev) => ({
                            ...prev,
                            details: { ...prev.details, bedrooms: event.target.value },
                          }))
                        }
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground" htmlFor="listing-baths">
                        Baths
                      </label>
                      <Input
                        id="listing-baths"
                        type="number"
                        min="0"
                        placeholder="3"
                        value={listingDraft.details.bathrooms}
                        onChange={(event) =>
                          setListingDraft((prev) => ({
                            ...prev,
                            details: { ...prev.details, bathrooms: event.target.value },
                          }))
                        }
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground" htmlFor="listing-sqft">
                        Interior square feet (optional)
                      </label>
                      <Input
                        id="listing-sqft"
                        type="number"
                        min="0"
                        placeholder="3200"
                        value={listingDraft.details.squareFeet ?? ""}
                        onChange={(event) =>
                          setListingDraft((prev) => ({
                            ...prev,
                            details: { ...prev.details, squareFeet: event.target.value },
                          }))
                        }
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground" htmlFor="listing-property-type">
                      Property type
                    </label>
                    <select
                      id="listing-property-type"
                      value={listingDraft.details.propertyType}
                      onChange={(event) =>
                        setListingDraft((prev) => ({
                          ...prev,
                          details: {
                            ...prev.details,
                            propertyType: event.target
                              .value as ListingCreateInput["details"]["propertyType"],
                          },
                        }))
                      }
                      className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {propertyOptions.map((option) => (
                        <option key={option} value={option}>
                          {propertyTypeCopy[option]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground" htmlFor="listing-description">
                      Marketing highlights
                    </label>
                    <Textarea
                      id="listing-description"
                      placeholder="Pre-war brownstone with sun-splashed parlor, chef's kitchen, and landscaped garden."
                      value={listingDraft.details.description}
                      onChange={(event) =>
                        setListingDraft((prev) => ({
                          ...prev,
                          details: { ...prev.details, description: event.target.value },
                        }))
                      }
                      className="mt-2"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="button" onClick={handleAddListing}>
                      Add listing
                    </Button>
                  </div>
                </div>

                {listings.length > 0 ? (
                  <div className="grid gap-4">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Listings queued for the studio
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {listings.map((listing) => (
                        <Card key={listing.slug} className="border-border/60">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold">
                              {listing.title}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 text-xs uppercase tracking-[0.2em]">
                              <span>{listing.sourceType === "firecrawl" ? "Firecrawl" : "Manual"}</span>
                              <span className="h-1 w-1 rounded-full bg-muted-foreground" aria-hidden="true" />
                              <span>{propertyTypeCopy[listing.details.propertyType]}</span>
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
                            <p>
                              {listing.location.city}, {listing.location.stateOrProvince}
                            </p>
                            <p className="font-medium text-foreground">
                              {currencyFormatter.format(listing.details.priceUsd)}
                            </p>
                            <p>
                              {listing.details.bedrooms} bd · {listing.details.bathrooms} ba
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {currentStep === "review" ? (
              <div className="grid gap-6">
                <div className="grid gap-4 rounded-lg border border-primary/40 bg-primary/5 p-6 sm:grid-cols-[1.5fr_1fr]">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Brand snapshot</h3>
                    <p className="text-sm text-muted-foreground">
                      We will sync these settings to every media prompt and campaign workflow.
                    </p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>
                        <span className="font-medium text-foreground">Company:</span> {brand.companyName || "Pending Firecrawl"}
                      </li>
                      <li>
                        <span className="font-medium text-foreground">Website:</span> {brand.website || "—"}
                      </li>
                      <li>
                        <span className="font-medium text-foreground">Tagline:</span> {brand.tagline || "—"}
                      </li>
                      <li>
                        <span className="font-medium text-foreground">Voice:</span> {brand.voice || (brandSource === "firecrawl" ? "Will derive from site" : "—")}
                      </li>
                    </ul>
                  </div>
                  <div className="flex flex-col gap-3 rounded-md border border-primary/40 bg-background p-4 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Brand color
                    </span>
                    <div
                      className="h-16 w-full rounded-md border"
                      style={{ backgroundColor: brand.primaryColorHex || "#0f172a" }}
                    />
                    <p className="text-xs text-muted-foreground">
                      We will apply this across graphics, type treatments, and UI accents.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 rounded-lg border border-border/60 bg-background p-6">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-semibold">Listings in scope</h3>
                    <p className="text-sm text-muted-foreground">
                      {listings.length > 0
                        ? `${listings.length} listing${listings.length > 1 ? "s" : ""} ready for generation`
                        : "Add listings to generate tailored media."}
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {listings.map((listing) => (
                      <div key={listing.slug} className="rounded-md border border-border/50 bg-muted/40 p-4 text-sm">
                        <p className="font-semibold text-foreground">{listing.title}</p>
                        <p className="text-muted-foreground">
                          {currencyFormatter.format(listing.details.priceUsd)}
                          {" · "}
                          {listing.details.bedrooms} bd · {listing.details.bathrooms} ba
                        </p>
                        <p className="text-muted-foreground">
                          {listing.location.city}, {listing.location.stateOrProvince}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 rounded-lg border border-primary/40 bg-primary/5 p-6">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-semibold">AI media roadmap</h3>
                    <p className="text-sm text-muted-foreground">
                      Casedra will generate, track, and store assets using the schema we designed for the studio.
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {plannedGenerations.map((generation) => (
                      <div
                        key={`${generation.listingId}-${generation.kind}`}
                        className="flex flex-col gap-2 rounded-md border border-dashed border-primary/40 bg-background p-4 text-sm"
                      >
                        <span className="font-semibold text-foreground">{generation.label}</span>
                        <p className="text-muted-foreground">
                          Media key: <span className="font-mono text-xs">{generation.mediaKey}</span>
                        </p>
                        <p className="text-muted-foreground">Linked listing: {generation.listingId}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Stored as `AIGenerationRecord` entries with status transitions (queued → running → succeeded) and Fal.ai job metadata.
                  </p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex flex-col justify-between gap-3 border-t border-border pt-6 sm:flex-row sm:items-center">
          <div className="flex gap-2">
            {!isFirstStep ? (
              <Button type="button" variant="ghost" onClick={goPrevious}>
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back
              </Button>
            ) : null}
            {currentStep !== "brand" ? (
              <Button type="button" variant="ghost" onClick={() => goToStep("brand")}>
                Jump to brand
              </Button>
            ) : null}
            {currentStep === "review" ? (
              <Button type="button" variant="ghost" onClick={() => goToStep("listings")}>
                Jump to listings
              </Button>
            ) : null}
          </div>
          <div className="flex gap-3">
            {!isLastStep ? (
              <Button type="button" size="lg" onClick={goNext} disabled={!canContinue}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button asChild size="lg" className="inline-flex items-center gap-2">
                <Link href="/app/studio">
                  Enter the media studio
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const propertyTypeCopy: Record<ListingCreateInput["details"]["propertyType"], string> = {
  single_family: "Single family",
  multi_family: "Multi family",
  condo: "Condo",
  townhouse: "Townhouse",
  land: "Land",
  commercial: "Commercial",
};

const brandSourceOptions: Array<{
  value: BrandSourceType;
  label: string;
  icon: typeof Building2;
}> = [
  {
    value: "firecrawl",
    label: "Crawl my website",
    icon: Globe2,
  },
  {
    value: "manual",
    label: "Enter brand details",
    icon: Building2,
  },
];

const stepDefinitions: Record<OnboardingStepKey, {
  label: string;
  title: string;
  description: string;
  icon: typeof Building2;
}> = {
  brand: {
    label: "Brand",
    title: "Capture your brand identity",
    description:
      "Give Casedra your brand voice, palette, and tone so we can populate prompts, templates, and approvals.",
    icon: Building2,
  },
  listings: {
    label: "Listings",
    title: "Queue listings for automation",
    description:
      "Every listing you add will get a tailored AI media roadmap and collateral package.",
    icon: ListChecks,
  },
  review: {
    label: "Review",
    title: "Review and launch",
    description:
      "Confirm the intake and jump into the studio to start generating assets.",
    icon: Sparkles,
  },
};
