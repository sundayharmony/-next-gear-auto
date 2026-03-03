"use client";

import React, { useState } from "react";
import { Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "@/lib/hooks/use-form";
import { emailRule, phoneRule, nameRule } from "@/lib/utils/validation";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  const form = useForm({
    initialValues: {
      name: "",
      email: "",
      phone: "",
      message: "",
    },
    validationRules: {
      name: nameRule,
      email: emailRule,
      phone: { ...phoneRule, required: false },
      message: { required: true, minLength: 10, message: "Please enter at least 10 characters" },
    },
    onSubmit: async (values) => {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to send");
      setSubmitted(true);
    },
  });

  if (submitted) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
        <h3 className="font-semibold text-gray-900">Message Sent!</h3>
        <p className="mt-1 text-sm text-gray-500">We will get back to you within 24 hours.</p>
        <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); form.reset(); }}>
          Send Another Message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
        <Input {...form.register("name")} placeholder="John Doe" />
        {form.errors.name && <p className="mt-1 text-xs text-red-500">{form.errors.name}</p>}
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
        <Input {...form.register("email")} type="email" placeholder="john@example.com" />
        {form.errors.email && <p className="mt-1 text-xs text-red-500">{form.errors.email}</p>}
      </div>
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
        <Input {...form.register("phone")} type="tel" placeholder="(555) 123-4567" />
        {form.errors.phone && <p className="mt-1 text-xs text-red-500">{form.errors.phone}</p>}
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
        <textarea
          id="message"
          name="message"
          value={form.values.message}
          onChange={(e) => form.setValue("message", e.target.value)}
          onBlur={() => form.setFieldTouched("message")}
          rows={4}
          placeholder="How can we help you?"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
        />
        {form.errors.message && <p className="mt-1 text-xs text-red-500">{form.errors.message}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={form.isSubmitting}>
        {form.isSubmitting ? "Sending..." : "Send Message"}
        {!form.isSubmitting && <Send className="h-4 w-4 ml-1" />}
      </Button>
    </form>
  );
}
