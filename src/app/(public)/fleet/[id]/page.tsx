import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  Car, Users, Briefcase, Fuel, Gauge, DoorOpen, Settings,
  Calendar, Shield, ArrowLeft, Check, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/page-container";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { generateProductSchema } from "@/lib/utils/schema-generators";
import { SITE_URL } from "@/lib/constants";
import vehicles from "@/data/vehicles.json";
import extras from "@/data/extras.json";
import reviews from "@/data/reviews.json";

interface PageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return vehicles.map((v) => ({ id: v.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const vehicle = vehicles.find((v) => v.id === id);
  if (!vehicle) return {};

  const vehicleReviews = reviews.filter((r) => r.vehicleId === vehicle.id);
  const avgRating = vehicleReviews.length
    ? (vehicleReviews.reduce((sum, r) => sum + r.rating, 0) / vehicleReviews.length).toFixed(1)
    : null;

  const displayName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  return {
    title: `${displayName} Rental - $${vehicle.dailyRate}/day`,
    description: `Rent a ${displayName} in Jersey City, NJ. ${vehicle.specs.passengers} passengers, ${vehicle.specs.luggage} bags, ${vehicle.specs.mpg} MPG. Starting at $${vehicle.dailyRate}/day.${avgRating ? ` Rated ${avgRating}/5.` : ""}`,
    alternates: {
      canonical: `${SITE_URL}/fleet/${vehicle.id}`,
    },
    openGraph: {
      title: `${displayName} Rental - $${vehicle.dailyRate}/day | NextGearAuto`,
      description: `Rent a ${displayName} in Jersey City. ${vehicle.description}`,
      url: `${SITE_URL}/fleet/${vehicle.id}`,
      type: "website",
    },
  };
}

export default async function VehicleDetailPage({ params }: PageProps) {
  const { id } = await params;
  const vehicle = vehicles.find((v) => v.id === id);

  if (!vehicle) {
    notFound();
  }

  const vehicleReviews = reviews.filter((r) => r.vehicleId === vehicle.id);
  const avgRating = vehicleReviews.length
    ? (vehicleReviews.reduce((sum, r) => sum + r.rating, 0) / vehicleReviews.length).toFixed(1)
    : null;

  // Similar vehicles: same category, excluding current
  const similarVehicles = vehicles
    .filter((v) => v.category === vehicle.category && v.id !== vehicle.id)
    .slice(0, 3);

  const specs = [
    { icon: Users, label: "Passengers", value: `${vehicle.specs.passengers} seats` },
    { icon: Briefcase, label: "Luggage", value: `${vehicle.specs.luggage} bags` },
    { icon: Settings, label: "Transmission", value: vehicle.specs.transmission },
    { icon: Fuel, label: "Fuel Type", value: vehicle.specs.fuelType },
    { icon: Gauge, label: "Fuel Economy", value: `${vehicle.specs.mpg} MPG` },
    { icon: DoorOpen, label: "Doors", value: `${vehicle.specs.doors} doors` },
  ];

  const vehicleDisplayName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  const productSchema = generateProductSchema({
    id: vehicle.id,
    name: vehicleDisplayName,
    description: vehicle.description,
    category: vehicle.category,
    dailyRate: vehicle.dailyRate,
    isAvailable: vehicle.isAvailable,
    avgRating,
    reviewCount: vehicleReviews.length,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />

      {/* Breadcrumb header */}
      <section className="bg-gradient-to-br from-purple-900 to-gray-900 py-8 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { label: "Fleet", href: "/fleet" },
              { label: vehicleDisplayName },
            ]}
          />
          <div className="flex items-start justify-between">
            <div>
              <Badge className="mb-2 bg-purple-500/20 text-purple-200 border border-purple-400/30">{vehicle.category}</Badge>
              <h1 className="text-3xl font-bold sm:text-4xl">{vehicleDisplayName}</h1>
              {avgRating && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < Math.round(Number(avgRating)) ? "fill-amber-400 text-amber-400" : "text-gray-500"}`} />
                    ))}
                  </div>
                  <span className="text-sm text-purple-200">{avgRating} ({vehicleReviews.length} reviews)</span>
                </div>
              )}
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-3xl font-bold">${vehicle.dailyRate}</div>
              <div className="text-purple-200 text-sm">per day</div>
            </div>
          </div>
        </div>
      </section>

      <PageContainer className="py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image gallery placeholder */}
            <Card>
              <div className="grid grid-cols-2 gap-2 p-2">
                <div className="col-span-2 aspect-[16/9] rounded-lg bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                  <Car className="h-24 w-24 text-gray-200" />
                </div>
                <div className="aspect-[16/9] rounded-lg bg-gray-100 flex items-center justify-center">
                  <Car className="h-12 w-12 text-gray-200" />
                </div>
                <div className="aspect-[16/9] rounded-lg bg-gray-100 flex items-center justify-center">
                  <Car className="h-12 w-12 text-gray-200" />
                </div>
              </div>
            </Card>

            {/* Description */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">About This Vehicle</h2>
                <p className="text-gray-600 leading-relaxed">{vehicle.description}</p>
              </CardContent>
            </Card>

            {/* Specifications */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Specifications</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {specs.map((spec) => (
                    <div key={spec.label} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100">
                        <spec.icon className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">{spec.label}</div>
                        <div className="text-sm font-medium text-gray-900">{spec.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Features</h2>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {vehicle.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="h-4 w-4 shrink-0 text-green-500" />
                      {feature}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Reviews */}
            {vehicleReviews.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Customer Reviews</h2>
                  <div className="space-y-4">
                    {vehicleReviews.map((review) => (
                      <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex gap-0.5">
                            {Array.from({ length: review.rating }).map((_, i) => (
                              <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{review.customerName}</span>
                        </div>
                        <p className="text-sm text-gray-600">{review.text}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pricing card */}
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-purple-50 p-3">
                    <span className="text-sm text-gray-600">Daily Rate</span>
                    <span className="text-lg font-bold text-purple-600">${vehicle.dailyRate}</span>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-dashed border-gray-200 p-3 text-xs text-gray-500">
                  $50 non-refundable deposit at booking. Tax (8%) calculated at checkout.
                </div>

                <Link href={`/booking?vehicleId=${vehicle.id}`} className="mt-6 block">
                  <Button className="w-full" size="lg">
                    <Calendar className="h-4 w-4 mr-2" />
                    Reserve This Vehicle
                  </Button>
                </Link>

                <p className="mt-3 text-center text-xs text-gray-400">Free cancellation up to 24hrs before pickup</p>
              </CardContent>
            </Card>

            {/* Add-ons preview */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Add-Ons</h2>
                <div className="space-y-3">
                  {extras.map((extra) => (
                    <div key={extra.id} className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        <Shield className="h-4 w-4 mt-0.5 text-purple-500" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{extra.name}</div>
                          <div className="text-xs text-gray-500">{extra.description}</div>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-gray-700 whitespace-nowrap ml-2">${extra.pricePerDay}/day</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContainer>

      {/* Similar Vehicles */}
      {similarVehicles.length > 0 && (
        <section className="border-t border-gray-100 bg-gray-50">
          <PageContainer className="py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Similar Vehicles</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {similarVehicles.map((sv) => (
                <Link key={sv.id} href={`/fleet/${sv.id}`}>
                  <Card className="group h-full transition-shadow hover:shadow-md">
                    <div className="aspect-[16/10] rounded-t-xl bg-gradient-to-br from-purple-50 to-gray-100 flex items-center justify-center">
                      <Car className="h-16 w-16 text-purple-200 group-hover:text-purple-400 transition-colors" />
                    </div>
                    <CardContent className="p-5">
                      <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">{sv.year} {sv.make} {sv.model}</h3>
                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {sv.specs.passengers}</span>
                        <span className="flex items-center gap-1"><Fuel className="h-3.5 w-3.5" /> {sv.specs.mpg} mpg</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                        <span className="text-xl font-bold text-purple-600">${sv.dailyRate}<span className="text-sm text-gray-400 font-normal">/day</span></span>
                        <Button size="sm" variant="outline">View</Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </PageContainer>
        </section>
      )}
    </>
  );
}
