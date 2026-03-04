import { SITE_NAME, SITE_URL, CONTACT_INFO } from "@/lib/constants";

// Organization schema - used in root layout
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/images/logo.png`,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: CONTACT_INFO.phone,
      contactType: "customer service",
      areaServed: "US",
      availableLanguage: "English",
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: CONTACT_INFO.address,
      addressLocality: CONTACT_INFO.city,
      addressRegion: CONTACT_INFO.state,
      postalCode: CONTACT_INFO.zip,
      addressCountry: "US",
    },
    sameAs: [],
  };
}

// LocalBusiness schema - used on homepage
export function generateLocalBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "AutoRental",
    name: SITE_NAME,
    description:
      "Premium car rentals in Jersey City, NJ at competitive prices. Compact cars, sedans, SUVs, and trucks available.",
    url: SITE_URL,
    telephone: CONTACT_INFO.phone,
    email: CONTACT_INFO.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: CONTACT_INFO.address,
      addressLocality: CONTACT_INFO.city,
      addressRegion: CONTACT_INFO.state,
      postalCode: CONTACT_INFO.zip,
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 40.7178,
      longitude: -74.0431,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "08:00",
        closes: "18:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: "09:00",
        closes: "17:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Sunday",
        opens: "10:00",
        closes: "16:00",
      },
    ],
    priceRange: "$35 - $75 per day",
    currenciesAccepted: "USD",
    paymentAccepted: "Credit Card, Debit Card",
    areaServed: {
      "@type": "City",
      name: "Jersey City",
      containedInPlace: {
        "@type": "State",
        name: "New Jersey",
      },
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "100",
      bestRating: "5",
      worstRating: "1",
    },
  };
}

// Product schema - used on vehicle detail pages
export function generateProductSchema(vehicle: {
  id: string;
  year: number;
  make: string;
  model: string;
  description: string;
  category: string;
  dailyRate: number;
  isAvailable: boolean;
  avgRating?: string | null;
  reviewCount?: number;
}) {
  const displayName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${displayName} Rental`,
    description: vehicle.description,
    url: `${SITE_URL}/fleet/${vehicle.id}`,
    category: `${vehicle.category} car rental`,
    brand: {
      "@type": "Brand",
      name: SITE_NAME,
    },
    offers: {
      "@type": "Offer",
      price: vehicle.dailyRate,
      priceCurrency: "USD",
      priceValidUntil: new Date(
        Date.now() + 90 * 24 * 60 * 60 * 1000
      ).toISOString().split("T")[0],
      availability: vehicle.isAvailable
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: SITE_NAME,
      },
    },
  };

  if (vehicle.avgRating && vehicle.reviewCount) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: vehicle.avgRating,
      reviewCount: vehicle.reviewCount,
      bestRating: "5",
      worstRating: "1",
    };
  }

  return schema;
}

// Article schema - used on blog post pages
export function generateArticleSchema(post: {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  publishedAt: string;
  category: string;
  featuredImage: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    url: `${SITE_URL}/blog/${post.slug}`,
    image: `${SITE_URL}${post.featuredImage}`,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: {
      "@type": "Organization",
      name: post.author,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/images/logo.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/blog/${post.slug}`,
    },
    articleSection: post.category,
    wordCount: post.content.split(/\s+/).length,
  };
}

// FAQPage schema - used on FAQ page
export function generateFAQSchema(
  faqs: Array<{ question: string; answer: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

// BreadcrumbList schema - used on detail pages
export function generateBreadcrumbSchema(
  items: Array<{ name: string; url?: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  };
}
