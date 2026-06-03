import { describe, it, expect } from "vite-plus/test";
import { getMailboxProviderByDomain } from "./mailboxes";

describe("getMailboxProviderByDomain", () => {
  it("matches a real MX host via its provider suffix", () => {
    expect(getMailboxProviderByDomain("aspmx.l.google.com.")?.name).toBe("Google");
    expect(getMailboxProviderByDomain("mta5.am0.yahoodns.net.")?.name).toBe("Yahoo");
    expect(getMailboxProviderByDomain("mx01.mail.icloud.com.")?.name).toBe("Apple");
  });

  it("matches an exact mxDomain entry", () => {
    expect(getMailboxProviderByDomain("mail.com.")?.name).toBe("Mail.com");
  });

  it("is case-insensitive", () => {
    expect(getMailboxProviderByDomain("ASPMX.L.GOOGLE.COM.")?.name).toBe("Google");
  });

  it("returns null for an unrelated domain", () => {
    expect(getMailboxProviderByDomain("mail.example.com.")).toBeNull();
  });

  it("does not match a look-alike domain that lacks the dot boundary", () => {
    // "notgoogle.com." must NOT be treated as a Google host
    expect(getMailboxProviderByDomain("notgoogle.com.")).toBeNull();
  });

  it("matches providers with multiple front-door MX domains", () => {
    expect(getMailboxProviderByDomain("alt1.gmail-smtp-in.l.googlemail.com.")?.name).toBe("Google");
  });
});
