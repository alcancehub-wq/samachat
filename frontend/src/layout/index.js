import React, { useState, useContext, useEffect } from "react";
import clsx from "clsx";
import { useHistory } from "react-router-dom";
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
import InfoOutlinedIcon from "@material-ui/icons/InfoOutlined";
import DescriptionOutlinedIcon from "@material-ui/icons/DescriptionOutlined";
import PersonOutlineOutlinedIcon from "@material-ui/icons/PersonOutlineOutlined";
import VerifiedUserOutlinedIcon from "@material-ui/icons/VerifiedUserOutlined";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import MenuBookOutlinedIcon from "@material-ui/icons/MenuBookOutlined";

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
    backgroundColor: "transparent",
    width: 42,
    height: 42,
    "&:hover": {
      backgroundColor: "rgba(15, 23, 42, 0.04)",
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
    padding: theme.spacing(0, 2, 0, 0),
    boxSizing: "border-box",
    [theme.breakpoints.down("sm")]: {
      gap: 0,
      padding: 0,
    },
  },
  drawerPaper: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    whiteSpace: "nowrap",
    width: drawerWidth,
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    backgroundColor: theme.palette.background.paper,
    borderRight: `1px solid ${theme.palette.divider}`,
    borderRadius: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    boxShadow: "0 18px 36px rgba(15, 23, 42, 0.08)",
    overflowY: "auto",
    overflowX: "hidden",
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
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    overflowX: "hidden",
  },
  drawerFooter: {
    marginTop: "auto",
    borderTop: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(1.5),
    backgroundColor: theme.palette.background.paper,
  },
  drawerFooterButton: {
    width: "100%",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.25),
    padding: theme.spacing(1.1, 1.25),
    borderRadius: theme.shape.borderRadius + 8,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.default,
    cursor: "pointer",
    transition: "background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
    "&:hover": {
      backgroundColor: "rgba(229, 57, 53, 0.05)",
      borderColor: "rgba(229, 57, 53, 0.12)",
      boxShadow: "0 8px 18px rgba(15, 23, 42, 0.06)",
    },
  },
  drawerFooterCollapsed: {
    justifyContent: "center",
    padding: theme.spacing(1),
  },
  drawerFooterAvatar: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    color: "#111111",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "1rem",
    flex: "none",
  },
  drawerFooterInfo: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    flex: 1,
  },
  drawerFooterRole: {
    color: theme.palette.text.primary,
    fontWeight: 700,
    fontSize: "0.95rem",
    lineHeight: 1.2,
  },
  drawerFooterEmail: {
    color: theme.palette.text.secondary,
    fontSize: "0.8rem",
    fontWeight: 600,
    lineHeight: 1.35,
    marginTop: theme.spacing(0.25),
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  drawerFooterChevron: {
    color: theme.palette.text.secondary,
    flex: "none",
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
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
    [theme.breakpoints.down("sm")]: {
      borderRadius: 0,
      marginTop: 0,
      marginBottom: 0,
    },
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
  drawerUserMenuPaper: {
    marginTop: theme.spacing(1),
    borderRadius: theme.shape.borderRadius + 4,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: "0 16px 32px rgba(15, 23, 42, 0.12)",
    minWidth: 220,
  },
  drawerUserMenuItem: {
    gap: theme.spacing(1),
    minHeight: 44,
    fontSize: "0.92rem",
    color: theme.palette.text.primary,
  },
  drawerUserMenuLabel: {
    flex: 1,
  },
  drawerUserMenuIcon: {
    color: theme.palette.text.secondary,
    minWidth: 0,
  },
  drawerUserMenuSwitch: {
    marginLeft: theme.spacing(1),
  },
}));

