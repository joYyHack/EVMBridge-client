export function truncate(str: string, n: number) {
  return str.length > n
    ? str.substring(0, n - 1) +
        "..." +
        str.substring(str.length - 4, str.length)
    : str;
}
