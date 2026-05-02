import React, { useState, useContext, useEffect } from "react";
import clsx from "clsx";
import {
  makeStyles,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  MenuItem,
  IconButton,
  Menu,
  Switch,
  TextField,
  InputAdornment,
} from "@material-ui/core";
import MenuIcon from "@material-ui/icons/Menu";
import AccountCircle from "@material-ui/icons/AccountCircle";
import Brightness4Icon from "@material-ui/icons/Brightness4";
import SearchIcon from "@material-ui/icons/Search";

import MainListItems from "./MainListItems";
import NotificationsPopOver from "../components/NotificationsPopOver";
import UserModal from "../components/UserModal";
import { AuthContext } from "../context/Auth/AuthContext";
import BackdropLoading from "../components/BackdropLoading";
import { i18n } from "../translate/i18n";
import { useThemeContext } from "../context/DarkMode";

const drawerWidth = 280;

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: theme.palette.background.default,
  },
  toolbar: {
    minHeight: 72,
    padding: theme.spacing(1.5, 2.5),
    gap: theme.spacing(2),
    [theme.breakpoints.down("sm")]: {
      minHeight: 64,
      padding: theme.spacing(1, 1.5),
      gap: theme.spacing(1),
    },
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
    backgroundColor: theme.palette.background.paper,
    borderBottom: `1px solid ${theme.palette.divider}`,
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
  },
  menuButton: {
    color: theme.palette.text.primary,
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.default,
    border: `1px solid ${theme.palette.divider}`,
    width: 42,
    height: 42,
    "&:hover": {
      backgroundColor: "rgba(229, 57, 53, 0.08)",
    },
  },
  brandBlock: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.5),
    minWidth: 0,
    flex: "1 1 auto",
    position: "relative",
  },
  brandAccent: {
    width: 12,
    height: 40,
    borderRadius: 999,
    background: "linear-gradient(180deg, #E53935 0%, #C62828 100%)",
    boxShadow: "0 12px 22px rgba(198, 40, 40, 0.24)",
    [theme.breakpoints.down("sm")]: {
      display: "none",
    },
  },
  brandTextBlock: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  title: {
    color: theme.palette.text.primary,
    fontWeight: 700,
    fontSize: "1.55rem",
    lineHeight: 1.05,
    letterSpacing: -0.4,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  brandSubtitle: {
    color: theme.palette.text.secondary,
    fontSize: "0.78rem",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginTop: theme.spacing(0.25),
  },
  topActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: theme.spacing(1),
    marginLeft: "auto",
    [theme.breakpoints.down("sm")]: {
      gap: theme.spacing(0.5),
    },
  },
  bodyRow: {
    display: "flex",
    flex: 1,
    minHeight: 0,
    gap: theme.spacing(2),
    padding: theme.spacing(2),
    boxSizing: "border-box",
    [theme.breakpoints.down("sm")]: {
      gap: 0,
      padding: 0,
    },
  },
  drawerPaper: {
    position: "relative",
    whiteSpace: "nowrap",
    width: drawerWidth,
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    backgroundColor: theme.palette.background.paper,
    borderRight: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius + 4,
    boxShadow: "0 18px 36px rgba(15, 23, 42, 0.08)",
    overflowY: "auto",
    scrollbarWidth: "none",
    "-ms-overflow-style": "none",
    "&::-webkit-scrollbar": {
      width: 0,
      height: 0,
    },
    [theme.breakpoints.down("sm")]: {
      borderRadius: 0,
      boxShadow: "none",
    },
  },
  drawerPaperClose: {
    overflowX: "hidden",
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    width: 84,
  },
  drawerList: {
    padding: theme.spacing(2, 0),
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    overflow: "hidden",
    backgroundColor: theme.palette.background.default,
    borderRadius: theme.shape.borderRadius + 4,
    backgroundImage: "radial-gradient(circle at top right, rgba(229, 57, 53, 0.05), transparent 22%)",
    [theme.breakpoints.down("sm")]: {
      borderRadius: 0,
    },
  },
  switch: {
    transform: "scale(0.8)",
  },
  iconButton: {
    color: theme.palette.text.primary,
    borderRadius: theme.shape.borderRadius,
    width: 42,
    height: 42,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    "&:hover": {
      backgroundColor: theme.palette.background.default,
    },
  },
  themeSwitchContainer: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(0.5),
    padding: theme.spacing(0.5, 0.75),
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
  },
  themeIcon: {
    color: theme.palette.text.secondary,
  },
  searchField: {
    width: 380,
    [theme.breakpoints.down("sm")]: {
      width: 170,
    },
  },
  searchInput: {
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.default,
    boxShadow: "inset 0 1px 2px rgba(15, 23, 42, 0.03)",
    border: `1px solid ${theme.palette.divider}`,
  },
  searchAdornment: {
    color: theme.palette.text.secondary,
  },
  profileMenuPaper: {
    marginTop: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: "0 16px 32px rgba(15, 23, 42, 0.12)",
  },
}));

