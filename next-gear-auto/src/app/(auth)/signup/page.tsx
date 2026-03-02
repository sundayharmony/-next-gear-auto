"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Car, Mail, Lock, User, Phone, Eye, EyeOff, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/context/auth-context";

export default function SignupPage() {
  const router = useRouter();
  const { signup, isLoading, error } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const passwordStrength = (pw: string): { label: string; color: string; width: string } => {
    if (pw.length === 0) return { label: "", color: "bg-gray-200", width: "w-0" };
    if (pw.length < 6) return { label: "Weak", color: "bg-red-500", width: "w-1/4" };
    if (pw.length < 8) return { label: "Fair", color: "bg-yellow-500", width: "w-1/2" };
    if (/[A-Z]/.test(pw) && /[0-9]/.test(pw) && pw.length >= 10)
      return { label: "Strong", color: "bg-green-500", width: "w-full" };
    return { label: "Good", color: "bg-blue-500", width: "w-3/4" };
  };

  const strength = passwordStrength(formData.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (!formData.name.trim()) { setLocalError("Please enter your full name"); return; }
    if (!formData.email.trim()) { setLocalError("Please enter your email"); return; }
    if (!formData.phone.trim()) { setLocalError("Please enter your phone number"); return; }
    if (formData.password.length < 6) { setLocalError("Password must be at least 6 characters"); return; }
    if (formData.password !== formData.confirmPassword) { setLocalError("Passwords do not match"); return; }
    if (!agreedToTerms) { setLocalError("Please agree to the terms and conditions"); return; }

    await signup({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      phone: formData.phone,
    });
    router.push("/account");
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <Car className="h-10 w-10 text-purple-600" />
            <span className="text-2xl font-bold text-gray-900">
              Next<span className="text-purple-600">Gear</span>Auto
            </span>
          </Link>
          <p className="mt-2 text-gray-500">Create your account to start booking</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {(error || localError) && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
                  {localError || error}
                </div>
              )}

              {/* Name */}
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-700">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input id="name" placeholder="John Doe" value={formData.name} onChange={(e) => updateField("name", e.target.value)} className="pl-10" />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input id="email" type="email" placeholder="you@example.com" value={formData.email} onChange={(e) => updateField("email", e.target.value)} className="pl-10" />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-gray-700">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input id="phone" type="tel" placeholder="(555) 123-4567" value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} className="pl-10" />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="Create a password" value={formData.password} onChange={(e) => updateField("password", e.target.value)} className="pl-10 pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {/* Strength meter */}
                {formData.password && (
                  <div className="mt-2">
                    <div className="h-1.5 w-full rounded-full bg-gray-200">
                      <div className={`h-1.5 rounded-full transition-all ${strength.color} ${strength.width}`} />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Password strength: {strength.label}</p>
                  </div>
                )}
              </div>

              {/* Confirm */}
              <div>
                <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-gray-700">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input id="confirmPassword" type="password" placeholder="Confirm your password" value={formData.confirmPassword} onChange={(e) => updateField("confirmPassword", e.target.value)} className="pl-10" />
                  {formData.confirmPassword && formData.password === formData.confirmPassword && (
                    <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
                  )}
                </div>
              </div>

              {/* Terms */}
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="mt-0.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                <span className="text-gray-600">
                  I agree to the{" "}
                  <Link href="/terms" className="text-purple-600 hover:text-purple-700">Terms of Service</Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-purple-600 hover:text-purple-700">Privacy Policy</Link>
                </span>
              </label>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? "Creating Account..." : "Create Account"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-purple-600 hover:text-purple-700">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
