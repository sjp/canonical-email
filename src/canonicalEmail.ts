import { getMailboxProviderByDomain, type MailboxProvider } from "./mailboxes";

// Splits an address at its *last* "@" so a quoted local part containing "@"
// still yields the real domain. Returns null when there is no "@".
export const splitEmail = (email: string): { localPart: string; domain: string } | null => {
  const at = email.lastIndexOf("@");
  if (at === -1) {
    return null;
  }
  return { localPart: email.slice(0, at), domain: email.slice(at + 1) };
};

// Canonicalizes an email address based on the mail provider's addressing rules
export const getCanonicalEmail = (email: string, mailServers: string[]): string => {
  const parts = splitEmail(email);
  if (!parts) {
    return email;
  }
  const { localPart, domain } = parts;

  const provider = detectProviderFromMX(mailServers);
  if (!provider) {
    return email.toLowerCase();
  }

  return applyAddressingRules(localPart, domain, provider);
};

const detectProviderFromMX = (mxDomains: string[]): MailboxProvider | null => {
  for (const mxDomain of mxDomains) {
    const provider = getMailboxProviderByDomain(mxDomain);
    if (provider) {
      return provider;
    }
  }

  return null;
};

const applyAddressingRules = (
  localPart: string,
  domain: string,
  provider: MailboxProvider,
): string => {
  const rules = provider.addressingRules;
  const canonicalDomain = domain.toLowerCase();

  let canonical = localPart.toLowerCase();

  if (rules.plusAddressing) {
    canonical = canonical.split("+")[0];
  }

  if (rules.dashAddressing) {
    canonical = canonical.split("-")[0];
  }

  // Dot-insensitivity is a property of specific recipient domains (e.g. gmail.com),
  // not of the provider's whole MX infrastructure (e.g. Google Workspace domains).
  if (rules.stripDots?.includes(canonicalDomain)) {
    canonical = canonical.replaceAll(".", "");
  }

  return `${canonical}@${canonicalDomain}`;
};
