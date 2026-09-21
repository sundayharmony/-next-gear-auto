"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { useNotification } from "@/lib/context/notification-context";

export interface EditOwnerTarget {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export function EditOwnerModal({
  owner,
  onClose,
  onSaved,
}: {
  owner: EditOwnerTarget | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useNotification();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (owner) {
      setName(owner.name);
      setEmail(owner.email);
      setPhone(owner.phone || "");
    }
  }, [owner]);

  const submit = async () => {
    if (!owner) return;
    if (!name.trim() || !email.trim()) {
      showToast("error", "Missing info", "Name and email are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await adminFetch(`/api/admin/owners/${encodeURIComponent(owner.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("success", "Owner updated", json.message || "Profile saved.");
        onSaved();
        onClose();
      } else {
        showToast("error", "Save failed", json.message || "Try again.");
      }
    } catch {
      showToast("error", "Save failed", "Network error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!owner} onOpenChange={(o) => { if (!o) onClose(); }}>
      <ModalContent tier="staff">
        <ModalHeader>
          <ModalTitle>Edit owner</ModalTitle>
          <ModalDescription className="sr-only">
            Update owner name, email, and phone.
          </ModalDescription>
        </ModalHeader>
        <div className="space-y-3">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
