/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js,svelte,ts}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",  // 16px (mobile)
        md: "2rem",       // 32px
        lg: "4rem",       // 64px  <- era 80px
        xl: "4rem",       // 64px
        "2xl": "4rem"     // 64px
      },
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1440px"   // trava no 1440
      }
    },
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
        manrope: ['"Manrope"', "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        primary: "#EA6D0B", // Botão cheio / detalhes
        secondary: "#EA6D0B", // (igual ao primary, como pediu)
        text: "#000A57", // Texto principal
        dark: "#010D28", // Azul escuro
        card: "#F0F0F0", // Card flutuante
        detail: "#EA6D0B"  // Alias de detalhes
      }
    },
  },
  plugins: [require("@tailwindcss/typography")]
};
