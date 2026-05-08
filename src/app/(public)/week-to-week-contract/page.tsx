import React from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";
import { WeekToWeekContractViewer } from "@/components/week-to-week-contract-viewer";

export const metadata = {
  title: "Week-to-Week Long-Term Rental Contract",
  description:
    "Special recurring week-to-week rental contract for long-term renters who rebook every week.",
};

interface WeekToWeekContractPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

const getNumericParam = (
  params: Record<string, string | string[] | undefined>,
  key: string,
  fallback = 0
) => {
  const rawValue = params[key];
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
};

const getStringParam = (
  params: Record<string, string | string[] | undefined>,
  key: string,
  fallback = ""
) => {
  const rawValue = params[key];
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  if (!value) return fallback;
  return value.trim();
};

export default async function WeekToWeekContractPage({ searchParams }: WeekToWeekContractPageProps) {
  const params = (await searchParams) || {};
  const weeklyPrice = getNumericParam(params, "weeklyPrice", 0);
  const customerName = getStringParam(params, "customerName");
  const customerEmail = getStringParam(params, "customerEmail");
  const customerPhone = getStringParam(params, "customerPhone");

  return (
    <>
      <section className="bg-gradient-to-br from-purple-900 to-gray-900 py-14 text-white">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20">
            <FileText className="h-6 w-6 text-purple-200" />
          </div>
          <h1 className="text-3xl font-bold sm:text-4xl">Week-to-Week Long-Term Contract</h1>
          <p className="mx-auto mt-3 max-w-3xl text-purple-100">
            This agreement uses the same core terms as our standard rental contract, with pricing and terms
            focused on recurring weekly rebookings for long-term renters.
          </p>
        </div>
      </section>

      <PageContainer className="py-8">
        <div className="mx-auto max-w-4xl space-y-4">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <p className="mb-4 text-sm text-gray-600">
                Review this contract with your renter and complete signatures manually or through your
                normal agreement workflow.
              </p>
              <p className="mb-3 text-xs text-gray-500">
                Prefill by URL:
                {" "}
                <code>?weeklyPrice=525&customerName=John%20Doe&customerEmail=john@email.com&customerPhone=5514293472</code>
              </p>
              <WeekToWeekContractViewer
                weeklyPrice={weeklyPrice}
                customerName={customerName}
                customerEmail={customerEmail}
                customerPhone={customerPhone}
              />
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/booking">
              <Button>Start Booking</Button>
            </Link>
            <Link href="/faq">
              <Button variant="outline">View Policies</Button>
            </Link>
          </div>
        </div>
      </PageContainer>
    </>
  );
}
