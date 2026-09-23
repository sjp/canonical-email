// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";

// main.tsx hydrates as a side effect of being imported, so the DOM it mounts
// into must exist before the (hoisted) import below runs.
vi.hoisted(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
  document.body.innerHTML = '<div id="app"></div>';
});

import "./main";

describe("client entry", () => {
  it("mounts the app into #app in the browser", () => {
    expect(document.getElementById("app")?.textContent).toContain("Find your canonical email");
  });
});
