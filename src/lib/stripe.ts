// lib/stripe.ts
import Stripe from "stripe";
const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  throw new Error("STRIPE_SECRET_KEY is missing in .env");
}

export const stripe = new Stripe(secretKey, {
  // @ts-ignore
  apiVersion: "2023-10-16",
  typescript: true,
});
