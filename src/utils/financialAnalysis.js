export const number = (value) => Number(value || 0);
export const money = (value) => number(value).toLocaleString("en-US");

export const toDateValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const parseDate = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

export const getDateRange = (dateValue, period) => {
  const selected = parseDate(dateValue) || new Date();
  const start = new Date(selected);
  const end = new Date(selected);

  if (period === "weekly") {
    const daysFromSaturday = (selected.getDay() + 1) % 7;
    start.setDate(selected.getDate() - daysFromSaturday);
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 6);
  } else if (period === "monthly") {
    start.setDate(1);
    end.setMonth(start.getMonth() + 1, 0);
  } else if (period === "yearly") {
    start.setMonth(0, 1);
    end.setMonth(11, 31);
  }

  return { start: toDateValue(start), end: toDateValue(end) };
};

export const getPreviousRange = (startValue, endValue, period) => {
  if (period === "all") return null;
  const start = parseDate(startValue);
  const end = parseDate(endValue);
  if (!start || !end) return null;
  const days = Math.round((end - start) / 86400000) + 1;
  const previousEnd = new Date(start);
  previousEnd.setDate(previousEnd.getDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - days + 1);
  return { start: toDateValue(previousStart), end: toDateValue(previousEnd) };
};

export const isInRange = (date, period, start, end) =>
  period === "all" || Boolean(date && date >= start && date <= end);

export const sourceLabel = (source) => ({
  manual: "دستی",
  "customer-travel": "پرداخت اولیه سفر",
  "customer-payment": "پرداخت بدهی مشتری",
  "travel-expense": "مصرف سفر",
  "car-repair": "ترمیم موتر",
  "car-expense": "مصرف موتر",
}[source] || "سیستم");

export const categoryLabel = (category) => ({
  travel: "عاید سفر",
  customer: "پرداخت مشتری",
  fuel: "تیل",
  repair: "ترمیم",
  salary: "معاش",
  purchase: "خریداری",
  other: "سایر",
}[category] || category || "سایر");

export function getTransactionCategory(transaction, travelExpenses = []) {
  if (transaction.category) return transaction.category;
  if (transaction.source === "customer-travel") return "travel";
  if (transaction.source === "customer-payment") return "customer";
  if (transaction.source === "car-repair" || transaction.source === "car-expense") return "repair";
  if (transaction.source === "travel-expense") {
    return travelExpenses.find((item) => Number(item.id) === Number(transaction.referenceId))?.category || "other";
  }
  const text = `${transaction.title || ""} ${transaction.description || ""}`;
  if (text.includes("تیل") || text.toLowerCase().includes("fuel")) return "fuel";
  if (text.includes("ترمیم")) return "repair";
  if (text.includes("معاش")) return "salary";
  if (text.includes("خرید")) return "purchase";
  return "other";
}

export function getAllTransactions(transactions, customerTravels, customerPayments, travelExpenses = [], carRepairs = []) {
  const legacyTravelPayments = customerTravels
    .filter((record) =>
      number(record.paidAmount) > 0 &&
      !transactions.some((item) => item.source === "customer-travel" && Number(item.referenceId) === Number(record.id))
    )
    .map((record) => ({
      id: `legacy-travel-${record.id}`,
      type: "income",
      title: `پرداخت سفر ${record.travelName || ""}`,
      amount: number(record.paidAmount),
      date: record.date,
      description: "پرداخت ثبت‌شده پیشین مشتری",
      source: "customer-travel",
      category: "travel",
      referenceId: record.id,
      customerIndex: record.customerIndex,
      travelIndex: record.travelIndex,
    }));
  const legacyCustomerPayments = customerPayments
    .filter((payment) =>
      payment.source !== "deposit-refund-offset" &&
      !transactions.some((item) => item.source === "customer-payment" && Number(item.referenceId) === Number(payment.id))
    )
    .map((payment) => ({
      id: `legacy-payment-${payment.id}`,
      type: "income",
      title: "پرداخت بدهی مشتری",
      amount: number(payment.amount),
      date: payment.date,
      description: payment.description,
      source: "customer-payment",
      category: "customer",
      referenceId: payment.id,
      customerIndex: payment.customerIndex,
    }));
  const legacyTravelExpenses = travelExpenses
    .filter((expense) =>
      !transactions.some((item) => item.source === "travel-expense" && Number(item.referenceId) === Number(expense.id))
    )
    .map((expense) => ({
      id: `legacy-travel-expense-${expense.id}`,
      type: "expense",
      title: `مصرف سفر ${expense.travelName || ""}: ${expense.title || ""}`,
      amount: number(expense.amount),
      date: expense.date,
      description: expense.description,
      source: "travel-expense",
      category: expense.category || "other",
      referenceId: expense.id,
      travelIndex: expense.travelIndex,
    }));
  const legacyCarExpenses = carRepairs
    .filter((expense) =>
      expense.source !== "travel-expense" &&
      !transactions.some((item) =>
        ["car-expense", "car-repair"].includes(item.source) &&
        Number(item.referenceId) === Number(expense.id)
      )
    )
    .map((expense) => ({
      id: `legacy-car-expense-${expense.id}`,
      type: "expense",
      title: `مصرف موتر ${expense.carPlate || ""}: ${expense.title || ""}`,
      amount: number(expense.amount),
      date: expense.date,
      description: expense.description,
      source: "car-expense",
      category: expense.category === "repair" ? "repair" : "other",
      referenceId: expense.id,
      carId: expense.carId,
    }));

  return [...transactions, ...legacyTravelPayments, ...legacyCustomerPayments, ...legacyTravelExpenses, ...legacyCarExpenses].map((transaction) => ({
    ...transaction,
    amount: number(transaction.amount),
    category: getTransactionCategory(transaction, travelExpenses),
  }));
}

export const summarizeTransactions = (items) => {
  const income = items.filter((item) => item.type === "income").reduce((sum, item) => sum + number(item.amount), 0);
  const expense = items.filter((item) => item.type === "expense").reduce((sum, item) => sum + number(item.amount), 0);
  const net = income - expense;
  return { income, expense, net, margin: income > 0 ? (net / income) * 100 : 0 };
};
