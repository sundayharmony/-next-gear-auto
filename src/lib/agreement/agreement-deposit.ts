import { DEPOSIT_AMOUNT } from "@/lib/constants";

/** Security deposit shown on agreements; uses booking value when set, else site default. */
export function resolveAgreementDeposit(
  deposit: number | null | undefined,
  totalPrice?: number | null,
): number {
  if (deposit !== null && deposit !== undefined && Number.isFinite(deposit)) {
    return Math.max(0, deposit);
  }
  return DEPOSIT_AMOUNT;
}

export function resolveAgreementBalanceDue(
  totalPrice: number | null | undefined,
  deposit: number | null | undefined,
): number {
  const total = totalPrice ?? 0;
  const depositAmount = resolveAgreementDeposit(deposit, total);
  return Math.max(0, total - depositAmount);
}
