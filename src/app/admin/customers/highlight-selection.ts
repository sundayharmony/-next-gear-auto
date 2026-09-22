/** Whether a `?highlight=` customer should be opened. Dismissal blocks an immediate reopen. */
export function shouldOpenHighlightedCustomer(options: {
  highlightId: string | null;
  dismissedHighlightId: string | null;
  hasCustomers: boolean;
  hasSelection: boolean;
}): boolean {
  const { highlightId, dismissedHighlightId, hasCustomers, hasSelection } = options;
  if (!highlightId || !hasCustomers || hasSelection) return false;
  return dismissedHighlightId !== highlightId;
}
