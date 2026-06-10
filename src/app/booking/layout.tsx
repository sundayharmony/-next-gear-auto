import { BookingProvider } from "@/lib/context/booking-context";

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://checkout.stripe.com" />
      <BookingProvider>{children}</BookingProvider>
    </>
  );
}
