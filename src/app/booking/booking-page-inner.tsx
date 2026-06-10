"use client";

import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";
import { WizardProgress } from "@/app/booking/components/wizard-progress";
import { PriceSummaryBar } from "@/app/booking/components/price-summary-bar";
import { WizardNav } from "@/app/booking/components/wizard-nav";
import { DatesStep } from "@/app/booking/steps/dates-step";
import { VehicleStep } from "@/app/booking/steps/vehicle-step";
import { ExtrasStep } from "@/app/booking/steps/extras-step";
import { CustomerStep } from "@/app/booking/steps/customer-step";
import { VerifyStep } from "@/app/booking/steps/verify-step";
import { ReviewStep } from "@/app/booking/steps/review-step";
import { PaymentStep } from "@/app/booking/steps/payment-step";
import { useBookingWizard } from "@/app/booking/use-booking-wizard";

export function BookingPageInner() {
  const w = useBookingWizard();

  const showPriceSummary =
    w.currentStep >= 2 && w.booking.selectedVehicle && w.booking.pickupDate && w.booking.returnDate;

  const showBarTotal = !!w.booking.pricing && w.currentStep >= 2 && w.currentStep < 7;

  return (
    <>
      <section className="page-hero page-hero--sm text-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold">Book Your Vehicle</h1>
          <p className="mt-1 page-hero-subtitle">Complete the steps below to reserve your rental.</p>
        </div>
      </section>

      <WizardProgress currentStep={w.currentStep} onStepClick={w.handleStepClick} />

      {showPriceSummary && w.booking.selectedVehicle && (
        <PriceSummaryBar
          selectedVehicle={w.booking.selectedVehicle}
          pickupDate={w.booking.pickupDate}
          returnDate={w.booking.returnDate}
          pickupTime={w.booking.pickupTime}
          returnTime={w.booking.returnTime}
          extrasCount={w.booking.extras.filter((e) => e.selected).length}
          checkoutTotal={w.checkoutTotal}
          hasPricing={!!w.booking.pricing}
        />
      )}

      <PageContainer className="py-8">
        <div className="mx-auto max-w-3xl pb-24 sm:pb-0">
          {w.currentStep === 1 && (
            <DatesStep
              searchDates={w.searchDates}
              setSearchDates={w.setSearchDates}
              dateValidationError={w.dateValidationError}
              locations={w.locations}
              locationsLoading={w.locationsLoading}
              selectedPickupLocation={w.selectedPickupLocation}
              setSelectedPickupLocation={w.setSelectedPickupLocation}
              selectedReturnLocation={w.selectedReturnLocation}
              setSelectedReturnLocation={w.setSelectedReturnLocation}
              differentDropoff={w.differentDropoff}
              setDifferentDropoff={w.setDifferentDropoff}
              showPickupCalendar={w.showPickupCalendar}
              setShowPickupCalendar={w.setShowPickupCalendar}
              showReturnCalendar={w.showReturnCalendar}
              setShowReturnCalendar={w.setShowReturnCalendar}
              showPickupTimePicker={w.showPickupTimePicker}
              setShowPickupTimePicker={w.setShowPickupTimePicker}
              showReturnTimePicker={w.showReturnTimePicker}
              setShowReturnTimePicker={w.setShowReturnTimePicker}
              calendarViewDate={w.calendarViewDate}
              setCalendarViewDate={w.setCalendarViewDate}
            />
          )}

          {w.currentStep === 2 && (
            <VehicleStep
              vehicles={w.vehicles}
              vehiclesLoading={w.vehiclesLoading}
              vehiclesError={w.vehiclesError}
              retryVehicles={w.retryVehicles}
              checkingAvailability={w.checkingAvailability}
              availabilityError={w.availabilityError}
              retryAvailability={w.retryAvailability}
              urlVehicleUnavailable={w.urlVehicleUnavailable}
              selectedVehicleId={w.booking.selectedVehicle?.id}
              isVehicleBooked={w.isVehicleBooked}
              onSelectVehicle={w.booking.selectVehicle}
            />
          )}

          {w.currentStep === 3 && (
            <ExtrasStep
              localExtras={w.localExtras}
              onToggleExtra={w.handleToggleExtra}
              insuranceProofUrl={w.insuranceProofUrl}
              setInsuranceProofUrl={w.setInsuranceProofUrl}
              setInsuranceProofFile={w.setInsuranceProofFile}
              uploadingInsuranceProof={w.uploadingInsuranceProof}
              setUploadingInsuranceProof={w.setUploadingInsuranceProof}
              insuranceUploadError={w.insuranceUploadError}
              setInsuranceUploadError={w.setInsuranceUploadError}
              setLocalExtras={w.setLocalExtras}
            />
          )}

          {w.currentStep === 4 && (
            <CustomerStep
              details={w.details}
              setDetails={w.setDetails}
              showDobCalendar={w.showDobCalendar}
              setShowDobCalendar={w.setShowDobCalendar}
              dobViewDate={w.dobViewDate}
              setDobViewDate={w.setDobViewDate}
            />
          )}

          {w.currentStep === 5 && (
            <VerifyStep
              uploadedFile={w.uploadedFile}
              setUploadedFile={w.setUploadedFile}
              idDocumentUrl={w.idDocumentUrl}
              setIdDocumentUrl={w.setIdDocumentUrl}
              uploadingId={w.uploadingId}
              setUploadingId={w.setUploadingId}
              uploadError={w.uploadError}
              setUploadError={w.setUploadError}
              idRequiredError={w.idRequiredError}
              setIdRequiredError={w.setIdRequiredError}
            />
          )}

          {w.currentStep === 6 && (
            <ReviewStep
              selectedVehicle={w.booking.selectedVehicle}
              pickupDate={w.booking.pickupDate}
              returnDate={w.booking.returnDate}
              pickupTime={w.booking.pickupTime}
              returnTime={w.booking.returnTime}
              pickupLocationName={w.booking.pickupLocationName}
              returnLocationName={w.booking.returnLocationName}
              pricing={w.booking.pricing}
              promoCode={w.booking.promoCode}
              promoDiscount={w.booking.promoDiscount}
              locationSurcharge={w.booking.locationSurcharge}
              checkoutTotal={w.checkoutTotal}
              promoInput={w.promoInput}
              setPromoInput={w.setPromoInput}
              promoLoading={w.promoLoading}
              promoError={w.promoError}
              setPromoError={w.setPromoError}
              onApplyPromo={w.handleApplyPromo}
              onRemovePromo={w.handleRemovePromo}
              details={w.details}
              agreementSignatures={w.agreementSignatures}
              setAgreementSignatures={w.setAgreementSignatures}
              signedName={w.signedName}
              setSignedName={w.setSignedName}
            />
          )}

          {w.currentStep === 7 && (
            <PaymentStep
              selectedVehicle={w.booking.selectedVehicle}
              checkoutTotal={w.checkoutTotal}
              hasPricing={!!w.booking.pricing}
              error={w.booking.error}
              isSubmitting={w.booking.isSubmitting}
              onSubmit={w.booking.submitBooking}
            />
          )}

          {w.showInsuranceWarning && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-white rounded-xl shadow-xl max-w-sm mx-4 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="h-8 w-8 text-purple-600" />
                  <h3 className="text-lg font-semibold">Insurance Required</h3>
                </div>
                <p className="text-sm text-gray-600 mb-6">
                  Insurance coverage is required for all rentals. To opt out, please upload proof of your own valid auto insurance policy.
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => w.setShowInsuranceWarning(false)}>
                    Keep Insurance
                  </Button>
                  <Button className="flex-1" onClick={() => w.setShowInsuranceWarning(false)}>
                    Upload Proof
                  </Button>
                </div>
              </div>
            </div>
          )}

          <WizardNav
            currentStep={w.currentStep}
            canProceed={w.canProceed()}
            isSubmitting={w.booking.isSubmitting}
            checkoutTotal={w.checkoutTotal}
            showBarTotal={showBarTotal}
            onBack={w.booking.prevStep}
            onNext={w.handleNext}
          />
        </div>
      </PageContainer>
    </>
  );
}
