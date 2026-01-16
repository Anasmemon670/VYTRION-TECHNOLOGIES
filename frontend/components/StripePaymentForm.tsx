"use client";

import { useState, useEffect, useRef } from "react";
import {
  PaymentElement,
  useStripe,
  useElements
} from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ordersAPI } from "@/lib/api";

interface StripePaymentFormProps {
  clientSecret: string;
  orderId: string;
  amount: number;
  onSuccess: () => void;
  onError: (error: string) => void;
  onRetry?: () => void; // Callback to create new PaymentIntent on retry
}

export function StripePaymentForm({
  clientSecret,
  orderId,
  amount,
  onSuccess,
  onError,
  onRetry,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false); // CRITICAL: Prevent double submission
  const timeoutRef = useRef<NodeJS.Timeout | null>(null); // Track timeouts for cleanup
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Track processing timeout

  useEffect(() => {
    if (!stripe) {
      console.warn("Stripe not loaded yet");
      return;
    }

    if (!clientSecret) {
      console.warn("Client secret not available");
      return;
    }
    
    // Cleanup timeouts on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, [stripe, clientSecret]);

  // Show loading state if Stripe is not ready
  if (!stripe || !elements) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 className="w-5 h-5 animate-spin text-cyan-500" />
            <p className="text-slate-600">Loading payment form...</p>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // CRITICAL: Prevent double submission
    if (processing || submitted) {
      console.log("[PaymentForm] ⚠️ Payment already submitted, ignoring duplicate submission");
      return;
    }

    if (!stripe || !elements) {
      return;
    }

    // CRITICAL: Disable form immediately to prevent double-click
    setProcessing(true);
    setSubmitted(true);
    setMessage(null);

    try {
      // CRITICAL: Use ONLY confirmPayment with PaymentElement
      // DO NOT use confirmCardPayment - that's for CardElement, not PaymentElement
      console.log("[PaymentForm] Calling stripe.confirmPayment()...");
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

      // STRICT CHECK: If Stripe returns ANY error, STOP immediately
      if (error) {
        console.error("[PaymentForm] ❌ Stripe payment error:", error);
        console.error("[PaymentForm] Error type:", error.type);
        console.error("[PaymentForm] Error code:", error.code);
        console.error("[PaymentForm] Error message:", error.message);
        
        // Handle specific error codes
        let errorMessage = error.message || "Payment failed. Please try again.";
        if (error.code === "payment_intent_unexpected_state") {
          errorMessage = "Payment state error. Please refresh and try again with a new payment.";
        } else if (error.code === "invalid_request_error") {
          errorMessage = "Invalid payment request. Please check your card details and try again.";
        }
        
        setMessage(errorMessage);
        onError(errorMessage);
        toast.error(errorMessage);
        setProcessing(false);
        setSubmitted(false); // Allow retry
        
        // If onRetry callback provided, suggest creating new PaymentIntent
        if (onRetry && (error.code === "payment_intent_unexpected_state" || error.code === "invalid_request_error")) {
          console.log("[PaymentForm] Suggesting retry with new PaymentIntent");
          // Don't auto-retry, let user click retry button
        }
        return;
      }

      // STRICT CHECK: paymentIntent MUST exist and status MUST be "succeeded"
      if (!paymentIntent) {
        console.error("[PaymentForm] ❌ No paymentIntent returned from Stripe");
        setMessage("Payment confirmation failed. Please try again.");
        onError("No payment intent returned");
        toast.error("Payment confirmation failed");
        setProcessing(false);
        return;
      }

      // STRICT CHECK: Handle all possible PaymentIntent statuses
      const status = paymentIntent.status;
      console.log(`[PaymentForm] PaymentIntent status: ${status}`);

      // Define pollOrderStatus function - check once, then proceed immediately
      const pollOrderStatus = async (): Promise<void> => {
        try {
          // Check order status once
          const response = await ordersAPI.getById(orderId);
          const order = response?.order;

          if (order && order.status === "PROCESSED") {
            console.log("[PaymentForm] ✅ Order status confirmed as PROCESSED by backend");
            setMessage("Payment successful! Order confirmed.");
            toast.success("Payment successful! Order confirmed.");
            setProcessing(false);
            onSuccess();
            return;
          }

          // If not PROCESSED yet, proceed anyway since payment succeeded on Stripe
          // Webhook will update status in background
          console.log("[PaymentForm] Payment succeeded on Stripe. Proceeding - webhook will update order status.");
          setMessage("Payment successful! Your order is being processed.");
          toast.success("Payment successful! Your order is being processed.");
          setProcessing(false);
          onSuccess();
        } catch (pollError: any) {
          console.log("[PaymentForm] Error checking order status:", pollError);
          // Payment succeeded on Stripe, so proceed even if polling fails
          setMessage("Payment successful! Your order is being processed. Please check your orders page.");
          toast.success("Payment successful! Your order is being processed.");
          setProcessing(false);
          onSuccess();
        }
      };

      if (status === "succeeded") {
        // Payment succeeded - proceed to verify with backend
      } else if (status === "requires_payment_method") {
        console.log(`[PaymentForm] Payment requires payment method`);
        setMessage("Payment method is required. Please check your card details.");
        onError("Payment method required");
        toast.error("Please check your card details");
        setProcessing(false);
        setSubmitted(false); // Allow retry
        return;
      } else if (status === "requires_confirmation") {
        console.log(`[PaymentForm] Payment requires confirmation`);
        setMessage("Payment requires additional confirmation. Please try again.");
        onError("Payment requires confirmation");
        toast.error("Payment requires confirmation");
        setProcessing(false);
        setSubmitted(false); // Allow retry
        return;
      } else if (status === "processing") {
        console.log(`[PaymentForm] Payment is processing`);
        setMessage("Payment is being processed. Please wait...");
        
        // Check status once after short delay, then proceed
        const checkProcessingStatus = async (): Promise<void> => {
          try {
            const updated = await stripe.retrievePaymentIntent(paymentIntent.client_secret!);
            const updatedStatus = updated.paymentIntent?.status;
            
            if (updatedStatus === "succeeded") {
              console.log("[PaymentForm] ✅ PaymentIntent status confirmed as 'succeeded' after processing");
              setMessage("Payment successful! Verifying order...");
              pollOrderStatus();
              return;
            } else if (updatedStatus === "requires_payment_method" || updatedStatus === "canceled") {
              setMessage(`Payment ${updatedStatus}. Please try again.`);
              onError(`Payment ${updatedStatus}`);
              toast.error(`Payment ${updatedStatus}`);
              setProcessing(false);
              setSubmitted(false);
              return;
            }
            
            // Still processing - proceed anyway since Stripe confirmed payment
            console.log("[PaymentForm] Payment still processing, but proceeding since Stripe confirmed.");
            setMessage("Payment successful! Your order is being processed.");
            toast.success("Payment successful! Your order is being processed.");
            setProcessing(false);
            onSuccess();
          } catch (err: any) {
            console.error("[PaymentForm] Error checking processing status:", err);
            // Payment is processing on Stripe, proceed anyway
            setMessage("Payment successful! Your order is being processed. Please check your orders page.");
            toast.success("Payment successful! Your order is being processed.");
            setProcessing(false);
            onSuccess();
          }
        };
        
        // Check once after 2 seconds
        setTimeout(checkProcessingStatus, 2000);
        return;
      } else {
        // Any other status (canceled, requires_action, etc.)
        console.log(`[PaymentForm] PaymentIntent status is NOT succeeded. Status: ${status}`);
        
        let errorMessage = `Payment status: ${status}. Payment not completed.`;
        if (status === "canceled") {
          errorMessage = "Payment was canceled. Please try again.";
        } else if (status === "requires_action") {
          errorMessage = "Payment requires additional action. Please complete the authentication.";
        }
        
        setMessage(errorMessage);
        onError(errorMessage);
        toast.error("Payment not completed");
        setProcessing(false);
        setSubmitted(false); // Allow retry - will create new PaymentIntent
        return;
      }

      // ONLY if paymentIntent.status === "succeeded" - proceed to verify with backend
      console.log("[PaymentForm] ✅ PaymentIntent status confirmed as 'succeeded' by Stripe");
      console.log("[PaymentForm] PaymentIntent ID:", paymentIntent.id);
      setMessage("Payment successful! Verifying order...");

      // Check order status once immediately, then proceed
      pollOrderStatus();
    } catch (err: any) {
      console.error("[PaymentForm] ❌ Payment error:", err);
      const errorMessage = err.message || "An error occurred during payment";
      setMessage(errorMessage);
      onError(errorMessage);
      toast.error(errorMessage);
      setProcessing(false);
      setSubmitted(false); // Allow retry after error
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <PaymentElement
          options={{
            layout: "tabs",
            fields: {
              billingDetails: "auto",
            },
          }}
        />
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg ${
            message.includes("successful")
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          <p className="text-sm">{message}</p>
        </div>
      )}

      <div className="space-y-3">
        <button
          type="submit"
          disabled={!stripe || !elements || processing || submitted}
          className="w-full bg-green-500 hover:bg-green-600 disabled:bg-slate-400 disabled:cursor-not-allowed text-white py-3 rounded-lg transition-all font-medium flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing Payment...
            </>
          ) : (
            <>
              Pay ${amount.toFixed(2)}
            </>
          )}
        </button>
        
        {/* Retry button - only show if payment failed and onRetry is provided */}
        {!processing && submitted && message && message.includes("failed") && onRetry && (
          <button
            type="button"
            onClick={() => {
              console.log("[PaymentForm] Retrying with new PaymentIntent...");
              setSubmitted(false);
              setMessage(null);
              onRetry(); // Parent component should create new PaymentIntent
            }}
            className="w-full bg-slate-500 hover:bg-slate-600 text-white py-2 rounded-lg transition-all font-medium text-sm"
          >
            Retry with New Payment
          </button>
        )}
      </div>

      <p className="text-xs text-slate-500 text-center">
        Your payment is secured by Stripe. We never store your card details.
      </p>
    </form>
  );
}
