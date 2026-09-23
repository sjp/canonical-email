// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("client entry", () => {
  it("mounts the app into #app in the browser", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    );
    document.body.innerHTML = '<div id="app"></div>';

    await import("./main");

    await vi.waitFor(() =>
      expect(document.getElementById("app")?.textContent).toContain("Find your canonical email"),
    );
  });
});
