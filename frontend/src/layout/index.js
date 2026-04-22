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
    minHeight: 56,
    padding: theme.spacing(0, 2),
    gap: theme.spacing(1.5),
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
    backgroundColor: theme.palette.background.paper,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  menuButton: {
    color: theme.palette.text.primary,
  },
  title: {
    flexGrow: 1,
    color: theme.palette.text.primary,
    fontWeight: 700,
    letterSpacing: 0.3,
  },
  bodyRow: {
    display: "flex",
    flex: 1,
    minHeight: 0,
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
    scrollbarWidth: "none",
    "-ms-overflow-style": "none",
    "&::-webkit-scrollbar": {
      width: 0,
      height: 0,
    },
  },
  drawerPaperClose: {
    overflowX: "hidden",
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    width: 72,
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    overflow: "hidden",
  },
  switch: {
    transform: "scale(0.8)",
  },
  iconButton: {
    color: theme.palette.text.primary,
  },
  themeSwitchContainer: {
    display: "flex",
    alignItems: "center",
  },
  themeIcon: {
    color: theme.palette.text.primary,
  },
  searchField: {
    width: 320,
    [theme.breakpoints.down("sm")]: {
      width: 200,
    },
  },
  searchInput: {
    borderRadius: 10,
    backgroundColor: theme.palette.background.default,
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
          <Typography component="h1" variant="h6" className={classes.title}>
            SamaChat
          </Typography>

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
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

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
            >
              <MenuItem onClick={handleOpenUserModal}>
                {i18n.t("mainDrawer.appBar.user.profile")}
              </MenuItem>
              <MenuItem onClick={handleClickLogout}>
                {i18n.t("mainDrawer.appBar.user.logout")}
              </MenuItem>
            </Menu>
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
        <List>
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
