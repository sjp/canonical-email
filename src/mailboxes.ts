import { useState, useEffect } from "preact/hooks";

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

type MailboxProviderName =
  | "Apple"
  | "AOL"
  | "Fastmail"
  | "GMX"
  | "Google"
  | "Mail.com"
  | "Microsoft"
  | "Proton Mail"
  | "Rackspace"
  | "Yahoo"
  | "Yandex"
  | "Zoho";

type AddressingRules = {
  dashAddressing?: true;
  plusAddressing?: true;
  stripDots?: true;
  localPartAsHostName?: true;
};

export type MailboxProvider = {
  name: MailboxProviderName;
  addressingRules: AddressingRules;
  mxDomains: string[];
};

const AppleMailboxProvider: MailboxProvider = {
  name: "Apple",
  addressingRules: {
    plusAddressing: true,
  },
  mxDomains: ["icloud.com."],
};

const AOLMailboxProvider: MailboxProvider = {
  name: "AOL",
  addressingRules: {
    plusAddressing: true,
  },
  mxDomains: ["mx.aol.com.", "mailin.aol.com."],
};

const FastmailMailboxProvider: MailboxProvider = {
  name: "Fastmail",
  addressingRules: {
    plusAddressing: true,
  },
  mxDomains: ["messagingengine.com."],
};

const GoogleMailboxProvider: MailboxProvider = {
  name: "Google",
  addressingRules: {
    plusAddressing: true,
    stripDots: true,
  },
  mxDomains: ["google.com.", "googlemail.com."],
};

const GMXMailboxProvider: MailboxProvider = {
  name: "GMX",
  addressingRules: {
    plusAddressing: true,
  },
  mxDomains: ["gmx.com.", "gmx.net."],
};

const MailComMailboxProvider: MailboxProvider = {
  name: "Mail.com",
  addressingRules: {
    plusAddressing: true,
  },
  mxDomains: ["mail.com."],
};

const MicrosoftMailboxProvider: MailboxProvider = {
  name: "Microsoft",
  addressingRules: {
    plusAddressing: true,
  },
  mxDomains: ["outlook.com."],
};

const ProtonMailMailboxProvider: MailboxProvider = {
  name: "Proton Mail",
  addressingRules: {
    plusAddressing: true,
  },
  mxDomains: ["protonmail.ch."],
};

const RackspaceMailboxProvider: MailboxProvider = {
  name: "Rackspace",
  addressingRules: {
    plusAddressing: true,
  },
  mxDomains: ["emailsrvr.com."],
};

const YahooMailboxProvider: MailboxProvider = {
  name: "Yahoo",
  addressingRules: {
    dashAddressing: true,
  },
  mxDomains: ["yahoodns.net."],
};

const YandexMailboxProvider: MailboxProvider = {
  name: "Yandex",
  addressingRules: {
    plusAddressing: true,
  },
  mxDomains: ["mx.yandex.net.", "yandex.ru."],
};

const ZohoMailboxProvider: MailboxProvider = {
  name: "Zoho",
  addressingRules: {
    plusAddressing: true,
  },
  mxDomains: ["zoho.com."],
};

const MailboxProviders: MailboxProvider[] = [
  AOLMailboxProvider,
  AppleMailboxProvider,
  FastmailMailboxProvider,
  GMXMailboxProvider,
  GoogleMailboxProvider,
  MailComMailboxProvider,
  MicrosoftMailboxProvider,
  ProtonMailMailboxProvider,
  RackspaceMailboxProvider,
  YahooMailboxProvider,
  YandexMailboxProvider,
  ZohoMailboxProvider,
];

export const getMailboxProviderByDomain = (
  domain: string
): MailboxProvider | null => {
  const loweredDomain = domain.toLowerCase();
  const mailboxProvider = MailboxProviders.find(
    (provider) =>
      provider.mxDomains.includes(loweredDomain) ||
      provider.mxDomains.some((mxd) => loweredDomain.endsWith("." + mxd))
  );
  return mailboxProvider || null;
};
