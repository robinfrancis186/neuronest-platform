import { useState } from "react";
import { api } from "../api";
import { loadRazorpay } from "../razorpay";
import { money } from "../utils";
import { Section } from "../ui/primitives";
import { useTranslation } from "../i18n";

type DemoOrder = {
  order_id: string;
  key: string;
  amount_minor: number;
  currency: string;
  status: "pending" | "paid";
};

export default function PaymentDemo({ ready }: { ready: boolean }) {
  const tr = useTranslation();
  const [order, setOrder] = useState<DemoOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function check(current: DemoOrder, poll = false) {
    setBusy(true);
    setError("");
    try {
      for (let attempt = 0; attempt < (poll ? 12 : 1); attempt++) {
        const result = await api<DemoOrder>(`payment-demo/${current.order_id}/`);
        setOrder(result);
        if (result.status === "paid") return;
        if (poll && attempt < 11)
          await new Promise((resolve) => setTimeout(resolve, 2500));
      }
      setMessage("Test payment is pending. Check status before starting another test.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function start() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const Razorpay = await loadRazorpay();
      const current =
        order?.status === "pending"
          ? order
          : await api<DemoOrder>("payment-demo/", "POST", {});
      if (!current.key.startsWith("rzp_test_"))
        throw new Error(
          "Only Razorpay test keys are supported; real charges are disabled.",
        );
      setOrder(current);
      const widget = new Razorpay({
        key: current.key,
        order_id: current.order_id,
        amount: current.amount_minor,
        currency: current.currency,
        name: "NeuroNest — Test payment",
        description: "Project demonstration only. No appointment or clinical service.",
        handler: () => void check(current, true),
        modal: {
          ondismiss: () => {
            setBusy(false);
            setMessage(
              "Checkout closed. Check the test payment status before retrying.",
            );
          },
        },
      });
      widget.on?.("payment.failed", () => {
        setBusy(false);
        setError("Test payment failed. You can check status or retry checkout.");
      });
      widget.open();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <Section title={tr("Razorpay test checkout")}>
      <p>
        {tr(
          "Try a ₹250 test payment for the project demo. No real money is charged, no appointment is booked, and no child records are shared.",
        )}
      </p>
      {!ready && (
        <p role="status">
          {tr(
            "Test checkout is unavailable until Razorpay test credentials are configured.",
          )}
        </p>
      )}
      {order && (
        <p>
          {tr("Test order")}: <code>{order.order_id}</code> ·{" "}
          {money(order.amount_minor)}
        </p>
      )}
      {(order?.status === "paid" || message) && (
        <p role="status">
          {order?.status === "paid"
            ? tr("Test payment confirmed by Razorpay. No appointment was booked.")
            : tr(message)}
        </p>
      )}
      {error && (
        <p className="error-text" role="alert">
          {tr(error)}
        </p>
      )}
      <div className="care-tools">
        <button disabled={busy || !ready} onClick={() => void start()}>
          {tr(
            busy
              ? "Please wait…"
              : order?.status === "pending"
                ? "Reopen test checkout"
                : "Try ₹250 test payment",
          )}
        </button>
        {order && (
          <button
            className="secondary"
            disabled={busy}
            onClick={() => void check(order)}
          >
            {tr("Check test payment status")}
          </button>
        )}
      </div>
    </Section>
  );
}
