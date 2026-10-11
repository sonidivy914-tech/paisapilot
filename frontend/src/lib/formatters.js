/**
 * Formats a number with Indian currency grouping (₹).
 * Example: 100000 -> ₹1,00,000
 */
export function formatINR(amount, includeDecimals = false) {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  
  const num = Number(amount);
  const sign = num < 0 ? '-' : '';
  const absNum = Math.abs(num);

  const [intPart, decPart] = absNum.toFixed(2).split('.');

  let formattedInt = intPart;
  if (intPart.length > 3) {
    const lastThree = intPart.slice(-3);
    const otherDigits = intPart.slice(0, -3);
    formattedInt = otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }

  if (includeDecimals && decPart !== '00') {
    return `${sign}₹${formattedInt}.${decPart}`;
  }
  return `${sign}₹${formattedInt}`;
}

/**
 * Formats a date string (YYYY-MM-DD) into readable Indian format.
 * Example: '2026-09-01' -> '01 Sep 2026'
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

