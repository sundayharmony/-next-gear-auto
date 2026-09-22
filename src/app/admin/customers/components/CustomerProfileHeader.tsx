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
import { AdminCardActionButton } from "@/components/admin/admin-card-action-bar";
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

  const actionClass = "h-auto min-h-9 whitespace-normal px-2 py-2 text-left leading-tight";

  return (
    <div className="shrink-0 border-b border-gray-200 bg-white px-4 pb-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] sm:px-5 sm:pt-4">
      {showBack ? (
        <div className="mb-3 flex items-center justify-between xl:hidden">
          <Button type="button" variant="ghost" size="sm" className="h-8 px-2 -ml-2" onClick={onClose}>
            <ChevronLeft className="h-4 w-4" aria-hidden /> Back
          </Button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close customer details"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
      ) : null}

      <div className="flex items-start gap-3">
        {detail.profilePictureUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={detail.profilePictureUrl}
            alt=""
            className="h-14 w-14 shrink-0 rounded-full border-2 border-purple-200 object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xl font-bold text-purple-700">
            {customer.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="break-words text-lg font-semibold leading-tight text-gray-900 normal-case">
              {customer.name}
            </h2>
            {(customer.role === "admin" || customer.role === "manager") && (
              <Badge className="shrink-0 bg-purple-100 text-xs text-purple-700">
                <Shield className="mr-0.5 h-3 w-3" aria-hidden />
                {customer.role === "admin" ? "Admin" : "Manager"}
              </Badge>
            )}
          </div>
          <p className="mt-1 flex items-start gap-1.5 break-all text-sm text-gray-500">
            <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {customer.email}
          </p>
          {customer.phone ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-500">
              <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {customer.phone}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <AdminCardActionButton
          variant="outline"
          className={`${actionClass} border-green-200 text-green-700 hover:bg-green-50`}
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
          <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>Create booking</span>
        </AdminCardActionButton>
        {canMutateCustomers ? (
          <>
            <AdminCardActionButton
              variant="outline"
              className={actionClass}
              disabled={detail.sendingPasswordLink}
              onClick={() => void detail.sendPasswordLink()}
            >
              <KeyRound className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{detail.sendingPasswordLink ? "Sending…" : "Password link"}</span>
            </AdminCardActionButton>
            <AdminCardActionButton
              variant="outline"
              className={`${actionClass} border-red-200 text-red-600 hover:bg-red-50`}
              disabled={detail.deletingCustomer}
              onClick={() => void detail.deleteCustomer()}
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{detail.deletingCustomer ? "Deleting…" : "Delete"}</span>
            </AdminCardActionButton>
          </>
        ) : null}
        {detail.latestIdUrl ? (
          <AdminCardActionButton
            variant="secondary"
            className={actionClass}
            onClick={() => void detail.openCropModal(detail.latestIdUrl!, "Driver License")}
          >
            <Crop className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>From license</span>
          </AdminCardActionButton>
        ) : null}
        {detail.latestInsuranceUrl ? (
          <AdminCardActionButton
            variant="secondary"
            className={actionClass}
            onClick={() => void detail.openCropModal(detail.latestInsuranceUrl!, "Insurance Proof")}
          >
            <ImageUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>From insurance</span>
          </AdminCardActionButton>
        ) : null}
        <AdminCardActionButton
          variant="secondary"
          className={actionClass}
          onClick={() => detail.profileImageFileInputRef.current?.click()}
        >
          <Camera className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>Upload photo</span>
        </AdminCardActionButton>
        {detail.profilePictureUrl ? (
          <AdminCardActionButton
            variant="outline"
            className={actionClass}
            disabled={detail.savingProfilePic}
            onClick={() => void detail.removeProfilePicture()}
          >
            <span>{detail.savingProfilePic ? "Removing…" : "Remove photo"}</span>
          </AdminCardActionButton>
        ) : null}
      </div>
      <input
        ref={detail.profileImageFileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => void detail.handleProfileImageFileSelected(e)}
      />
    </div>
  );
}
