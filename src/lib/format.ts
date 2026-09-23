export function money(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  return `${sign}S$${Math.abs(amount).toFixed(2)}`;
}

/** Same visual weight as a real balance, none of the digits — for the Home-screen mask toggle. */
export function maskedMoney(): string {
  return 'S$••••••';
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
