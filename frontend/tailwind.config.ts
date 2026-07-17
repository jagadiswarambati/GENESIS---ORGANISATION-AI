import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        raised: "var(--shadow-raised)",
        floating: "var(--shadow-floating)",
        hover: "var(--shadow-hover)",
      },
      colors: {
        background: "hsl(var(--background))",
        surface: "hsl(var(--surface))",
        panel: "hsl(var(--panel))",
        border: "hsl(var(--border))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--text-muted))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        success: { DEFAULT: "hsl(var(--success))", foreground: "hsl(var(--success-foreground))" },
        warning: { DEFAULT: "hsl(var(--warning))", foreground: "hsl(var(--warning-foreground))" },
        danger: { DEFAULT: "hsl(var(--danger))", foreground: "hsl(var(--danger-foreground))" },
        info: { DEFAULT: "hsl(var(--info))", foreground: "hsl(var(--info-foreground))" },
        foreground: "hsl(var(--text-primary))",
        overlay: "hsl(var(--overlay))",
        focus: "hsl(var(--focus))",
        hover: "hsl(var(--hover))",
        glass: "hsl(var(--glass))",
        selection: "hsl(var(--selection))",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      fontSize: {
        display: [
          "var(--text-display)",
          {
            lineHeight: "var(--leading-display)",
            letterSpacing: "var(--tracking-display)",
            fontWeight: "650",
          },
        ],
        heading: [
          "var(--text-heading)",
          {
            lineHeight: "var(--leading-heading)",
            letterSpacing: "var(--tracking-heading)",
            fontWeight: "600",
          },
        ],
        title: [
          "var(--text-title)",
          {
            lineHeight: "var(--leading-title)",
            letterSpacing: "var(--tracking-title)",
            fontWeight: "600",
          },
        ],
        subtitle: [
          "var(--text-subtitle)",
          { lineHeight: "var(--leading-subtitle)", fontWeight: "500" },
        ],
        body: ["var(--text-body)", { lineHeight: "var(--leading-body)", fontWeight: "400" }],
        caption: [
          "var(--text-caption)",
          { lineHeight: "var(--leading-caption)", fontWeight: "400" },
        ],
        label: [
          "var(--text-label)",
          {
            lineHeight: "var(--leading-label)",
            letterSpacing: "var(--tracking-label)",
            fontWeight: "600",
          },
        ],
      },
      maxWidth: {
        content: "var(--container-content)",
        reading: "var(--container-reading)",
        workspace: "var(--container-workspace)",
      },
      transitionDuration: {
        fast: "var(--duration-fast)",
        normal: "var(--duration-normal)",
        slow: "var(--duration-slow)",
      },
      transitionTimingFunction: {
        standard: "var(--ease-standard)",
        enter: "var(--ease-enter)",
      },
      keyframes: {
        "gentle-pulse": { "0%, 100%": { opacity: "1" }, "50%": { opacity: ".55" } },
        "soft-spin": { to: { transform: "rotate(360deg)" } },
        breathe: { "0%, 100%": { transform: "scale(1)" }, "50%": { transform: "scale(1.02)" } },
      },
      animation: {
        "gentle-pulse": "gentle-pulse var(--duration-thinking) ease-in-out infinite",
        "soft-spin": "soft-spin var(--duration-slow) linear infinite",
        breathe: "breathe var(--duration-thinking) ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
