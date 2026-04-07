import React from "react";
import Link from "next/link";
import { Car, Users, Shield, Award, Heart, Target, Clock, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer } from "@/components/layout/page-container";
import { SITE_NAME } from "@/lib/constants";
import { getServiceSupabase } from "@/lib/db/supabase";

export const metadata = {
  title: "About Us",
  description: "Learn about NextGearAuto - your trusted local car rental company. Our story, mission, and commitment to quality service.",
};

export default async function AboutPage() {
  // Fetch actual vehicle count from database
  let vehicleCount = 6; // fallback
  try {
    const supabase = getServiceSupabase();
    // Try with is_published filter first
    const { count, error } = await supabase
      .from("vehicles")
      .select("*", { count: "exact", head: true })
      .eq("is_published", true);
    if (!error && count && count > 0) {
      vehicleCount = count;
    } else {
      // Fallback: count without is_published filter (column may not exist yet)
      const { count: fallbackCount } = await supabase
        .from("vehicles")
        .select("*", { count: "exact", head: true });
      if (fallbackCount && fallbackCount > 0) vehicleCount = fallbackCount;
    }
  } catch { /* use fallback */ }

  const stats = [
    { value: "100+", label: "Happy Customers", icon: Users },
    { value: String(vehicleCount), label: "Quality Vehicles", icon: Car },
    { value: "1.5", label: "Years in Business", icon: Clock },
    { value: "4.8", label: "Average Rating", icon: Award },
  ];

  const values = [
    {
      icon: Shield,
      title: "Safety First",
      description: "Every vehicle in our fleet undergoes rigorous inspection and maintenance. We never compromise on safety standards.",
    },
    {
      icon: Heart,
      title: "Customer Care",
      description: "We treat every customer like family. Our team goes above and beyond to ensure your rental experience is seamless.",
    },
    {
      icon: Target,
      title: "Transparency",
      description: "No hidden fees, no surprises. What you see is what you pay. We believe in honest, upfront pricing.",
    },
    {
      icon: Award,
      title: "Quality Fleet",
      description: "Our vehicles are well-maintained, clean, and reliable. We take pride in offering only the best to our customers.",
    },
  ];

  const team = [
    { name: "Marcus Johnson", role: "Founder & CEO", bio: "With over 15 years in the automotive industry, Marcus founded NextGearAuto to make quality car rentals accessible and affordable.", gradient: "from-purple-500 to-indigo-600" },
    { name: "Sarah Chen", role: "Operations Manager", bio: "Sarah ensures every vehicle meets our high standards and every booking runs smoothly from start to finish.", gradient: "from-pink-500 to-purple-600" },
    { name: "David Rodriguez", role: "Customer Relations", bio: "David is your go-to for any questions or special requests. He is dedicated to making every customer feel valued.", gradient: "from-indigo-500 to-blue-600" },
  ];

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-purple-900 to-gray-900 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold sm:text-5xl">About {SITE_NAME}</h1>
          <p className="mt-3 max-w-2xl text-lg text-purple-200">
            Your trusted local car rental partner in Jersey City. Quality vehicles, honest pricing, and exceptional service.
          </p>
        </div>
      </section>

      {/* Stats */}
      <div className="relative -mt-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.label} className="text-center p-5 shadow-lg">
                <stat.icon className="mx-auto h-6 w-6 text-purple-600 mb-2" />
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Our Story */}
      <PageContainer className="py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-gray-900">Our Story</h2>
          <div className="mt-6 space-y-4 text-gray-600 leading-relaxed">
            <p>
              NextGearAuto was born from a simple idea: car rentals should be easy, affordable, and stress-free.
              Based in Jersey City, New Jersey, we started with a passion for helping people get where they
              need to go without the hassle of big-chain rental companies.
            </p>
            <p>
              Today, we operate a carefully curated fleet of {vehicleCount} vehicles spanning compact cars, sedans, SUVs,
              and trucks. Every vehicle is hand-selected for reliability, comfort, and value. We may not be the
              biggest rental company in town, but we pride ourselves on being the most trusted.
            </p>
            <p>
              As a locally owned and operated business in the heart of Jersey City, we understand the needs of
              our community. Whether you need a fuel-efficient compact for your daily commute, a spacious SUV
              for a family trip, or a rugged truck for moving day, we have you covered at prices that make sense.
            </p>
          </div>
        </div>
      </PageContainer>

      {/* Mission & Values */}
      <section className="bg-purple-50 py-16">
        <PageContainer>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900">Our Values</h2>
            <p className="mt-2 text-gray-500">The principles that guide everything we do</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value) => (
              <Card key={value.title} className="border-0 bg-white p-6 text-center shadow-sm card-hover">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
                  <value.icon className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900">{value.title}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">{value.description}</p>
              </Card>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* Team */}
      <PageContainer className="py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900">Meet Our Team</h2>
          <p className="mt-2 text-gray-500">The people behind NextGearAuto</p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 max-w-4xl mx-auto">
          {team.map((member) => {
            const initials = (member.name || "").split(" ").filter(Boolean).map((n: string) => n[0]).join("");
            return (
            <Card key={member.name} className="p-6 text-center card-hover overflow-hidden relative">
              <div className={`mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br ${member.gradient} shadow-lg`}>
                <span className="text-3xl font-bold text-white">
                  {initials || "?"}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{member.name}</h3>
              <p className="text-sm font-medium text-purple-600 mb-3">{member.role}</p>
              <p className="text-sm text-gray-500 leading-relaxed">{member.bio}</p>
            </Card>
            );
          })}
        </div>
      </PageContainer>

      {/* CTA */}
      <section className="bg-gradient-to-r from-purple-600 to-purple-800 py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold">Ready to Experience the Difference?</h2>
          <p className="mt-3 text-lg text-purple-100">
            Browse our fleet and see why our customers trust NextGearAuto.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/fleet">
              <Button size="lg" className="bg-white text-purple-900 hover:bg-gray-100">
                View Our Fleet <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/location">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                Visit Us
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
