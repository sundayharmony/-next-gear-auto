import Link from "next/link";
import { Car, Shield, Clock, DollarSign, Star, ArrowRight, Users, Luggage, Fuel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/page-container";
import { HomeReviews } from "@/components/home/home-reviews";
import { getServiceSupabase } from "@/lib/db/supabase";
import { generateLocalBusinessSchema } from "@/lib/utils/schema-generators";

interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  category: string;
  images: string[];
  specs: Record<string, any>;
  daily_rate: number;
  features: string[];
  is_available: boolean;
  description: string;
  color: string;
  mileage: number;
  license_plate: string;
  vin: string;
  maintenance_status: string;
}

export default async function HomePage() {
  // Fetch featured vehicles from Supabase
  const supabase = getServiceSupabase();
  let featuredVehicles: Vehicle[] = [];

  try {
    const { data } = await supabase
      .from("vehicles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(4);

    if (data) {
      featuredVehicles = data;
    }
  } catch (error) {
    console.error("Failed to fetch featured vehicles:", error);
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateLocalBusinessSchema()),
        }}
      />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-purple-900 via-purple-800 to-gray-900 text-white">
        <div className="absolute inset-0 bg-[url('/images/hero-pattern.svg')] opacity-10" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="max-w-2xl">
            <Badge className="mb-4 bg-purple-500/20 text-purple-200 border border-purple-400/30">
              Trusted Local Rentals
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Your Journey{" "}
              <span className="text-purple-300">Starts Here</span>
            </h1>
            <p className="mt-4 text-lg text-purple-100/80 sm:text-xl">
              Premium vehicles at competitive prices. From compact cars to powerful trucks,
              find the perfect ride for any occasion.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/fleet">
                <Button size="lg" className="bg-white text-purple-900 hover:bg-gray-100">
                  View Our Fleet
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/booking">
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                  Book Now
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick stats */}
          <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Vehicles", value: "6+", icon: Car },
              { label: "Happy Customers", value: "100+", icon: Users },
              { label: "Years in Business", value: "1.5", icon: Shield },
              { label: "Starting at", value: "$35/day", icon: DollarSign },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
                <stat.icon className="h-6 w-6 text-purple-300 mb-2" />
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-sm text-purple-200">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Fleet */}
      <PageContainer className="py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900">Our Fleet</h2>
          <p className="mt-2 text-gray-500">Choose from our well-maintained selection of vehicles</p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featuredVehicles.length > 0 ? (
            featuredVehicles.map((vehicle) => {
              const specs = vehicle.specs as Record<string, any>;
              return (
                <Link key={vehicle.id} href={`/fleet/${vehicle.id}`}>
                  <Card className="group h-full card-hover">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl bg-gradient-to-br from-purple-50 to-gray-100">
                      {vehicle.images && vehicle.images.length > 0 ? (
                        <img
                          src={vehicle.images[0]}
                          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Car className="h-20 w-20 text-purple-200 transition-all duration-300 group-hover:text-purple-400 group-hover:scale-110" />
                        </div>
                      )}
                      <Badge className="absolute top-3 left-3" variant="default">
                        {vehicle.category}
                      </Badge>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-gray-900">{vehicle.year} {vehicle.make} {vehicle.model}</h3>
                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {specs.passengers}
                        </span>
                        <span className="flex items-center gap-1">
                          <Luggage className="h-3 w-3" /> {specs.luggage}
                        </span>
                        <span className="flex items-center gap-1">
                          <Fuel className="h-3 w-3" /> {specs.mpg} mpg
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div>
                          <span className="text-lg font-bold text-purple-600">${vehicle.daily_rate}</span>
                          <span className="text-sm text-gray-400">/day</span>
                        </div>
                        <Button size="sm" variant="outline">Details</Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })
          ) : (
            <div className="col-span-full py-12 text-center">
              <Car className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500">No vehicles available</p>
            </div>
          )}
        </div>
        <div className="mt-8 text-center">
          <Link href="/fleet">
            <Button variant="outline" size="lg">
              View All Vehicles <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </PageContainer>

      {/* Why Choose Us */}
      <section className="bg-purple-50 py-16">
        <PageContainer>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900">Why Choose NextGearAuto</h2>
            <p className="mt-2 text-gray-500">Everything you need for a great rental experience</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: DollarSign, title: "Competitive Pricing", desc: "Transparent pricing with no hidden fees. Daily, weekly, and monthly rates available." },
              { icon: Shield, title: "Well-Maintained Fleet", desc: "Every vehicle is thoroughly inspected and cleaned between rentals." },
              { icon: Clock, title: "Easy Booking", desc: "Book online in minutes with our simple 7-step process. Instant confirmation." },
              { icon: Star, title: "Local Expertise", desc: "Friendly, knowledgeable staff ready to help you find the perfect vehicle." },
            ].map((item) => (
              <Card key={item.title} className="border-0 bg-white p-6 text-center shadow-sm card-hover">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
                  <item.icon className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm text-gray-500">{item.desc}</p>
              </Card>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* Testimonials */}
      <PageContainer className="py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900">What Our Customers Say</h2>
          <p className="mt-2 text-gray-500">Real reviews from real renters</p>
        </div>
        <HomeReviews />
      </PageContainer>

      {/* CTA */}
      <section className="bg-gradient-to-r from-purple-600 to-purple-800 py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold">Ready to Hit the Road?</h2>
          <p className="mt-3 text-lg text-purple-100">
            Browse our fleet and book your perfect vehicle in minutes.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/fleet">
              <Button size="lg" className="bg-white text-purple-900 hover:bg-gray-100">
                View Fleet
              </Button>
            </Link>
            <Link href="/booking">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                Book Now
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
