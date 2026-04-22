import React, { useState, useEffect } from "react";
import Routes from "./routes";
import "react-toastify/dist/ReactToastify.css";
import "./styles/chatwoot.css";

import { createTheme, ThemeProvider } from "@material-ui/core/styles";
import { ptBR } from "@material-ui/core/locale";

const App = () => {
  const [locale, setLocale] = useState();

  const theme = createTheme(
    {
      scrollbarStyles: {
        "&::-webkit-scrollbar": {
          width: "8px",
          height: "8px",
        },
        "&::-webkit-scrollbar-thumb": {
          boxShadow: "inset 0 0 6px rgba(15, 23, 42, 0.2)",
          backgroundColor: "#e2e8f0",
        },
      },
      palette: {
        primary: { main: "#3b82f6" },
        background: {
          default: "#f8fafc",
          paper: "#ffffff",
        },
        text: {
          primary: "#0f172a",
          secondary: "#64748b",
        },
      },
      typography: {
        fontFamily: '"Manrope", "Segoe UI", sans-serif',
      },
      overrides: {
        MuiCssBaseline: {
          "@global": {
            body: {
              backgroundColor: "#f8fafc",
            },
          },
        },
      },
    },
    locale
  );

  useEffect(() => {
    const i18nlocale = localStorage.getItem("i18nextLng");
    const browserLocale =
      i18nlocale.substring(0, 2) + i18nlocale.substring(3, 5);

    if (browserLocale === "ptBR") {
      setLocale(ptBR);
    }
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <Routes />
    </ThemeProvider>
  );
};

export default App;
