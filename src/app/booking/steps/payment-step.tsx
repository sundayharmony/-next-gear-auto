"use client";

import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Vehicle } from "@/lib/types";

export interface PaymentStepProps {
  selectedVehicle: Vehicle | null;
  checkoutTotal: number;
  hasPricing: boolean;
  error: string | null;
  isSubmitting: boolean;
  onSubmit: () => void;
}

export function PaymentStep({
  selectedVehicle,
  checkoutTotal,
  hasPricing,
  error,
  isSubmitting,
  onSubmit,
}: PaymentStepProps) {
  return (
    <Card>
      <CardContent className="p-6 text-center">
        <CreditCard className="mx-auto h-12 w-12 text-purple-600 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Secure Payment</h2>
        <p className="text-sm text-gray-500 mb-2">
          You&apos;ll be redirected to Stripe&apos;s secure checkout to complete your payment.
        </p>
        <p className="text-xs text-gray-400 mb-6">
          Your card details are handled entirely by Stripe — they never touch our servers.
        </p>

        {error && (
          <div className="mx-auto max-w-sm rounded-lg bg-red-50 border border-red-200 p-3 mb-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mx-auto max-w-sm space-y-3">
          {hasPricing && (
            <div className="rounded-lg bg-gray-50 p-4 text-left text-sm space-y-2">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Rental Total</span>
                <span className="font-semibold">${checkoutTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="font-medium text-gray-700">Amount Due Now</span>
                <span className="font-bold text-purple-600">${checkoutTotal.toFixed(2)}</span>
              </div>
            </div>
          )}

          {!selectedVehicle && (
            <p className="text-sm text-amber-700 mb-2">Select a vehicle before proceeding to payment.</p>
          )}
          <Button
            className="w-full"
            size="lg"
            onClick={() => {
              if (!isSubmitting) onSubmit();
            }}
            disabled={isSubmitting || !selectedVehicle}
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin mr-2 inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Confirming your reservation…
              </>
            ) : (
              "Proceed to Secure Payment"
            )}
          </Button>

          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
            </svg>
            <span>Secured by Stripe</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
