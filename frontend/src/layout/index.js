import React, { useState, useContext, useEffect } from "react";
import clsx from "clsx";
import { useHistory, useLocation } from "react-router-dom";
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
import SpellcheckIcon from "@material-ui/icons/Spellcheck";
import SyncIcon from "@material-ui/icons/Sync";
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
import { WhatsAppsContext } from "../context/WhatsApp/WhatsAppsContext";
import BackdropLoading from "../components/BackdropLoading";
import { i18n } from "../translate/i18n";
import api from "../services/api";
import toastError from "../errors/toastError";
import { toast } from "react-toastify";
import { useThemeContext } from "../context/DarkMode";
import { userHasPermission } from "../utils/permissions";

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
    boxShadow: "none",
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
    background: `linear-gradient(180deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.main} 100%)`,
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
  bodyRowFullBleed: {
    gap: 0,
    padding: 0,
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
    boxShadow: "none",
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
    transition: "background-color 0.2s ease, border-color 0.2s ease",
    "&:hover": {
      backgroundColor: "rgba(229, 57, 53, 0.05)",
      borderColor: "rgba(229, 57, 53, 0.12)",
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
  contentFullBleed: {
    borderRadius: 0,
    marginTop: 0,
    marginBottom: 0,
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
  reconciliationCooldownButton: {
    "&.Mui-disabled": {
      color: theme.palette.text.secondary,
      opacity: 0.72,
      backgroundColor: theme.palette.background.paper,
    },
  },
  themeIcon: {
    color: theme.palette.text.secondary,
  },
  searchField: {
    width: 380,
    [theme.breakpoints.down("sm")]: {
      display: "none",
    },
  },
  searchInput: {
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.default,
    boxShadow: "none",
    border: `1px solid ${theme.palette.divider}`,
  },
  searchAdornment: {
    color: theme.palette.text.secondary,
  },
  profileMenuPaper: {
    marginTop: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: "none",
  },
  drawerUserMenuPaper: {
    marginTop: theme.spacing(1),
    borderRadius: theme.shape.borderRadius + 4,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: "none",
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
  const location = useLocation();
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerUserAnchorEl, setDrawerUserAnchorEl] = useState(null);
  const { handleLogout, loading, user } = useContext(AuthContext);
  const { whatsApps } = useContext(WhatsAppsContext);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerVariant, setDrawerVariant] = useState("permanent");
  const { darkMode, toggleTheme } = useThemeContext();
  const [autoCorrectTextEnabled, setAutoCorrectTextEnabled] = useState(false);
  const [menuSearch, setMenuSearch] = useState("");
  const [reconciliationLoading, setReconciliationLoading] = useState(false);
  const [reconciliationState, setReconciliationState] = useState(null);
  const canViewTickets = userHasPermission(user, "tickets.view");
  const canViewConnections = userHasPermission(user, "connections.view");

  const linkedWhatsappId = Number(
    user?.whatsappId ||
    user?.whatsapp?.id ||
    0
  );

  const reconciliationWhatsApp =
    Array.isArray(whatsApps)
      ? whatsApps.find(
          whatsApp =>
            Number(whatsApp?.id) === linkedWhatsappId
        )
      : null;

  const canUseManualReconciliation = Boolean(
    user?.id &&
    canViewConnections &&
    reconciliationWhatsApp &&
    reconciliationWhatsApp.providerType !== "official" &&
    reconciliationWhatsApp.status === "CONNECTED"
  );
  const isFocusRoute =
    location.pathname.startsWith("/tickets") ||
    location.pathname.startsWith("/flowbuilder");

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

  useEffect(() => {
    if (document.body.offsetWidth < 600) {
      return;
    }

    if (
      location.pathname.startsWith("/tickets") ||
      location.pathname.startsWith("/flowbuilder")
    ) {
      setDrawerOpen(false);
      return;
    }

    setDrawerOpen(true);
  }, [location.pathname]);

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

  const userSectorLabel = Array.isArray(user?.queues)
    ? user.queues
        .map((queue) => queue?.name)
        .filter(Boolean)
        .join(" / ")
    : "";

  const userRoleLabel = userSectorLabel || (user?.profile
    ? user.profile.charAt(0).toUpperCase() + user.profile.slice(1)
    : "Usuario");

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

  const handleDrawerItemNavigate = (path) => {
    if (document.body.offsetWidth < 600) {
      return;
    }

    if (path.startsWith("/tickets") || path.startsWith("/flowbuilder")) {
      setDrawerOpen(false);
      return;
    }

    setDrawerOpen(true);
  };

  const getAutoCorrectTextStorageKey = () =>
    user?.id
      ? `samachat:autoCorrectTextEnabled:${user.id}`
      : "samachat:autoCorrectTextEnabled";

  useEffect(() => {
    let active = true;

    const fetchState = async () => {
      if (!canUseManualReconciliation) {
        if (active) {
          setReconciliationState(null);
        }
        return;
      }

      try {
        const { data } = await api.get(
          `/whatsapp/${reconciliationWhatsApp.id}/reconcile-state`
        );

        if (active) {
          setReconciliationState(data || null);
        }
      } catch (err) {
        if (active) {
          setReconciliationState(null);
        }
      }
    };

    fetchState();

    const timer = setInterval(fetchState, 15000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [
    canUseManualReconciliation,
    reconciliationWhatsApp?.id
  ]);

  const manualRetryAfterMs = Number(
    reconciliationState?.manualRetryAfterMs || 0
  );

  const reconciliationRunning = Boolean(
    reconciliationState?.running
  );

  const reconciliationBlocked =
    reconciliationLoading ||
    reconciliationRunning ||
    manualRetryAfterMs > 0;

  const reconciliationTitle =
    reconciliationLoading || reconciliationRunning
      ? "Ressincronização do WhatsApp em andamento"
      : manualRetryAfterMs > 0
      ? `Ressincronizar WhatsApp disponível em ${Math.max(
          1,
          Math.ceil(manualRetryAfterMs / 60000)
        )} min`
      : "Ressincronizar WhatsApp";

  const handleManualWhatsAppReconciliation = async () => {
    if (
      !canUseManualReconciliation ||
      reconciliationBlocked
    ) {
      return;
    }

    setReconciliationLoading(true);

    try {
      const { data } = await api.post(
        `/whatsapp/${reconciliationWhatsApp.id}/reconcile`
      );

      if (data?.state) {
        setReconciliationState(data.state);
      } else {
        const { data: nextState } = await api.get(
          `/whatsapp/${reconciliationWhatsApp.id}/reconcile-state`
        );

        setReconciliationState(nextState || null);
      }

      toast.success(
        "WhatsApp ressincronizado com sucesso."
      );
    } catch (err) {
      const retryAfterMs = Number(
        err?.response?.data?.retryAfterMs || 0
      );

      if (retryAfterMs > 0) {
        setReconciliationState(prev => ({
          ...(prev || {}),
          manualRetryAfterMs: retryAfterMs
        }));
      }

      toastError(err);
    } finally {
      setReconciliationLoading(false);
    }
  };

  useEffect(() => {
    const storedValue = localStorage.getItem(getAutoCorrectTextStorageKey());
    setAutoCorrectTextEnabled(storedValue === "true");
  }, [user?.id]);

  const handleToggleAutoCorrectText = () => {
    setAutoCorrectTextEnabled(prevState => {
      const nextState = !prevState;
      localStorage.setItem(getAutoCorrectTextStorageKey(), String(nextState));
      window.dispatchEvent(new CustomEvent("samachat:auto-correct-text-toggle"));
      return nextState;
    });
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
          <div className={classes.topActions}>
            {user?.id && canViewTickets && (
              <>
              <IconButton
                aria-label={autoCorrectTextEnabled ? "Desligar correÃ§Ã£o automÃ¡tica" : "Ligar correÃ§Ã£o automÃ¡tica"}
                title={autoCorrectTextEnabled ? "CorreÃ§Ã£o IA ligada" : "CorreÃ§Ã£o IA desligada"}
                onClick={handleToggleAutoCorrectText}
                className={classes.iconButton}
                style={autoCorrectTextEnabled ? { color: "#ff1919" } : undefined}
              >
                <SpellcheckIcon fontSize="small" />
              </IconButton>
              {canUseManualReconciliation && (
                <IconButton
                  aria-label="Ressincronizar WhatsApp"
                  title={reconciliationTitle}
                  onClick={handleManualWhatsAppReconciliation}
                  className={clsx(
                    classes.iconButton,
                    manualRetryAfterMs > 0 &&
                      classes.reconciliationCooldownButton
                  )}
                  disabled={reconciliationBlocked}
                  style={
                    reconciliationLoading || reconciliationRunning
                      ? { color: "#ff1919" }
                      : undefined
                  }
                >
                  <SyncIcon fontSize="small" />
                </IconButton>
              )}
              <NotificationsPopOver className={classes.iconButton} />
              </>
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
      <div className={clsx(classes.bodyRow, { [classes.bodyRowFullBleed]: isFocusRoute })}>
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
            onItemNavigate={handleDrawerItemNavigate}
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
        <main className={clsx(classes.content, { [classes.contentFullBleed]: isFocusRoute })}>{children}</main>
      </div>
    </div>
  );
};

export default LoggedInLayout;
