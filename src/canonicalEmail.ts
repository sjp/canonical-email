import { getMailboxProviderByDomain, type MailboxProvider } from "./mailboxes";

// Canonicalizes an email address based on the mail provider's addressing rules
export const getCanonicalEmail = (email: string, mailServers: string[]): string => {
  if (!email || !email.includes("@")) {
    return email;
  }

  const [localPart, domain] = email.split("@");

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

  let canonical = localPart.toLowerCase();

  if (rules.plusAddressing) {
    canonical = canonical.split("+")[0];
  }

  if (rules.dashAddressing) {
    canonical = canonical.split("-")[0];
  }

  if (rules.stripDots) {
    canonical = canonical.replaceAll(".", "");
  }

  const canonicalDomain = domain.toLowerCase();

  return `${canonical}@${canonicalDomain}`;
};
