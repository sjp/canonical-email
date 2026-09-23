// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/preact";
import { useMXRecords } from "./useMXRecords";

const MX = 15;
const CNAME = 5;

const dnsResponse = (body: object, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, ...init });

const mxAnswer = (data: string, type = MX) => ({ name: "x.", type, TTL: 300, data });

// The hook caches by domain at module level, so each test uses its own domain.
let counter = 0;
const uniqueDomain = () => `test-${++counter}.example`;

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useMXRecords", () => {
  it("does nothing for an empty domain", () => {
    const { result } = renderHook(() => useMXRecords(""));
    expect(result.current).toEqual({ mxRecords: [], loading: false, error: "" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("queries Google DNS with the encoded domain", async () => {
    fetchMock.mockResolvedValue(dnsResponse({ Status: 0, Answer: [] }));
    renderHook(() => useMXRecords("exämple.com"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://dns.google/resolve?name=ex%C3%A4mple.com&type=MX",
    );
  });

  it("returns the exchange hosts from MX answers, ignoring other record types", async () => {
    fetchMock.mockResolvedValue(
      dnsResponse({
        Status: 0,
        Answer: [
          mxAnswer("alias.example.", CNAME),
          mxAnswer("10 mx1.example.net."),
          mxAnswer("20 mx2.example.net."),
        ],
      }),
    );
    const domain = uniqueDomain();
    const { result } = renderHook(() => useMXRecords(domain));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.mxRecords).toEqual(["mx1.example.net.", "mx2.example.net."]);
    expect(result.current.error).toBe("");
  });

  it("reports when a domain has no MX records", async () => {
    fetchMock.mockResolvedValue(dnsResponse({ Status: 0 }));
    const domain = uniqueDomain();
    const { result } = renderHook(() => useMXRecords(domain));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("No mailserver records found for this domain");
    expect(result.current.mxRecords).toEqual([]);
  });

  it("reports a non-OK HTTP response", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 500 }));
    const domain = uniqueDomain();
    const { result } = renderHook(() => useMXRecords(domain));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Failed to fetch mailserver records");
  });

  it("reports a failed DNS query status", async () => {
    fetchMock.mockResolvedValue(dnsResponse({ Status: 3 }));
    const domain = uniqueDomain();
    const { result } = renderHook(() => useMXRecords(domain));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("DNS query failed");
  });

  it("uses a generic message for non-Error rejections", async () => {
    fetchMock.mockRejectedValue("boom");
    const domain = uniqueDomain();
    const { result } = renderHook(() => useMXRecords(domain));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("An error occurred");
  });

  it("serves definitive results from the cache", async () => {
    const domain = uniqueDomain();
    fetchMock.mockResolvedValue(dnsResponse({ Status: 0, Answer: [mxAnswer("10 mx.a.")] }));

    const first = renderHook(() => useMXRecords(domain));
    await waitFor(() => expect(first.result.current.mxRecords).toEqual(["mx.a."]));
    first.unmount();

    const second = renderHook(() => useMXRecords(domain));
    expect(second.result.current).toEqual({ mxRecords: ["mx.a."], loading: false, error: "" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("caches the 'no records' outcome too", async () => {
    const domain = uniqueDomain();
    fetchMock.mockResolvedValue(dnsResponse({ Status: 0 }));

    const first = renderHook(() => useMXRecords(domain));
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    first.unmount();

    const second = renderHook(() => useMXRecords(domain));
    expect(second.result.current.error).toBe("No mailserver records found for this domain");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not cache transient failures, so the domain can be retried", async () => {
    const domain = uniqueDomain();
    fetchMock.mockRejectedValueOnce(new Error("offline"));

    const first = renderHook(() => useMXRecords(domain));
    await waitFor(() => expect(first.result.current.error).toBe("offline"));
    first.unmount();

    fetchMock.mockResolvedValue(dnsResponse({ Status: 0, Answer: [mxAnswer("10 mx.b.")] }));
    const second = renderHook(() => useMXRecords(domain));
    await waitFor(() => expect(second.result.current.mxRecords).toEqual(["mx.b."]));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("clears state when the domain becomes empty", async () => {
    fetchMock.mockResolvedValue(dnsResponse({ Status: 0, Answer: [mxAnswer("10 mx.c.")] }));
    const { result, rerender } = renderHook(({ domain }) => useMXRecords(domain), {
      initialProps: { domain: uniqueDomain() },
    });
    await waitFor(() => expect(result.current.mxRecords).toEqual(["mx.c."]));

    rerender({ domain: "" });
    expect(result.current).toEqual({ mxRecords: [], loading: false, error: "" });
  });

  it("aborts and ignores a stale in-flight request when the domain changes", async () => {
    let resolveStale!: (r: Response) => void;
    let staleSignal: AbortSignal | undefined;
    fetchMock.mockImplementationOnce((_url: string, init: RequestInit) => {
      staleSignal = init.signal ?? undefined;
      return new Promise<Response>((resolve) => {
        resolveStale = resolve;
      });
    });
    fetchMock.mockResolvedValueOnce(
      dnsResponse({ Status: 0, Answer: [mxAnswer("10 fresh.example.")] }),
    );

    const { result, rerender } = renderHook(({ domain }) => useMXRecords(domain), {
      initialProps: { domain: uniqueDomain() },
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    rerender({ domain: uniqueDomain() });
    expect(staleSignal?.aborted).toBe(true);
    await waitFor(() => expect(result.current.mxRecords).toEqual(["fresh.example."]));

    // The stale response arriving late must not overwrite the fresh result.
    resolveStale(dnsResponse({ Status: 0, Answer: [mxAnswer("10 stale.example.")] }));
    await new Promise((r) => setTimeout(r, 0));
    expect(result.current.mxRecords).toEqual(["fresh.example."]);
  });

  it("ignores a stale failure when the domain changes", async () => {
    let rejectStale!: (e: unknown) => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise<Response>((_, reject) => {
          rejectStale = reject;
        }),
    );
    fetchMock.mockResolvedValueOnce(dnsResponse({ Status: 0, Answer: [mxAnswer("10 ok.")] }));

    const { result, rerender } = renderHook(({ domain }) => useMXRecords(domain), {
      initialProps: { domain: uniqueDomain() },
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    rerender({ domain: uniqueDomain() });
    await waitFor(() => expect(result.current.mxRecords).toEqual(["ok."]));

    rejectStale(new Error("stale failure"));
    await new Promise((r) => setTimeout(r, 0));
    expect(result.current.error).toBe("");
  });

  it("ignores a stale 'no records' result when the domain changes", async () => {
    let resolveStale!: (r: Response) => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveStale = resolve;
        }),
    );
    fetchMock.mockResolvedValueOnce(dnsResponse({ Status: 0, Answer: [mxAnswer("10 ok.")] }));

    const { result, rerender } = renderHook(({ domain }) => useMXRecords(domain), {
      initialProps: { domain: uniqueDomain() },
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    rerender({ domain: uniqueDomain() });
    await waitFor(() => expect(result.current.mxRecords).toEqual(["ok."]));

    resolveStale(dnsResponse({ Status: 0 }));
    await new Promise((r) => setTimeout(r, 0));
    expect(result.current.error).toBe("");
    expect(result.current.mxRecords).toEqual(["ok."]);
  });
});
