import RazorPay from "razorpay";
import config from "config";
import { validatePaymentVerification } from "razorpay/dist/utils/razorpay-utils";

const razorpay = new RazorPay({
  key_id: config.get("RAZORPAY_KEY_ID"),
  key_secret: config.get("RAZORPAY_KEY_SECRET"),
});

interface IPaymentProps {
  amount: number;
  userName: string;
  email: string;
  mobile: string;
}

interface RazorpayPayment {
  razorpay_payment_id: string;
  razorpay_payment_link_id: string;
  razorpay_payment_link_reference_id: string | null;
  razorpay_payment_link_status: string;
  razorpay_signature: string;
}

class RazorPayServices {
  razorPay: RazorPay;

  public async StartPayment({
    amount,
    email,
    userName,
    mobile,
  }: IPaymentProps) {
    return await razorpay.paymentLink.create({
      amount,
      customer: { name: userName, email: email, contact: mobile },
      callback_url: `${process.env.FRONTEND_URL || "https://alterbuddy.com"}/user/payment?`,
    });
  }

  public async VerifySignature({ paymentId }: { paymentId: string }) {
    const payment = await razorpay.payments.fetch(paymentId);

    if (payment.status === "created") {
      return {
        message: "payment processing",
        payment,
      };
    } else if (payment.status === "authorized") {
      return {
        message: "payment authorized",
        payment,
      };
    } else if (payment.status === "captured") {
      return {
        message: "payment successful",
        payment,
      };
    } else if (payment.status === "refunded") {
      return {
        message: "payment refunded",
        payment,
      };
    } else if (payment.status === "failed") {
      return {
        message: "payment Failed",
        payment,
      };
    } else {
      return {
        message: "unknown",
        payment,
      };
    }
  }
}

export const RazorPayService = new RazorPayServices();
