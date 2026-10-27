export async function loadRazorpay() {
  if (!(window as any).Razorpay)
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve();
      script.onerror = () => {
        script.remove();
        reject(new Error("Could not load secure checkout. Please retry."));
      };
      document.head.appendChild(script);
    });
  if (!(window as any).Razorpay)
    throw new Error("Secure checkout did not initialize. Please retry.");
  return (window as any).Razorpay;
}
