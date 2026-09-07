import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getAuthenticatedUser() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function hasActiveSpiralSubscription(email: string) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not configured");

  const headers = { Authorization: `Bearer ${stripeKey}` };
  const customersUrl = `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=20`;
  const customersResponse = await fetch(customersUrl, { headers, cache: "no-store" });
  if (!customersResponse.ok) throw new Error("Stripe customer lookup failed");
  const customers = await customersResponse.json();

  for (const customer of customers.data ?? []) {
    const subscriptionsUrl = `https://api.stripe.com/v1/subscriptions?customer=${encodeURIComponent(customer.id)}&status=all&limit=20`;
    const subscriptionsResponse = await fetch(subscriptionsUrl, { headers, cache: "no-store" });
    if (!subscriptionsResponse.ok) throw new Error("Stripe subscription lookup failed");
    const subscriptions = await subscriptionsResponse.json();
    const active = (subscriptions.data ?? []).some((subscription: { status?: string }) =>
      subscription.status === "active" || subscription.status === "trialing"
    );
    if (active) return true;
  }

  return false;
}
