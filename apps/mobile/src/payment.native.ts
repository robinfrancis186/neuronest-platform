import RazorpayCheckout from "react-native-razorpay";
import type { Payment } from "./types";
export async function checkout(payment: Payment) {
  const key = payment.checkout?.key || payment.checkout?.key_id;
  const order = payment.checkout?.order_id || payment.provider_order_id;
  if (!key || !order) throw new Error("Payment provider is not configured.");
  await RazorpayCheckout.open({
    key,
    order_id: order,
    currency: payment.checkout?.currency || "INR",
    amount: payment.amount_minor,
    name: "NeuroNest",
    description: "Care appointment",
    theme: { color: "#166F61" },
  });
  // Provider callbacks are UX only. The core accepts signed server events to confirm payment.
}
