import { createTheme } from "@material-ui/core/styles";

const createAppTheme = ({ darkMode = false, locale } = {}) => {
  const isDark = darkMode;
  const brandRed = "#FF1919";
  const brandRedSoft = isDark ? "rgba(255, 25, 25, 0.16)" : "rgba(255, 25, 25, 0.08)";
  const brandRedGlow = "rgba(255, 25, 25, 0.10)";

  const palette = {
    type: isDark ? "dark" : "light",
    primary: {
      main: brandRed,
      dark: brandRed,
      light: brandRed,
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: brandRed,
      dark: brandRed,
      light: brandRedSoft,
      contrastText: "#FFFFFF",
    },
    error: {
      main: brandRed,
    },
    warning: {
      main: isDark ? "#F4B740" : "#ED6C02",
    },
    success: {
      main: isDark ? "#58D68D" : "#2E7D32",
    },
    background: {
      default: isDark ? "#0B1220" : "#F5F6F8",
      paper: isDark ? "#121A2B" : "#FFFFFF",
    },
    text: {
      primary: isDark ? "#F3F6FC" : "#1F2937",
      secondary: isDark ? "#A6B2C8" : "#6B7280",
    },
    divider: isDark ? "rgba(148, 163, 184, 0.18)" : "rgba(15, 23, 42, 0.10)",
    action: {
      active: isDark ? "#F3F6FC" : "#111111",
      hover: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(15, 23, 42, 0.04)",
      selected: brandRedSoft,
      disabledBackground: "rgba(255, 25, 25, 0.18)",
      disabled: isDark ? "rgba(243, 246, 252, 0.65)" : "rgba(255, 255, 255, 0.72)",
    },
  };

  const custom = {
    scrollbarThumb: isDark ? "rgba(148, 163, 184, 0.26)" : "rgba(107, 114, 128, 0.26)",
    scrollbarThumbHover: isDark ? "rgba(148, 163, 184, 0.4)" : "rgba(107, 114, 128, 0.4)",
    panelBorder: isDark ? "rgba(148, 163, 184, 0.18)" : "rgba(15, 23, 42, 0.08)",
    panelBorderStrong: isDark ? "rgba(148, 163, 184, 0.26)" : "rgba(15, 23, 42, 0.16)",
    pageGradient: isDark
      ? `radial-gradient(circle at top right, ${brandRedGlow}, transparent 28%), linear-gradient(180deg, #101827 0%, #0B1220 58%, #0A1020 100%)`
      : "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    panelGradient: isDark
      ? "linear-gradient(180deg, rgba(21, 30, 48, 0.98) 0%, rgba(11, 18, 32, 0.98) 100%)"
      : "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    panelGradientSoft: isDark
      ? "linear-gradient(180deg, rgba(18, 26, 43, 1) 0%, rgba(12, 19, 33, 1) 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(250,251,252,0.96) 100%)",
    inputBackground: isDark ? "#0F172A" : "#FFFFFF",
    softBackground: isDark ? "rgba(148, 163, 184, 0.10)" : "rgba(15, 23, 42, 0.06)",
    mutedBackground: isDark ? "rgba(148, 163, 184, 0.08)" : "#F3F4F6",
    tableHover: isDark ? "rgba(56, 189, 248, 0.12)" : "rgba(14, 165, 233, 0.06)",
    iconButtonBackground: isDark ? "rgba(148, 163, 184, 0.12)" : "rgba(15, 23, 42, 0.06)",
    iconButtonBackgroundHover: isDark ? "rgba(148, 163, 184, 0.18)" : "rgba(15, 23, 42, 0.10)",
    neutralButtonBackground: isDark ? "rgba(148, 163, 184, 0.12)" : "#F3F4F6",
    neutralButtonBackgroundHover: isDark ? "rgba(148, 163, 184, 0.18)" : "#E5E7EB",
    neutralButtonText: isDark ? "#E5EDF9" : "#111827",
    dangerSoft: brandRedSoft,
  };

  return createTheme(
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
          backgroundColor: custom.scrollbarThumb,
          border: "2px solid transparent",
          borderRadius: 999,
          backgroundClip: "padding-box",
        },
      },
      palette,
      custom,
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
          fontWeight: 400,
          lineHeight: 1.6,
          color: palette.text.primary,
        },
        body2: {
          fontSize: "0.9375rem",
          fontWeight: 400,
          lineHeight: 1.6,
          color: palette.text.primary,
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
              backgroundColor: palette.background.default,
            },
            body: {
              backgroundColor: palette.background.default,
              color: palette.text.primary,
            },
            "#root": {
              minHeight: "100%",
            },
            "::selection": {
              backgroundColor: custom.dangerSoft,
              color: palette.text.primary,
            },
            "*::-webkit-scrollbar-thumb": {
              background: custom.scrollbarThumb,
              border: "2px solid transparent",
              borderRadius: 999,
              backgroundClip: "padding-box",
            },
            "*::-webkit-scrollbar-thumb:hover": {
              background: custom.scrollbarThumbHover,
              border: "2px solid transparent",
              backgroundClip: "padding-box",
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
              backgroundColor: palette.primary.dark,
              boxShadow: "none",
            },
          },
          containedSecondary: {
            boxShadow: "none",
            "&:hover": {
              backgroundColor: palette.secondary.dark,
              boxShadow: "none",
            },
          },
          outlined: {
            borderColor: custom.panelBorderStrong,
          },
        },
        MuiPaper: {
          root: {
            boxShadow: "none",
            backgroundColor: palette.background.paper,
          },
          rounded: {
            borderRadius: 10,
          },
          outlined: {
            borderColor: palette.divider,
          },
          elevation1: {
            boxShadow: "none",
          },
        },
        MuiCard: {
          root: {
            borderRadius: 10,
            border: `1px solid ${palette.divider}`,
            boxShadow: "none",
            backgroundColor: palette.background.paper,
          },
        },
        MuiDialog: {
          paper: {
            borderRadius: 12,
            border: `1px solid ${palette.divider}`,
            boxShadow: "none",
            backgroundColor: palette.background.paper,
          },
        },
        MuiPopover: {
          paper: {
            border: `1px solid ${palette.divider}`,
            boxShadow: "none",
            backgroundColor: palette.background.paper,
          },
        },
        MuiMenu: {
          paper: {
            border: `1px solid ${palette.divider}`,
            boxShadow: "none",
            backgroundColor: palette.background.paper,
          },
        },
        MuiTabs: {
          indicator: {
            display: "none",
          },
        },
        MuiTab: {
          root: {
            color: palette.text.secondary,
            fontWeight: 700,
            textTransform: "none",
            "&$selected": {
              color: palette.text.primary,
            },
          },
          selected: {},
        },
        MuiTableCell: {
          root: {
            borderBottom: `1px solid ${palette.divider}`,
          },
          head: {
            color: palette.text.primary,
            fontWeight: 700,
          },
        },
        MuiOutlinedInput: {
          root: {
            borderRadius: 8,
            backgroundColor: custom.inputBackground,
            color: palette.text.primary,
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: custom.panelBorderStrong,
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: palette.primary.main,
            },
          },
          notchedOutline: {
            borderColor: palette.divider,
          },
          input: {
            paddingTop: 12,
            paddingBottom: 12,
            color: palette.text.primary,
          },
        },
        MuiInputBase: {
          root: {
            color: palette.text.primary,
            fontWeight: 400,
          },
          input: {
            color: palette.text.primary,
          },
        },
        MuiTypography: {
          body1: {
            fontWeight: 400,
            fontSize: "0.9375rem",
            lineHeight: 1.6,
            color: palette.text.primary,
          },
          body2: {
            fontWeight: 400,
            fontSize: "0.9375rem",
            lineHeight: 1.6,
            color: palette.text.primary,
          },
        },
        MuiFormLabel: {
          root: {
            color: palette.text.secondary,
            "&.Mui-focused": {
              color: palette.primary.main,
            },
          },
        },
        MuiSwitch: {
          switchBase: {
            color: isDark ? "rgba(243, 246, 252, 0.42)" : "rgba(15, 23, 42, 0.28)",
            "&$checked": {
              color: palette.primary.main,
              "& + $track": {
                backgroundColor: isDark ? "rgba(255, 90, 95, 0.56)" : "rgba(255, 25, 25, 0.42)",
                opacity: 1,
              },
            },
          },
          colorPrimary: {
            "&$checked": {
              color: palette.primary.main,
              "& + $track": {
                backgroundColor: isDark ? "rgba(255, 90, 95, 0.56)" : "rgba(255, 25, 25, 0.42)",
                opacity: 1,
              },
            },
          },
          checked: {},
          track: {
            backgroundColor: isDark ? "rgba(148, 163, 184, 0.28)" : "rgba(15, 23, 42, 0.18)",
            opacity: 1,
          },
        },
      },
    },
    locale
  );
};

export default createAppTheme;