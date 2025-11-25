import { useState, useEffect } from "preact/hooks";

interface MXRecord {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

interface GoogleDNSResponse {
  Status: number;
  TC: boolean;
  RD: boolean;
  RA: boolean;
  AD: boolean;
  CD: boolean;
  Question: Array<{ name: string; type: number }>;
  Answer?: MXRecord[];
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
      return;
    }

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
          `https://dns.google/resolve?name=${encodeURIComponent(
            domain
          )}&type=MX`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch mailserver records");
        }

        const data: GoogleDNSResponse = await response.json();

        if (data.Status !== 0) {
          throw new Error("DNS query failed");
        }

        if (!data.Answer || data.Answer.length === 0) {
          const errorMsg = "No mailserver records found for this domain";
          setError(errorMsg);
          setMxRecords([]);
          cache.set(domain, { mxRecords: [], error: errorMsg });
        } else {
          const mailServers = data.Answer.map(
            (record) => record.data.split(" ")[1]
          );
          setMxRecords(mailServers);
          cache.set(domain, { mxRecords: mailServers, error: "" });
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "An error occurred";
        setError(errorMsg);
        setMxRecords([]);
        cache.set(domain, { mxRecords: [], error: errorMsg });
      } finally {
        setLoading(false);
      }
    };

    fetchMXRecords();
  }, [domain]);

  return { mxRecords, loading, error };
};
