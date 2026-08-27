import { useState, useCallback } from "preact/hooks";
import "@picocss/pico";
import { useDebounce } from "./useDebounce";
import { useMXRecords } from "./useMXRecords";
import { getCanonicalEmail, splitEmail } from "./canonicalEmail";
import { useTheme } from "./useTheme";

const DEBOUNCE_DELAY_MS = 300;

export const App = () => {
  const [email, setEmail] = useState("");
  const { theme, setTheme } = useTheme();

  const debouncedEmail = useDebounce(email.trim(), DEBOUNCE_DELAY_MS);
  const domain = splitEmail(debouncedEmail)?.domain ?? "";

  const { mxRecords, loading, error } = useMXRecords(domain);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
  }, [theme]);

  // Use the debounced address so the MX records and the address being
  // canonicalized always belong to the same domain.
  const canonicalEmail = mxRecords.length > 0 ? getCanonicalEmail(debouncedEmail, mxRecords) : "";

  const onEmailChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const value = target.value;
    setEmail(value);
  };

  return (
    <main className="container">
      <nav>
        <ul>
          <li>
            <strong>Canonical Email</strong>
          </li>
        </ul>
        <ul>
          <li>
            <button onClick={toggleTheme} className="contrast">
              {theme === "light" ? "🌙 Dark" : "☀️ Light"}
            </button>
          </li>
        </ul>
      </nav>

      <article>
        <header>
          <h2>Find your canonical email</h2>
        </header>

        <label htmlFor="email">
          Email Address
          <input
            type="email"
            id="email"
            name="email"
            placeholder="user@example.com"
            value={email}
            onInput={onEmailChange}
            aria-invalid={error ? "true" : undefined}
            aria-busy={loading}
          />
        </label>

        {loading && <p aria-busy="true">Querying for your mail provider&hellip;</p>}

        {error && <p style={{ color: "var(--pico-color-red-500)" }}>{error}</p>}

        {canonicalEmail && (
          <div>
            <h3>Canonical Email</h3>
            <p>
              <strong>{canonicalEmail}</strong>
            </p>
            <small>
              {canonicalEmail !== debouncedEmail
                ? "This is the normalized form of your email address based on your mail provider's rules."
                : "Your email is already in canonical form."}
            </small>
          </div>
        )}
      </article>
    </main>
  );
};
