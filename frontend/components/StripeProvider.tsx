"use client";

import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { ReactNode } from "react";

// Get publishable key from environment
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";

// Initialize Stripe
const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : null;

interface StripeProviderProps {
  children: ReactNode;
  clientSecret?: string;
}

export function StripeProvider({ children, clientSecret }: StripeProviderProps) {
  if (!stripePublishableKey || !stripePromise) {
    console.error("Stripe publishable key not found. Please set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in environment variables.");
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600 text-sm">
          Stripe is not configured. Please set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in your environment variables.
        </p>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-600 text-sm">
          Payment session is being set up. Please wait...
        </p>
      </div>
    );
  }

  const options = {
    clientSecret,
    locale: "en" as const, // Set language to English
    appearance: {
      theme: "stripe" as const,
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  );
}
