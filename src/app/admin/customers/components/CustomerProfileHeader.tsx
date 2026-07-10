"use client";

import {
  Camera,
  ChevronLeft,
  Crop,
  ImageUp,
  KeyRound,
  Mail,
  Phone,
  Plus,
  Shield,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { staffBookingsHref, type StaffPanelBase } from "@/lib/admin/staff-panel-base";
import type { CustomerRow } from "../use-customers-data";
import type { useCustomerDetail } from "../use-customer-detail";

type Detail = ReturnType<typeof useCustomerDetail>;

export function CustomerProfileHeader({
  customer,
  panelBase,
  canMutateCustomers,
  showBack,
  onClose,
  detail,
}: {
  customer: CustomerRow;
  panelBase: StaffPanelBase;
  canMutateCustomers: boolean;
  showBack: boolean;
  onClose: () => void;
  detail: Pick<
    Detail,
    | "profilePictureUrl"
    | "latestIdUrl"
    | "latestInsuranceUrl"
    | "profileImageFileInputRef"
    | "openCropModal"
    | "handleProfileImageFileSelected"
    | "removeProfilePicture"
    | "savingProfilePic"
    | "sendPasswordLink"
    | "sendingPasswordLink"
    | "deleteCustomer"
    | "deletingCustomer"
  >;
}) {
  const router = useRouter();

  return (
    <div className="border-b border-gray-200 bg-white px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start gap-3">
        {showBack && (
          <Button type="button" variant="ghost" size="sm" className="h-8 px-2 -ml-2 xl:hidden" onClick={onClose}>
            <ChevronLeft className="h-4 w-4 mr-0.5" /> Back
          </Button>
        )}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {detail.profilePictureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={detail.profilePictureUrl}
              alt={customer.name}
              className="h-14 w-14 rounded-full object-cover border-2 border-purple-200 shrink-0"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-xl font-bold shrink-0">
              {customer.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900 truncate normal-case" title={customer.name}>
                {customer.name}
              </h2>
              {(customer.role === "admin" || customer.role === "manager") && (
                <Badge className="bg-purple-100 text-purple-700 text-xs shrink-0">
                  <Shield className="h-3 w-3 mr-0.5" />
                  {customer.role === "admin" ? "Admin" : "Manager"}
                </Badge>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
              <span className="flex items-center gap-1 min-w-0 truncate">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{customer.email}</span>
              </span>
              {customer.phone ? (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  {customer.phone}
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 xl:hidden"
            aria-label="Close customer details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-green-200 text-green-700 hover:bg-green-50"
          onClick={() => {
            const params = new URLSearchParams({
              customerId: customer.id,
              customerName: customer.name,
              customerEmail: customer.email,
              ...(customer.phone ? { customerPhone: customer.phone } : {}),
            });
            router.push(staffBookingsHref(panelBase, params.toString()));
          }}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Create Booking
        </Button>
        {canMutateCustomers ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={detail.sendingPasswordLink}
              onClick={() => void detail.sendPasswordLink()}
            >
              <KeyRound className="h-3.5 w-3.5 mr-1" />
              {detail.sendingPasswordLink ? "Sending..." : "Send Password Link"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50"
              disabled={detail.deletingCustomer}
              onClick={() => void detail.deleteCustomer()}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
            </Button>
          </>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {detail.latestIdUrl ? (
          <Button type="button" size="sm" variant="secondary" className="h-8 text-xs" onClick={() => void detail.openCropModal(detail.latestIdUrl!, "Driver License")}>
            <Crop className="h-3 w-3 mr-1" /> From License
          </Button>
        ) : null}
        {detail.latestInsuranceUrl ? (
          <Button type="button" size="sm" variant="secondary" className="h-8 text-xs" onClick={() => void detail.openCropModal(detail.latestInsuranceUrl!, "Insurance Proof")}>
            <ImageUp className="h-3 w-3 mr-1" /> From Insurance
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="secondary" className="h-8 text-xs" onClick={() => detail.profileImageFileInputRef.current?.click()}>
          <Camera className="h-3 w-3 mr-1" /> Upload Photo
        </Button>
        {detail.profilePictureUrl ? (
          <Button type="button" size="sm" variant="outline" className="h-8 text-xs" disabled={detail.savingProfilePic} onClick={() => void detail.removeProfilePicture()}>
            {detail.savingProfilePic ? "Removing..." : "Remove Photo"}
          </Button>
        ) : null}
        <input
          ref={detail.profileImageFileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => void detail.handleProfileImageFileSelected(e)}
        />
      </div>
    </div>
  );
}
