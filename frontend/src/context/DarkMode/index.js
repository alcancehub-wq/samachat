import React, { createContext, useEffect, useState, useContext, useMemo } from "react";
import PropTypes from "prop-types";
import { ThemeProvider as MUIThemeProvider } from "@material-ui/core/styles";
import { CssBaseline } from "@material-ui/core";
import { ptBR } from "@material-ui/core/locale";
import createAppTheme from "../../styles/createAppTheme";

const ThemeContext = createContext();
const STORAGE_KEY = "samachat:dark-mode";

const getInitialDarkMode = () => {
  const storedPreference = localStorage.getItem(STORAGE_KEY);

  if (storedPreference !== null) {
    return storedPreference === "true";
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches || false;
};

const resolveLocale = () => {
  const i18nLocale = localStorage.getItem("i18nextLng") || "pt-BR";
  const browserLocale = i18nLocale.substring(0, 2) + i18nLocale.substring(3, 5);

  if (browserLocale === "ptBR") {
    return ptBR;
  }

  return undefined;
};

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(getInitialDarkMode);
  const locale = useMemo(() => resolveLocale(), []);

  const toggleTheme = () => {
    setDarkMode((prevMode) => !prevMode);
  };

  const theme = useMemo(
    () => createAppTheme({ darkMode, locale }),
    [darkMode, locale]
  );

  const contextValue = useMemo(() => ({ darkMode, toggleTheme }), [darkMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(darkMode));
    document.body.classList.toggle("theme-dark", darkMode);
    document.body.classList.toggle("theme-light", !darkMode);
    document.documentElement.classList.toggle("theme-dark", darkMode);
    document.documentElement.classList.toggle("theme-light", !darkMode);
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  return (
    <ThemeContext.Provider value={contextValue}>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </ThemeContext.Provider>
  );
};
ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useThemeContext = () => useContext(ThemeContext);
