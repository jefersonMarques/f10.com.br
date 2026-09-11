/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js,svelte,ts}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        md: "2rem",
        lg: "4rem",
        xl: "4rem",
        "2xl": "4rem"
      },
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1440px"
      }
    },
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
        manrope: ['"Manrope"', "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        primary: "#EA6D0B",
        secondary: "#EA6D0B",
        text: "#000A57",
        dark: "#010D28",
        card: "#F0F0F0",
        detail: "#EA6D0B",
        app: {
          bg: "var(--app-bg)",
          surface: "var(--app-surface)",
          subtle: "var(--app-surface-subtle)",
          muted: "var(--app-surface-muted)",
          selected: "var(--app-surface-selected)",
          border: "var(--app-border)",
          "border-soft": "var(--app-border-soft)",
          "border-control": "var(--app-border-control)",
          text: "var(--app-text)",
          "text-muted": "var(--app-text-muted)",
          "text-soft": "var(--app-text-soft)",
          primary: "var(--app-primary)",
          "primary-hover": "var(--app-primary-hover)",
          accent: "var(--app-accent)",
          overlay: "rgb(1 13 40 / <alpha-value>)",
          "success-bg": "var(--app-success-bg)",
          "success-surface": "var(--app-success-surface)",
          "success-border": "var(--app-success-border)",
          "success-text": "var(--app-success-text)",
          "warning-bg": "var(--app-warning-bg)",
          "warning-surface": "var(--app-warning-surface)",
          "warning-border": "var(--app-warning-border)",
          "warning-text": "var(--app-warning-text)",
          "danger-bg": "var(--app-danger-bg)",
          "danger-border": "var(--app-danger-border)",
          "danger-text": "var(--app-danger-text)",
          "info-bg": "var(--app-info-bg)",
          "info-border": "var(--app-info-border)",
          "info-text": "var(--app-info-text)"
        }
      }
    }
  },
  plugins: [require("@tailwindcss/typography")]
};
