"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Car, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/context/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");
  const [forgotPasswordMsg, setForgotPasswordMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (!email.trim()) {
      setLocalError("Please enter your email address");
      return;
    }
    if (!password.trim()) {
      setLocalError("Please enter your password");
      return;
    }

    try {
      const user = await login(email, password);
      // Redirect admin users to admin dashboard, customers to account page
      if (user?.role === "admin") {
        router.push("/admin");
      } else if (user?.role === "manager") {
        router.push("/manager");
      } else {
        router.push("/account");
      }
    } catch {
      // Error is handled by the auth context
    }
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
          <p className="mt-2 text-gray-500">Sign in to manage your rentals</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error messages */}
              {(error || localError) && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
                  {localError || error}
                </div>
              )}

              {/* Welcome message */}

              {/* Email */}
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setLocalError("");
                    }}
                    className="pl-10"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setLocalError("");
                    }}
                    className="pl-10 pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-purple-500 rounded outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Remember + Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2" />
                  <span className="text-gray-600">Remember me</span>
                </label>
                <button type="button" onClick={() => setForgotPasswordMsg("Check your email for password reset instructions.")} className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                  Forgot password?
                </button>
              </div>

              {/* Forgot Password Message */}
              {forgotPasswordMsg && (
                <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-600 border border-blue-200">
                  {forgotPasswordMsg}
                </div>
              )}

              {/* Submit */}
              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {isLoading ? "Signing in..." : "Sign In"}
                {!isLoading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>

          </CardContent>
        </Card>

        {/* Sign up link */}
        <p className="mt-6 text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-purple-600 hover:text-purple-700">
            Create one now
          </Link>
        </p>
      </div>
    </div>
  );
}
