import { useState, useEffect } from "preact/hooks";

interface DNSRecord {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

const DNS_TYPE_MX = 15;
const FETCH_TIMEOUT_MS = 10_000;

interface GoogleDNSResponse {
  Status: number;
  TC: boolean;
  RD: boolean;
  RA: boolean;
  AD: boolean;
  CD: boolean;
  Question: Array<{ name: string; type: number }>;
  Answer?: DNSRecord[];
}

interface MXRecordData {
  mxRecords: string[];
  loading: boolean;
  error: string;
}

interface CacheEntry {
  mxRecords: string[];
  error: string;
}

const cache = new Map<string, CacheEntry>();

export const useMXRecords = (domain: string): MXRecordData => {
  const [mxRecords, setMxRecords] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!domain) {
      setMxRecords([]);
      setError("");
      setLoading(false);
      return;
    }

    // Guards against stale responses: if `domain` changes while a request is
    // in flight, the cleanup sets this so the resolved request won't apply its
    // (now outdated) result to state.
    let ignore = false;

    const controller = new AbortController();

    // Check cache first
    const cachedEntry = cache.get(domain);
    if (cachedEntry) {
      setMxRecords(cachedEntry.mxRecords);
      setError(cachedEntry.error);
      setLoading(false);
      return;
    }

    const fetchMXRecords = async () => {
      setLoading(true);
      setError("");
      setMxRecords([]);

      try {
        const response = await fetch(
          `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`,
          { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(FETCH_TIMEOUT_MS)]) },
        );

        if (!response.ok) {
          throw new Error("Failed to fetch mailserver records");
        }

        const data: GoogleDNSResponse = await response.json();

        if (data.Status !== 0) {
          throw new Error("DNS query failed");
        }

        // The answer section may also carry CNAME records; keep only MX.
        const mxAnswers = (data.Answer ?? []).filter((record) => record.type === DNS_TYPE_MX);

        if (mxAnswers.length === 0) {
          const errorMsg = "No mailserver records found for this domain";
          cache.set(domain, { mxRecords: [], error: errorMsg });
          if (ignore) return;
          setError(errorMsg);
          setMxRecords([]);
        } else {
          // MX data is "<priority> <exchange>".
          const mailServers = mxAnswers.map((record) => record.data.split(" ")[1]);
          cache.set(domain, { mxRecords: mailServers, error: "" });
          if (ignore) return;
          setMxRecords(mailServers);
        }
      } catch (err) {
        // Transient failures (offline, timeout, 5xx, SERVFAIL, parse errors) are
        // deliberately NOT cached, so the domain can be retried once conditions
        // recover. Only definitive outcomes (records found / no records) above
        // are cached.
        const errorMsg = err instanceof Error ? err.message : "An error occurred";
        if (ignore) return;
        setError(errorMsg);
        setMxRecords([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    void fetchMXRecords();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [domain]);

  return { mxRecords, loading, error };
};
