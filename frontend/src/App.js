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
          width: "10px",
          height: "10px",
        },
        "&::-webkit-scrollbar-track": {
          backgroundColor: "transparent",
        },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: "rgba(107, 114, 128, 0.26)",
          border: "2px solid transparent",
          borderRadius: 999,
          backgroundClip: "padding-box",
        },
      },
      palette: {
        primary: {
          main: "#C62828",
          dark: "#B71C1C",
          light: "#E53935",
          contrastText: "#FFFFFF",
        },
        secondary: {
          main: "#E53935",
          dark: "#C62828",
          light: "#FDECEC",
          contrastText: "#FFFFFF",
        },
        error: {
          main: "#D32F2F",
        },
        warning: {
          main: "#ED6C02",
        },
        success: {
          main: "#2E7D32",
        },
        background: {
          default: "#F5F6F8",
          paper: "#FFFFFF",
        },
        text: {
          primary: "#1F2937",
          secondary: "#6B7280",
        },
        divider: "rgba(15, 23, 42, 0.10)",
      },
      shape: {
        borderRadius: 12,
      },
      typography: {
        fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
        h6: {
          fontWeight: 700,
          letterSpacing: 0.1,
        },
        subtitle1: {
          fontWeight: 600,
        },
        button: {
          fontWeight: 600,
          textTransform: "none",
        },
      },
      overrides: {
        MuiCssBaseline: {
          "@global": {
            html: {
              backgroundColor: "#F5F6F8",
            },
            body: {
              backgroundColor: "#F5F6F8",
              color: "#1F2937",
            },
            "#root": {
              minHeight: "100%",
            },
          },
        },
        MuiButton: {
          root: {
            borderRadius: 12,
            boxShadow: "none",
            padding: "8px 16px",
          },
          containedPrimary: {
            boxShadow: "0 8px 24px rgba(198, 40, 40, 0.18)",
            "&:hover": {
              backgroundColor: "#B71C1C",
              boxShadow: "0 10px 26px rgba(183, 28, 28, 0.22)",
            },
          },
          outlined: {
            borderColor: "rgba(15, 23, 42, 0.12)",
          },
        },
        MuiPaper: {
          rounded: {
            borderRadius: 12,
          },
          outlined: {
            borderColor: "rgba(15, 23, 42, 0.10)",
          },
          elevation1: {
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
          },
        },
        MuiCard: {
          root: {
            borderRadius: 12,
            border: "1px solid rgba(15, 23, 42, 0.10)",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
          },
        },
        MuiTableCell: {
          root: {
            borderBottom: "1px solid rgba(15, 23, 42, 0.10)",
          },
          head: {
            color: "#6B7280",
            fontWeight: 700,
          },
        },
        MuiOutlinedInput: {
          root: {
            borderRadius: 12,
            backgroundColor: "#FFFFFF",
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "rgba(15, 23, 42, 0.16)",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "#C62828",
            },
          },
          notchedOutline: {
            borderColor: "rgba(15, 23, 42, 0.10)",
          },
          input: {
            paddingTop: 12,
            paddingBottom: 12,
          },
        },
        MuiInputBase: {
          root: {
            color: "#1F2937",
          },
        },
        MuiFormLabel: {
          root: {
            color: "#6B7280",
            "&.Mui-focused": {
              color: "#C62828",
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