const LoggedInLayout = ({ children }) => {
  const classes = useStyles();
  const history = useHistory();
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerUserAnchorEl, setDrawerUserAnchorEl] = useState(null);
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

  const handleOpenDrawerUserMenu = (event) => {
    setDrawerUserAnchorEl(event.currentTarget);
  };

  const handleCloseDrawerUserMenu = () => {
    setDrawerUserAnchorEl(null);
  };

  const handleNavigateDrawerUserMenu = (path) => {
    handleCloseDrawerUserMenu();
    history.push(path);
  };

  const drawerUserMenuOpen = Boolean(drawerUserAnchorEl);

  const userRoleLabel = user?.profile
    ? user.profile.charAt(0).toUpperCase() + user.profile.slice(1)
    : "Usuario";

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("")
    : "US";

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
                WhatsApp
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
        <div className={classes.drawerFooter}>
          <div
            role="button"
            tabIndex={0}
            onClick={handleOpenDrawerUserMenu}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                handleOpenDrawerUserMenu(event);
              }
            }}
            className={clsx(classes.drawerFooterButton, {
              [classes.drawerFooterCollapsed]: !drawerOpen,
            })}
          >
            <div className={classes.drawerFooterAvatar}>{userInitials}</div>
            {drawerOpen && (
              <>
                <div className={classes.drawerFooterInfo}>
                  <Typography className={classes.drawerFooterRole}>
                    {userRoleLabel}
                  </Typography>
                  <Typography className={classes.drawerFooterEmail}>
                    {user?.email}
                  </Typography>
                </div>
                <ExpandMoreIcon className={classes.drawerFooterChevron} />
              </>
            )}
          </div>
        </div>
      </Drawer>
      <Menu
        id="drawer-user-menu"
        anchorEl={drawerUserAnchorEl}
        getContentAnchorEl={null}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        open={drawerUserMenuOpen}
        onClose={handleCloseDrawerUserMenu}
        classes={{ paper: classes.drawerUserMenuPaper }}
      >
        <MenuItem onClick={() => handleNavigateDrawerUserMenu("/informatives")} className={classes.drawerUserMenuItem}>
          <InfoOutlinedIcon fontSize="small" className={classes.drawerUserMenuIcon} />
          {i18n.t("mainDrawer.drawerUser.menu.informatives")}
        </MenuItem>
        <MenuItem onClick={() => handleNavigateDrawerUserMenu("/release-notes")} className={classes.drawerUserMenuItem}>
          <DescriptionOutlinedIcon fontSize="small" className={classes.drawerUserMenuIcon} />
          {i18n.t("mainDrawer.drawerUser.menu.releaseNotes")}
        </MenuItem>
        <MenuItem onClick={handleOpenUserModal} className={classes.drawerUserMenuItem}>
          <PersonOutlineOutlinedIcon fontSize="small" className={classes.drawerUserMenuIcon} />
          {i18n.t("mainDrawer.drawerUser.menu.profile")}
        </MenuItem>
        <MenuItem onClick={(event) => event.stopPropagation()} className={classes.drawerUserMenuItem}>
          <Brightness4Icon fontSize="small" className={classes.drawerUserMenuIcon} />
          <span className={classes.drawerUserMenuLabel}>
            {i18n.t("mainDrawer.drawerUser.menu.theme")}
          </span>
          <Switch
            checked={darkMode}
            onChange={toggleTheme}
            color="default"
            className={classes.drawerUserMenuSwitch}
          />
        </MenuItem>
        <MenuItem onClick={() => handleNavigateDrawerUserMenu("/manual")} className={classes.drawerUserMenuItem}>
          <MenuBookOutlinedIcon fontSize="small" className={classes.drawerUserMenuIcon} />
          {i18n.t("mainDrawer.drawerUser.menu.manual")}
        </MenuItem>
        <MenuItem onClick={() => handleNavigateDrawerUserMenu("/lgpd")} className={classes.drawerUserMenuItem}>
          <VerifiedUserOutlinedIcon fontSize="small" className={classes.drawerUserMenuIcon} />
          {i18n.t("mainDrawer.drawerUser.menu.lgpd")}
        </MenuItem>
      </Menu>
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
