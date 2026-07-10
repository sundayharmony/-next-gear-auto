"use client";

import { useState } from "react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { logger } from "@/lib/utils/logger";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AddCustomerModal({
  onClose,
  onCreated,
  onError,
}: {
  onClose: () => void;
  onCreated: () => void;
  onError: (message: string) => void;
}) {
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAddCustomer = async () => {
    if (!formName || !formEmail) {
      onError("Name and email are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await adminFetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName, email: formEmail, phone: formPhone }),
      });
      const data = await res.json();
      if (data.success) onCreated();
      else onError("Failed to create customer: " + (data.error || "Unknown error"));
    } catch (err) {
      logger.error("Failed to create customer:", err);
      onError("Error creating customer");
    }
    setSubmitting(false);
  };

  return (
    <Modal open onOpenChange={(next) => { if (!next) onClose(); }}>
      <ModalContent className="sm:max-w-md">
        <ModalHeader>
          <ModalTitle>Add New Customer</ModalTitle>
          <ModalDescription>Creates a customer account for bookings and the owner portal.</ModalDescription>
        </ModalHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-600 font-semibold">
              Full Name <span className="text-red-500">*</span>
            </label>
            <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="John Doe" className="mt-1" />
          </div>
          <div>
            <label className="text-xs text-gray-600 font-semibold">
              Email <span className="text-red-500">*</span>
            </label>
            <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="john@example.com" className="mt-1" />
          </div>
          <div>
            <label className="text-xs text-gray-600 font-semibold">Phone (optional)</label>
            <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="+1 (555) 000-0000" className="mt-1" />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <Button onClick={handleAddCustomer} disabled={submitting} className="flex-1">
            Create Customer
          </Button>
          <Button onClick={onClose} variant="outline" className="flex-1">
            Cancel
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
