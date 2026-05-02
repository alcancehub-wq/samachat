const buildMenuListPageStyles = theme => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1.25, 1, 0),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
    borderRadius: 16,
    border: "1px solid rgba(15, 23, 42, 0.08)",
    boxShadow: "0 16px 28px rgba(15, 23, 42, 0.08)",
    backgroundColor: "#ffffff",
    backgroundImage: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
  },
  headerTitle: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: theme.spacing(0.5),
  },
  headerSubtitle: {
    color: "#111111",
    fontSize: "0.9375rem",
    fontWeight: 300,
    lineHeight: 1.6,
  },
  searchField: {
    minWidth: 320,
    backgroundColor: "#ffffff",
    marginLeft: "auto",
    [theme.breakpoints.down("sm")]: {
      minWidth: "100%",
      marginLeft: 0,
    },
  },
  searchInputRoot: {
    borderRadius: 12,
    backgroundColor: "#ffffff",
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
    fontWeight: 300,
    lineHeight: 1.6,
    color: "#111111",
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
    backgroundColor: "#F3F4F6 !important",
    borderColor: "rgba(15, 23, 42, 0.12) !important",
    color: "#111827 !important",
    "&:hover": {
      backgroundColor: "#E5E7EB !important",
      borderColor: "rgba(15, 23, 42, 0.16) !important",
      boxShadow: "none !important",
    },
  },
  checkboxCell: {
    width: 56,
  },
  checkboxRoot: {
    padding: 6,
    color: "rgba(15, 23, 42, 0.28)",
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
    color: "#111111",
    fontWeight: 700,
    fontSize: "0.78rem",
    textTransform: "uppercase",
    letterSpacing: 1.1,
    borderBottom: "none",
  },
  tableRow: {
    backgroundColor: "#ffffff",
    boxShadow: "0 12px 20px rgba(15, 23, 42, 0.08)",
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
      backgroundColor: "rgba(14, 165, 233, 0.06)",
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
    backgroundColor: "rgba(15, 23, 42, 0.06)",
    marginRight: theme.spacing(0.5),
    borderRadius: 10,
  },
});

export default buildMenuListPageStyles;