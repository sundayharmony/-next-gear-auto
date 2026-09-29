"use client";

import React from "react";
import type { AgreementTermsSection } from "@/lib/agreement/rental-agreement-terms";

export function AgreementInlineSection({
  section,
  children,
}: {
  section: AgreementTermsSection & { bullets?: string[]; emphasis?: string };
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <h3 className="font-bold text-sm text-gray-900 border-b border-gray-300 pb-1 mb-2">
        {section.title}
      </h3>
      {section.paragraphs.map((p) => (
        <p key={p.slice(0, 48)} className="text-gray-700 mb-2 max-w-prose">
          {p}
        </p>
      ))}
      {section.bullets && section.bullets.length > 0 && (
        <ul className="list-disc list-inside text-gray-700 space-y-0.5 ml-2 max-w-prose">
          {section.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      )}
      {section.emphasis && (
        <p className="font-semibold text-gray-900 max-w-prose mt-2">{section.emphasis}</p>
      )}
      {children}
    </div>
  );
}
