import Stripe from "stripe";

import { env } from "@/env";

let stripeClient: Stripe | null = null;

export const getStripe = () => {
  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18",
    });
  }

  return stripeClient;
};

export const createBillingPortalSession = async (customerId: string, returnUrl: string) => {
  const stripe = getStripe();
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
};

export const createCheckoutSession = async (params: Stripe.Checkout.SessionCreateParams) => {
  const stripe = getStripe();
  return stripe.checkout.sessions.create(params);
};
