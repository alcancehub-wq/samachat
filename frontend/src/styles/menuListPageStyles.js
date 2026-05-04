const buildMenuListPageStyles = theme => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1.25, 1, 0),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
    borderRadius: 16,
    border: `1px solid ${theme.custom.panelBorder}`,
    boxShadow: "none",
    backgroundColor: theme.palette.background.paper,
    backgroundImage: theme.custom.panelGradient,
  },
  headerTitle: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: theme.spacing(0.5),
  },
  headerSubtitle: {
    color: theme.palette.text.secondary,
    fontSize: "0.9375rem",
    fontWeight: 400,
    lineHeight: 1.6,
  },
  searchField: {
    minWidth: 320,
    backgroundColor: theme.custom.inputBackground,
    marginLeft: "auto",
    [theme.breakpoints.down("sm")]: {
      minWidth: "100%",
      marginLeft: 0,
    },
  },
  searchInputRoot: {
    borderRadius: 12,
    backgroundColor: theme.custom.inputBackground,
  },
  actionButton: {
    borderRadius: 4,
    textTransform: "none",
    fontWeight: 600,
    boxShadow: "none !important",
    backgroundImage: "none !important",
    backgroundColor: "#FF1919 !important",
    color: "#FFFFFF !important",
    "&:hover": {
      backgroundColor: "#E11414 !important",
      boxShadow: "none !important",
    },
    "&.Mui-disabled": {
      backgroundColor: "rgba(255, 25, 25, 0.18) !important",
      color: "rgba(255, 255, 255, 0.72) !important",
    },
  },
  bulkSelectionInfo: {
    fontSize: "0.9375rem",
    fontWeight: 400,
    lineHeight: 1.6,
    color: theme.palette.text.primary,
  },
  bulkActionButton: {
    borderRadius: 4,
    textTransform: "none",
    fontWeight: 600,
    boxShadow: "none !important",
    backgroundColor: "#FF1919 !important",
    color: "#FFFFFF !important",
    "&:hover": {
      backgroundColor: "#E11414 !important",
      boxShadow: "none !important",
    },
    "&.Mui-disabled": {
      backgroundColor: "rgba(255, 25, 25, 0.18) !important",
      color: "rgba(255, 255, 255, 0.72) !important",
    },
  },
  bulkDeleteButton: {
    borderRadius: 4,
    textTransform: "none",
    fontWeight: 600,
    boxShadow: "none !important",
    backgroundColor: `${theme.custom.neutralButtonBackground} !important`,
    borderColor: `${theme.custom.panelBorderStrong} !important`,
    color: `${theme.custom.neutralButtonText} !important`,
    "&:hover": {
      backgroundColor: `${theme.custom.neutralButtonBackgroundHover} !important`,
      borderColor: `${theme.custom.panelBorderStrong} !important`,
      boxShadow: "none !important",
    },
  },
  checkboxCell: {
    width: 56,
  },
  checkboxRoot: {
    padding: 6,
    color: theme.palette.type === "dark" ? "rgba(243, 246, 252, 0.42)" : "rgba(15, 23, 42, 0.28)",
    "&.Mui-checked": {
      color: "#FF1919",
    },
    "&.MuiCheckbox-indeterminate": {
      color: "#FF1919",
    },
  },
  table: {
    borderCollapse: "separate",
    borderSpacing: "0 8px",
  },
  tableHead: {
    backgroundColor: "transparent",
  },
  tableHeadCell: {
    color: theme.palette.text.primary,
    fontWeight: 700,
    fontSize: "0.78rem",
    textTransform: "uppercase",
    letterSpacing: 1.1,
    borderBottom: "none",
  },
  tableRow: {
    backgroundColor: theme.palette.background.paper,
    borderRadius: 12,
    "& > td": {
      borderBottom: "none",
    },
    "& td:first-child": {
      borderTopLeftRadius: 12,
      borderBottomLeftRadius: 12,
    },
    "& td:last-child": {
      borderTopRightRadius: 12,
      borderBottomRightRadius: 12,
    },
    "&:hover": {
      backgroundColor: theme.custom.tableHover,
    },
  },
  tableCell: {
    paddingTop: theme.spacing(1.25),
    paddingBottom: theme.spacing(1.25),
  },
  actionsCell: {
    whiteSpace: "nowrap",
  },
  actionIconButton: {
    backgroundColor: theme.custom.iconButtonBackground,
    marginRight: theme.spacing(0.5),
    borderRadius: 10,
    color: theme.palette.text.secondary,
    "&:hover": {
      backgroundColor: theme.custom.iconButtonBackgroundHover,
    },
  },
});

export default buildMenuListPageStyles;