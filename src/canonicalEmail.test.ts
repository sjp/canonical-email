import { describe, it, expect } from "vite-plus/test";
import { getCanonicalEmail } from "./canonicalEmail";

// MX host lists that resolve to a given provider (see getMailboxProviderByDomain).
const GOOGLE_MX = ["aspmx.l.google.com."];
const YAHOO_MX = ["mta5.am0.yahoodns.net."];
const APPLE_MX = ["mx01.mail.icloud.com."];
const UNKNOWN_MX = ["mail.example.com."];

describe("getCanonicalEmail", () => {
  describe("invalid / passthrough input", () => {
    it("returns input unchanged when empty", () => {
      expect(getCanonicalEmail("", GOOGLE_MX)).toBe("");
    });

    it("returns input unchanged when there is no @", () => {
      expect(getCanonicalEmail("not-an-email", GOOGLE_MX)).toBe("not-an-email");
    });
  });

  describe("unknown provider", () => {
    it("lowercases the whole address when no MX records match a provider", () => {
      expect(getCanonicalEmail("John.Doe+tag@Example.com", UNKNOWN_MX)).toBe(
        "john.doe+tag@example.com",
      );
    });

    it("lowercases when the MX list is empty", () => {
      expect(getCanonicalEmail("John.Doe@Example.com", [])).toBe("john.doe@example.com");
    });
  });

  describe("Google (plus addressing + strip dots)", () => {
    it("strips dots and plus tags", () => {
      expect(getCanonicalEmail("john.doe+newsletter@gmail.com", GOOGLE_MX)).toBe(
        "johndoe@gmail.com",
      );
    });

    it("lowercases the local part and domain", () => {
      expect(getCanonicalEmail("John.Doe@GMAIL.com", GOOGLE_MX)).toBe("johndoe@gmail.com");
    });

    it("applies the plus split before stripping dots", () => {
      // tag itself contains dots that must not survive
      expect(getCanonicalEmail("jane+a.b.c@gmail.com", GOOGLE_MX)).toBe("jane@gmail.com");
    });
  });

  describe("Yahoo (dash addressing)", () => {
    it("strips the dash tag", () => {
      expect(getCanonicalEmail("base-keyword@yahoo.com", YAHOO_MX)).toBe("base@yahoo.com");
    });

    it("does not strip dots (only Google strips dots)", () => {
      expect(getCanonicalEmail("first.last@yahoo.com", YAHOO_MX)).toBe("first.last@yahoo.com");
    });
  });

  describe("Apple iCloud (plus addressing, dots preserved)", () => {
    it("strips the plus tag but keeps dots", () => {
      expect(getCanonicalEmail("john.doe+tag@icloud.com", APPLE_MX)).toBe("john.doe@icloud.com");
    });
  });

  it("preserves an address that is already canonical", () => {
    expect(getCanonicalEmail("johndoe@gmail.com", GOOGLE_MX)).toBe("johndoe@gmail.com");
  });
});
