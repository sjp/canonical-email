// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/preact";
import { App } from "./App";

const mxResponse = (...hosts: string[]) =>
  new Response(
    JSON.stringify({
      Status: 0,
      Answer: hosts.map((h, i) => ({ name: "x.", type: 15, TTL: 300, data: `${i} ${h}` })),
    }),
  );

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// Types an address and lets the debounce fire.
const typeEmail = async (value: string) => {
  fireEvent.input(screen.getByLabelText("Email Address"), { target: { value } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });
};

describe("App", () => {
  it("renders the empty form without querying DNS", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Find your canonical email" })).toBeTruthy();
    expect(screen.queryByText("Canonical Email", { selector: "h3" })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not query DNS until the debounce delay has passed", async () => {
    fetchMock.mockResolvedValue(mxResponse("aspmx.l.google.com."));
    render(<App />);
    fireEvent.input(screen.getByLabelText("Email Address"), {
      target: { value: "a@gmail.com" },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(299);
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the canonical form for a provider with addressing rules", async () => {
    fetchMock.mockResolvedValue(mxResponse("aspmx.l.google.com."));
    render(<App />);
    await typeEmail("  John.Doe+news@gmail.com  ");

    await vi.waitFor(() => expect(screen.getByText("johndoe@gmail.com")).toBeTruthy());
    expect(fetchMock.mock.calls[0][0]).toContain("name=gmail.com");
    expect(screen.getByText(/normalized form of your email address/)).toBeTruthy();
  });

  it("says when the address is already canonical", async () => {
    fetchMock.mockResolvedValue(mxResponse("mx01.mail.icloud.com."));
    render(<App />);
    await typeEmail("jane@icloud.com");

    await vi.waitFor(() => expect(screen.getByText("jane@icloud.com")).toBeTruthy());
    expect(screen.getByText("Your email is already in canonical form.")).toBeTruthy();
  });

  it("shows a loading indicator while the lookup is in flight", async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    render(<App />);
    await typeEmail("someone@loading.example");

    expect(screen.getByText(/Querying for your mail provider/)).toBeTruthy();
    expect(screen.getByLabelText("Email Address").getAttribute("aria-busy")).toBe("true");
  });

  it("shows lookup errors and marks the input invalid", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ Status: 0 })));
    render(<App />);
    await typeEmail("someone@no-mx.example");

    await vi.waitFor(() =>
      expect(screen.getByText("No mailserver records found for this domain")).toBeTruthy(),
    );
    expect(screen.getByLabelText("Email Address").getAttribute("aria-invalid")).toBe("true");
  });

  it("toggles between light and dark themes", () => {
    render(<App />);
    const button = screen.getByRole("button");
    expect(button.textContent).toContain("Dark");
    expect(document.documentElement.dataset.theme).toBe("light");

    fireEvent.click(button);
    expect(button.textContent).toContain("Light");
    expect(document.documentElement.dataset.theme).toBe("dark");

    fireEvent.click(button);
    expect(button.textContent).toContain("Dark");
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
