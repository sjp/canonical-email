// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/preact";
import { useMediaQuery, useTheme } from "./useTheme";

type Listener = () => void;

// A controllable stand-in for window.matchMedia.
const mockMatchMedia = (initial: boolean, { legacy = false } = {}) => {
  let matches = initial;
  const listeners = new Set<Listener>();
  const mql = {
    get matches() {
      return matches;
    },
    addEventListener: vi.fn((_: string, l: Listener) => listeners.add(l)),
    removeEventListener: vi.fn((_: string, l: Listener) => listeners.delete(l)),
    addListener: legacy ? vi.fn((l: Listener) => listeners.add(l)) : undefined,
    removeListener: legacy ? vi.fn((l: Listener) => listeners.delete(l)) : undefined,
  };
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => mql),
  );
  return {
    mql,
    listeners,
    async set(value: boolean) {
      matches = value;
      await act(() => {
        listeners.forEach((l) => l());
      });
    },
  };
};

afterEach(() => {
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.theme;
});

describe("useMediaQuery", () => {
  it("reflects the current match state", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery("(prefers-color-scheme: dark)"));
    expect(result.current).toBe(true);
  });

  it("updates when the media query changes", async () => {
    const media = mockMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery("(min-width: 1px)"));
    expect(result.current).toBe(false);

    await media.set(true);
    expect(result.current).toBe(true);
  });

  it("uses addEventListener/removeEventListener when available", () => {
    const { mql, listeners } = mockMatchMedia(false);
    const { unmount } = renderHook(() => useMediaQuery("(min-width: 1px)"));
    expect(mql.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    expect(listeners.size).toBe(1);

    unmount();
    expect(mql.removeEventListener).toHaveBeenCalled();
    expect(listeners.size).toBe(0);
  });

  it("falls back to the legacy addListener/removeListener API", () => {
    const { mql, listeners } = mockMatchMedia(false, { legacy: true });
    const { unmount } = renderHook(() => useMediaQuery("(min-width: 1px)"));
    expect(mql.addListener).toHaveBeenCalled();
    expect(mql.addEventListener).not.toHaveBeenCalled();
    expect(listeners.size).toBe(1);

    unmount();
    expect(mql.removeListener).toHaveBeenCalled();
    expect(mql.removeEventListener).not.toHaveBeenCalled();
    expect(listeners.size).toBe(0);
  });

  it("starts from defaultValue when initializeWithValue is false, then syncs", () => {
    mockMatchMedia(true);
    const seen: boolean[] = [];
    renderHook(() => {
      const value = useMediaQuery("(min-width: 1px)", {
        defaultValue: false,
        initializeWithValue: false,
      });
      seen.push(value);
      return value;
    });
    expect(seen[0]).toBe(false);
    expect(seen.at(-1)).toBe(true);
  });
});

describe("useTheme", () => {
  beforeEach(() => {
    delete document.documentElement.dataset.theme;
  });

  it("follows the system preference", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
    expect(result.current.systemTheme).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("tracks live system changes until the user overrides", async () => {
    const media = mockMatchMedia(false);
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");

    await media.set(true);
    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("lets an explicit choice take precedence over the system preference", async () => {
    const media = mockMatchMedia(false);
    const { result } = renderHook(() => useTheme());

    await act(() => {
      result.current.setTheme("dark");
    });
    expect(result.current.theme).toBe("dark");
    expect(result.current.systemTheme).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("dark");

    // A later OS change no longer affects the chosen theme.
    await media.set(false);
    expect(result.current.theme).toBe("dark");
  });
});
