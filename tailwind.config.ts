import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink:             "var(--color-ink)",
        "ink-secondary": "var(--color-ink-secondary)",
        action:          "var(--color-action)",
        accent:          "var(--color-accent)",
        tint:            "var(--color-tint)",
        surface:         "var(--color-surface)",
        base:            "var(--color-base)",
        "ui-border":     "var(--color-border)",
        muted:           "var(--color-muted)",
        success:         "var(--color-success)",
        warning:         "var(--color-warning)",
        "ui-error":      "var(--color-error)",
      },
      borderRadius: {
        card: "0.75rem",
        btn:  "0.375rem",
      },
      boxShadow: {
        card: "0 1px 3px rgba(15,23,42,0.08), 0 4px 16px rgba(15,23,42,0.04)",
      },
      fontFamily: {
        mono: ["var(--font-ibm-plex-mono)", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