const LoggedInLayout = ({ children }) => {
  const classes = useStyles();
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { handleLogout, loading, user } = useContext(AuthContext);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerVariant, setDrawerVariant] = useState("permanent");
  const { darkMode, toggleTheme } = useThemeContext();
  const [menuSearch, setMenuSearch] = useState("");

  useEffect(() => {
    if (document.body.offsetWidth > 600) {
      setDrawerOpen(true);
    }
  }, []);

  useEffect(() => {
    if (document.body.offsetWidth < 600) {
      setDrawerVariant("temporary");
    } else {
      setDrawerVariant("permanent");
    }
  }, [drawerOpen]);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
    setMenuOpen(true);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setMenuOpen(false);
  };

  const handleOpenUserModal = () => {
    setUserModalOpen(true);
    handleCloseMenu();
  };

  const handleClickLogout = () => {
    handleCloseMenu();
    handleLogout();
  };

  const drawerClose = () => {
    if (document.body.offsetWidth < 600) {
      setDrawerOpen(false);
    }
  };

  if (loading) {
    return <BackdropLoading />;
  }

  return (
    <div className={classes.root}>
      <AppBar position="static" elevation={0} className={classes.appBar}>
        <Toolbar className={classes.toolbar}>
          <IconButton
            edge="start"
            aria-label="open drawer"
            onClick={() => setDrawerOpen(!drawerOpen)}
            className={classes.menuButton}
          >
            <MenuIcon />
          </IconButton>

          <div className={classes.brandBlock}>
            <div className={classes.brandAccent} />
            <div className={classes.brandTextBlock}>
              <Typography component="h1" variant="h6" className={classes.title}>
                SamaChat
              </Typography>
              <Typography component="span" className={classes.brandSubtitle}>
                Workspace CRM
              </Typography>
            </div>
          </div>

          <TextField
            value={menuSearch}
            onChange={(event) => setMenuSearch(event.target.value)}
            placeholder={i18n.t("mainDrawer.search.placeholder")}
            size="small"
            variant="outlined"
            className={classes.searchField}
            InputProps={{
              className: classes.searchInput,
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" className={classes.searchAdornment} />
                </InputAdornment>
              ),
            }}
          />

          <div className={classes.topActions}>
            <div className={classes.themeSwitchContainer}>
              <Brightness4Icon className={classes.themeIcon} />
              <Switch
                checked={darkMode}
                onChange={toggleTheme}
                color="default"
                className={classes.switch}
              />
            </div>

            {user?.id && (
              <NotificationsPopOver className={classes.iconButton} />
            )}

            <div>
              <IconButton
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                className={classes.iconButton}
              >
                <AccountCircle />
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                getContentAnchorEl={null}
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "right",
                }}
                transformOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                open={menuOpen}
                onClose={handleCloseMenu}
                classes={{ paper: classes.profileMenuPaper }}
              >
                <MenuItem onClick={handleOpenUserModal}>
                  {i18n.t("mainDrawer.appBar.user.profile")}
                </MenuItem>
                <MenuItem onClick={handleClickLogout}>
                  {i18n.t("mainDrawer.appBar.user.logout")}
                </MenuItem>
              </Menu>
            </div>
          </div>
        </Toolbar>
      </AppBar>
      <div className={classes.bodyRow}>
      <Drawer
        variant={drawerVariant}
        className={drawerOpen ? classes.drawerPaper : classes.drawerPaperClose}
        classes={{
          paper: clsx(
            classes.drawerPaper,
            !drawerOpen && classes.drawerPaperClose
          ),
        }}
        open={drawerOpen}
      >
        <List className={classes.drawerList}>
          <MainListItems
            drawerClose={drawerClose}
            showHeader={false}
            searchValue={menuSearch}
            onSearchChange={setMenuSearch}
            isDrawerOpen={drawerOpen}
          />
        </List>
      </Drawer>
      <UserModal
        open={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        userId={user?.id}
      />
        <main className={classes.content}>{children}</main>
      </div>
    </div>
  );
};

export default LoggedInLayout;
