// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/preact";
import { useDebounce } from "./useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("a", 300));
    expect(result.current).toBe("a");
  });

  it("only updates after the delay has elapsed", async () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: "a" },
    });

    rerender({ value: "b" });
    await act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe("a");

    await act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("b");
  });

  it("restarts the timer on each change so only the last value lands", async () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: "a" },
    });

    rerender({ value: "b" });
    await act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender({ value: "c" });
    await act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe("a");

    await act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe("c");
  });

  it("clears the pending timer on unmount", () => {
    const { rerender, unmount } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: "a" },
    });
    rerender({ value: "b" });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
