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
        borderRadius: 6,
      },
      typography: {
        fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
        h6: {
          fontSize: "1.125rem",
          fontWeight: 700,
          lineHeight: 1.25,
          letterSpacing: 0.1,
        },
        subtitle1: {
          fontWeight: 600,
        },
        body1: {
          fontSize: "0.9375rem",
          fontWeight: 300,
          lineHeight: 1.6,
          color: "#111111",
        },
        body2: {
          fontSize: "0.9375rem",
          fontWeight: 300,
          lineHeight: 1.6,
          color: "#111111",
        },
        button: {
          fontWeight: 500,
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
            borderRadius: 6,
            boxShadow: "none",
            padding: "8px 16px",
          },
          containedPrimary: {
            boxShadow: "none",
            "&:hover": {
              backgroundColor: "#B71C1C",
              boxShadow: "none",
            },
          },
          containedSecondary: {
            boxShadow: "none",
            "&:hover": {
              backgroundColor: "#C62828",
              boxShadow: "none",
            },
          },
          outlined: {
            borderColor: "rgba(15, 23, 42, 0.12)",
          },
        },
        MuiPaper: {
          rounded: {
            borderRadius: 10,
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
            borderRadius: 10,
            border: "1px solid rgba(15, 23, 42, 0.10)",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
          },
        },
        MuiDialog: {
          paper: {
            borderRadius: 12,
          },
        },
        MuiTabs: {
          indicator: {
            display: "none",
          },
        },
        MuiTab: {
          root: {
            color: "#6B7280",
            fontWeight: 700,
            textTransform: "none",
            "&$selected": {
              color: "#111111",
            },
          },
          selected: {},
        },
        MuiTableCell: {
          root: {
            borderBottom: "1px solid rgba(15, 23, 42, 0.10)",
          },
          head: {
            color: "#111111",
            fontWeight: 700,
          },
        },
        MuiOutlinedInput: {
          root: {
            borderRadius: 8,
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
            fontWeight: 300,
          },
        },
        MuiTypography: {
          body1: {
            fontWeight: 300,
            fontSize: "0.9375rem",
            lineHeight: 1.6,
            color: "#111111",
          },
          body2: {
            fontWeight: 300,
            fontSize: "0.9375rem",
            lineHeight: 1.6,
            color: "#111111",
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
        MuiSwitch: {
          switchBase: {
            color: "rgba(15, 23, 42, 0.28)",
            "&$checked": {
              color: "#FF1919",
              "& + $track": {
                backgroundColor: "rgba(255, 25, 25, 0.42)",
                opacity: 1,
              },
            },
          },
          colorPrimary: {
            "&$checked": {
              color: "#FF1919",
              "& + $track": {
                backgroundColor: "rgba(255, 25, 25, 0.42)",
                opacity: 1,
              },
            },
          },
          checked: {},
          track: {
            backgroundColor: "rgba(15, 23, 42, 0.18)",
            opacity: 1,
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
