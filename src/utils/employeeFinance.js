export const employeeFullName = (employee) =>
  `${employee?.firstName || ""} ${employee?.lastName || ""}`.trim();

export const moneyNumber = (value) => Number(value || 0);

export function findEmployeeByName(employees, name) {
  return employees.find((employee) => employeeFullName(employee) === name);
}

export function travelCustomerTotal(customerTravels, travelIndex) {
  return customerTravels
    .filter((record) => Number(record.travelIndex) === Number(travelIndex))
    .reduce((sum, record) => sum + Math.max(moneyNumber(record.fare) - moneyNumber(record.discount), 0), 0);
}

export function calculateTravelCommission(employee, travelIndex, travels, customerTravels) {
  if (!employee || employee.salaryType !== "فیصدی") return 0;
  if (!["per_customer", "per_trip"].includes(employee.percentageBasis)) return 0;
  const percent = moneyNumber(employee.percentage);
  const travel = travels[Number(travelIndex)] || {};
  const customerTotal = travelCustomerTotal(customerTravels, travelIndex);
  const base = employee.percentageBasis === "per_customer"
    ? customerTotal
    : (customerTotal || moneyNumber(travel.fare));
  return (base * percent) / 100;
}

export function monthFromDate(value) {
  return value ? String(value).slice(0, 7) : "";
}

export function calculateMonthlyIncomeCommission(employee, month, transactions) {
  if (!employee || employee.salaryType !== "فیصدی" || employee.percentageBasis !== "monthly_income") return 0;
  const income = transactions
    .filter((transaction) => transaction.type === "income" && monthFromDate(transaction.date) === month)
    .reduce((sum, transaction) => sum + moneyNumber(transaction.amount), 0);
  return (income * moneyNumber(employee.percentage)) / 100;
}

export function employeeBalance(employeeId, earnings, payments) {
  const earned = earnings
    .filter((item) => String(item.employeeId) === String(employeeId))
    .reduce((sum, item) => sum + moneyNumber(item.amount), 0);
  const paid = payments
    .filter((item) => String(item.employeeId) === String(employeeId))
    .reduce((sum, item) => sum + moneyNumber(item.amount), 0);
  return { earned, paid, balance: earned - paid };
}
