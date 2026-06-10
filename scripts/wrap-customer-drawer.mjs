import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const src = fs.readFileSync(
  path.join(root, "src/app/admin/customers/customer-detail-drawer.tsx"),
  "utf8"
);

const header = `"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { isAllowedExternalHref } from "@/lib/utils/safe-url";
import { safeDataImageSrc } from "@/lib/utils/validation";
import type { BookingDbRow } from "@/lib/types";
import {
  ArrowLeft,
  X,
  Mail,
  Phone,
  DollarSign,
  Car,
  FileText,
  Shield,
  Clock,
  TrendingUp,
  CreditCard,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Edit2,
  Upload,
  Plus,
  Trash2,
  KeyRound,
  Crop,
  User,
  Move,
  ZoomIn,
  ZoomOut,
  Ticket,
  MapPin,
  Loader2,
  Camera,
  ImageUp,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/page-container";
import { formatDate, formatTime } from "@/lib/utils/date-helpers";
import { statusColors } from "@/lib/utils/status-colors";
import { logger } from "@/lib/utils/logger";
import { staffBookingsHref } from "@/lib/admin/staff-panel-base";
import type { CustomerRow } from "./use-customers-data";

type BookingRow = BookingDbRow;

export interface CustomerDetailDrawerProps {
  customer: CustomerRow;
  panelBase: string;
  canMutateCustomers: boolean;
  setCustomers: React.Dispatch<React.SetStateAction<CustomerRow[]>>;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function CustomerDetailDrawer({
  customer: initialCustomer,
  panelBase,
  canMutateCustomers,
  setCustomers,
  onClose,
  onSuccess,
  onError,
}: CustomerDetailDrawerProps) {
`;

let body = src;

// Remove list-page-only state and logic
body = body.replace(/^  const \[selectedCustomer, setSelectedCustomer\][^\n]+\n/m, "  const [customer, setCustomer] = useState<CustomerRow>(initialCustomer);\n");
body = body.replace(/^  const \[showAddCustomerModal[^\n]+\n/m, "");
body = body.replace(/^  const \{ currentPage[^\n]+\n/m, "");
body = body.replace(/^  const searchParams[^\n]+\n/m, "");
body = body.replace(/^  const highlightId[^\n]+\n/m, "");
body = body.replace(/\/\/ Auto-open customer[\s\S]*?\}, \[highlightId[^\]]+\]\);\n\n/m, "");
body = body.replace(/^  const handleSearch[\s\S]*?  };\n\n/m, "");
body = body.replace(/^  const router = useRouter\(\);\n\n/m, "  const router = useRouter();\n\n");

body = body.replace(/\bselectedCustomer\b/g, "customer");
body = body.replace(/\bsetSelectedCustomer\b/g, "setCustomer");
body = body.replace(/\bsetToastSuccess\b/g, "onSuccess");
body = body.replace(/\bsetToastError\b/g, "onError");

body = body.replace(
  /const closeCustomer = \(\) => \{[\s\S]*?\};\n\n/,
  `const closeCustomer = () => {
    onClose();
  };

`
);

body = body.replace(
  /const openCustomer = async \(customer: CustomerRow\) => \{/,
  "const loadCustomerData = async (target: CustomerRow) => {"
);

body = body.replace(
  /setCustomer\(customer\);/,
  "setCustomer(target);"
);

body = body.replace(
  /encodeURIComponent\(customer\.id\)/g,
  "encodeURIComponent(target.id)"
);
body = body.replace(
  /encodeURIComponent\(customer\.email\)/g,
  "encodeURIComponent(target.email)"
);

body = body.replace(
  /await openCustomer\(customer\)/g,
  "await loadCustomerData(customer)"
);

body = body.replace(
  /\/\/ === FULL-SCREEN CUSTOMER DETAIL VIEW ===\n  if \(customer\) \{\n    return \(\n      <>\n        \{\/\* Toast notifications \*\/\}[\s\S]*?\{toastError && \([\s\S]*?\)\}\n/m,
  "  useEffect(() => {\n    void loadCustomerData(initialCustomer);\n  }, [initialCustomer.id]);\n\n  useEffect(() => {\n    setCustomer(initialCustomer);\n  }, [initialCustomer]);\n\n  return (\n    <>\n"
);

body = body.replace(/\n      \);\n  \}\n$/m, "\n  );\n");

const footer = `
}

export default CustomerDetailDrawer;
`;

fs.writeFileSync(
  path.join(root, "src/app/admin/customers/customer-detail-drawer.tsx"),
  header + body + footer
);
console.log("wrapped customer-detail-drawer");
