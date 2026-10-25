import daisyui from "daisyui";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    logs: false,
    themes: [
      {
        clinica: {
          primary: "#0f766e",
          "primary-content": "#ffffff",
          secondary: "#155e75",
          "secondary-content": "#ffffff",
          accent: "#64748b",
          "accent-content": "#ffffff",
          neutral: "#1f2937",
          "neutral-content": "#e5e7eb",
          "base-100": "#ffffff",
          "base-200": "#f1f5f9",
          "base-300": "#e2e8f0",
          "base-content": "#1f2937",
          info: "#0369a1",
          success: "#15803d",
          warning: "#b45309",
          error: "#b91c1c",
          "--rounded-box": "0.5rem",
          "--rounded-btn": "0.375rem",
          "--rounded-badge": "0.375rem",
        },
      },
    ],
  },
};
