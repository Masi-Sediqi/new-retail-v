import { formatCurrencyAmount } from "./currencyExchange";

export function LedgerAmount({ value, currency = "AFN", type = "credit", formatter = formatCurrencyAmount }) {
  const numericValue = Math.abs(Number(value || 0));

  if (!numericValue) return "-";

  const normalizedType = String(type || "").toLowerCase();
  const isDebit = normalizedType === "debit" || normalizedType === "withdraw" || normalizedType === "expense";
  const sign = isDebit ? "-" : "+";
  const className = isDebit ? "ledger-amount debit" : "ledger-amount credit";

  return (
    <span className={className}>
      <b aria-hidden="true">{sign}</b>
      {formatter(numericValue, currency)}
    </span>
  );
}
