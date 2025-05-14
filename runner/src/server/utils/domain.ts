export function isAllowedDomain(
  email: string,
  allowedDomains: string[]
): boolean {
  if (!allowedDomains || allowedDomains.length === 0) {
    return true;
  }
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) {
    return false;
  }

  return allowedDomains.map((d) => d.toLowerCase()).includes(domain);
}
