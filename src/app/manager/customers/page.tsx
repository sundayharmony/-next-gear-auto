"use client";

import React from "react";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent } from "@/components/ui/card";

export default function ManagerCustomersPage() {
  return (
    <PageContainer className="py-6 sm:py-8">
      <Card>
        <CardContent className="p-6">
          <h1 className="text-xl font-semibold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-2">
            Manager customers view is being aligned with admin UI parity.
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
