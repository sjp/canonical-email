// @vitest-environment node
import { describe, expect, it } from "vitest";
import { prerender } from "./main";

describe("prerender", () => {
  it("renders the app to static HTML", async () => {
    const { html } = await prerender({});
    expect(html).toContain("Find your canonical email");
    expect(html).toContain('id="email"');
  });
});
