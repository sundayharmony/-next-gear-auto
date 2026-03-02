import React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { generateBreadcrumbSchema } from "@/lib/utils/schema-generators";
import { SITE_URL } from "@/lib/constants";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const schemaItems = [
    { name: "Home", url: SITE_URL },
    ...items.map((item) => ({
      name: item.label,
      url: item.href ? `${SITE_URL}${item.href}` : undefined,
    })),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateBreadcrumbSchema(schemaItems)),
        }}
      />
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
        <Link
          href="/"
          className="text-purple-300 hover:text-white transition-colors"
          aria-label="Home"
        >
          <Home className="h-3.5 w-3.5" />
        </Link>
        {items.map((item, index) => (
          <React.Fragment key={item.label}>
            <ChevronRight className="h-3.5 w-3.5 text-purple-400/50" />
            {item.href && index < items.length - 1 ? (
              <Link
                href={item.href}
                className="text-purple-300 hover:text-white transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-white font-medium">{item.label}</span>
            )}
          </React.Fragment>
        ))}
      </nav>
    </>
  );
}
