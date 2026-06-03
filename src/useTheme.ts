import { useEffect, useLayoutEffect, useState } from "preact/hooks";

export type Theme = "light" | "dark";

type UseMediaQueryOptions = {
  defaultValue?: boolean;
  initializeWithValue?: boolean;
};

export function useMediaQuery(
  query: string,
  { defaultValue = false, initializeWithValue = true }: UseMediaQueryOptions = {},
): boolean {
  const getMatches = (query: string): boolean => {
    // Prevents SSR issues
    if (typeof window !== "undefined") {
      return window.matchMedia(query).matches;
    }
    return defaultValue;
  };

  const [matches, setMatches] = useState<boolean>(() => {
    if (initializeWithValue) {
      return getMatches(query);
    }
    return defaultValue;
  });

  // Handles the change event of the media query.
  const handleChange = () => {
    setMatches(getMatches(query));
  };

  useLayoutEffect(() => {
    const matchMedia = window.matchMedia(query);

    // Triggered at the first client-side load and if query changes
    handleChange();

    // Use deprecated `addListener` and `removeListener` to support Safari < 14
    if (matchMedia.addListener) {
      matchMedia.addListener(handleChange);
    } else {
      matchMedia.addEventListener("change", handleChange);
    }

    return () => {
      if (matchMedia.removeListener) {
        matchMedia.removeListener(handleChange);
      } else {
        matchMedia.removeEventListener("change", handleChange);
      }
    };
  }, [query]);

  return matches;
}

const useSystemDarkModePreference = (): Theme => {
  return useMediaQuery("(prefers-color-scheme: dark)") ? "dark" : "light";
};

export const useTheme = () => {
  const systemTheme = useSystemDarkModePreference();

  // Once the user explicitly picks a theme it takes precedence; until then we
  // follow the system preference (including live OS changes). The choice is
  // intentionally not persisted, so it resets to the system preference on reload.
  const [override, setOverride] = useState<Theme | null>(null);

  const theme = override ?? systemTheme;

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = theme;
    }
  }, [theme]);

  return {
    theme,
    systemTheme,
    setTheme: setOverride,
  };
};
