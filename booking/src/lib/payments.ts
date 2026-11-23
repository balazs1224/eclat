// Fizetési modul határa.
//
// ÁLLAPOT: csak a "manual" szolgáltató működik (átutalás vagy helyszíni fizetés, amelyet az admin rögzít).
// Stripe / Barion / SimplePay: INTEGRÁCIÓRA VÁR — szolgáltató választása és szerződés után implementálandó.
//
// Kötelező szabályok egy online szolgáltató bekötésekor:
//  1. A kártyaadatot kizárólag a szolgáltató fizetőoldala kezeli (átirányítás / hosted checkout).
//  2. A foglalás CSAK a szolgáltató hitelesített visszajelzése (aláírt webhook / IPN, ill. szerveroldali
//     státuszlekérdezés) után kaphat befizetést — a böngésző visszairányítása önmagában nem bizonyíték.
//  3. A webhook feldolgozása idempotens legyen (payments.provider + provider_ref egyedi index).
//  4. A befizetést a recordPayment() függvénnyel rögzítse (service.ts), provider + providerRef megadásával.
import type { BookingRow } from "./booking/service";

export interface CheckoutSession {
  redirectUrl: string;
  providerRef: string;
}

export interface VerifiedPaymentEvent {
  bookingId: string;
  providerRef: string;
  amount: number;
  kind: "deposit" | "balance" | "full";
  succeeded: boolean;
}

export interface PaymentProvider {
  id: string;
  /** Online fizetés indítása; a manuális szolgáltatónál null (nincs online fizetés). */
  createCheckout(booking: BookingRow, amount: number, kind: "deposit" | "balance" | "full"): Promise<CheckoutSession | null>;
  /** A szolgáltató visszajelzésének HITELESÍTETT feldolgozása; érvénytelen aláírásnál null. */
  verifyNotification(request: Request): Promise<VerifiedPaymentEvent | null>;
}

export const manualProvider: PaymentProvider = {
  id: "manual",
  async createCheckout() {
    return null;
  },
  async verifyNotification() {
    return null;
  },
};

export function paymentProvider(): PaymentProvider {
  const id = process.env.PAYMENT_PROVIDER ?? "manual";
  if (id === "manual") return manualProvider;
  throw new Error(`A(z) ${id} fizetési szolgáltató még nincs bekötve.`);
}
