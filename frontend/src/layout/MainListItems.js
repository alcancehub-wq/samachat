import React, { useContext, useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";

import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import ListSubheader from "@material-ui/core/ListSubheader";
import Divider from "@material-ui/core/Divider";
import Collapse from "@material-ui/core/Collapse";
import TextField from "@material-ui/core/TextField";
import InputAdornment from "@material-ui/core/InputAdornment";
import { Badge, Typography } from "@material-ui/core";
import DashboardOutlinedIcon from "@material-ui/icons/DashboardOutlined";
import WhatsAppIcon from "@material-ui/icons/WhatsApp";
import SyncAltIcon from "@material-ui/icons/SyncAlt";
import SettingsOutlinedIcon from "@material-ui/icons/SettingsOutlined";
import PeopleAltOutlinedIcon from "@material-ui/icons/PeopleAltOutlined";
import ContactPhoneOutlinedIcon from "@material-ui/icons/ContactPhoneOutlined";
import QuestionAnswerOutlinedIcon from "@material-ui/icons/QuestionAnswerOutlined";
import LocalOfferOutlinedIcon from "@material-ui/icons/LocalOfferOutlined";
import ListAltOutlinedIcon from "@material-ui/icons/ListAltOutlined";
import ChatBubbleOutlineIcon from "@material-ui/icons/ChatBubbleOutline";
import FlagOutlinedIcon from "@material-ui/icons/FlagOutlined";
import LinkOutlinedIcon from "@material-ui/icons/LinkOutlined";
import AnnouncementOutlinedIcon from "@material-ui/icons/AnnouncementOutlined";
import ViewColumnOutlinedIcon from "@material-ui/icons/ViewColumnOutlined";
import AssignmentTurnedInOutlinedIcon from "@material-ui/icons/AssignmentTurnedInOutlined";
import FolderOutlinedIcon from "@material-ui/icons/FolderOutlined";
import EventNoteOutlinedIcon from "@material-ui/icons/EventNoteOutlined";
import AccountTreeOutlinedIcon from "@material-ui/icons/AccountTreeOutlined";
import MemoryOutlinedIcon from "@material-ui/icons/MemoryOutlined";
import SearchIcon from "@material-ui/icons/Search";
import { makeStyles } from "@material-ui/core/styles";

import { i18n } from "../translate/i18n";
import { WhatsAppsContext } from "../context/WhatsApp/WhatsAppsContext";
import { AuthContext } from "../context/Auth/AuthContext";
import rules from "../rules";

const useStyles = makeStyles((theme) => ({
  menuHeader: {
    padding: theme.spacing(1, 2, 2),
  },
  menuTitle: {
    fontWeight: 700,
    fontSize: "0.98rem",
    letterSpacing: -0.1,
    color: theme.palette.text.primary,
  },
  searchField: {
    marginTop: theme.spacing(1.25),
    "& .MuiOutlinedInput-root": {
      backgroundColor: theme.palette.background.default,
    },
  },
  groupHeader: {
    margin: theme.spacing(0.5, 1.5),
    paddingLeft: theme.spacing(1.25),
    paddingRight: theme.spacing(1.25),
    paddingTop: theme.spacing(0.75),
    paddingBottom: theme.spacing(0.75),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: "transparent",
    "&:hover": {
      backgroundColor: "rgba(15, 23, 42, 0.04)",
    },
  },
  groupTitle: {
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontSize: "0.7rem",
    color: theme.palette.text.secondary,
  },
  groupDivider: {
    margin: theme.spacing(1.25, 1.75),
  },
  listItemRoot: {
    borderRadius: theme.shape.borderRadius,
    minHeight: 42,
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
    paddingRight: theme.spacing(1.5),
    transition: "background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease",
    color: theme.palette.text.primary,
    "&:hover": {
      backgroundColor: "rgba(229, 57, 53, 0.08)",
    },
    "& .MuiListItemIcon-root": {
      color: theme.palette.text.secondary,
      minWidth: 38,
    },
    "& .MuiListItemText-primary": {
      fontSize: "0.92rem",
      fontWeight: 500,
      color: theme.palette.text.primary,
    },
  },
  nestedItem: {
    margin: theme.spacing(0.35, 1.5),
    paddingLeft: theme.spacing(1.5),
  },
  nestedItemSecondary: {
    paddingLeft: theme.spacing(5),
  },
  collapsedList: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: theme.spacing(0.5),
  },
  collapsedItem: {
    justifyContent: "center",
    paddingLeft: 0,
    paddingRight: 0,
    margin: theme.spacing(0.25, 0),
    width: 52,
    height: 52,
    borderRadius: theme.shape.borderRadius,
  },
  collapsedIcon: {
    minWidth: 0,
    margin: 0,
  },
  collapsedText: {
    display: "none",
  },
  menuItemIcon: {
    minWidth: 38,
    color: theme.palette.text.secondary,
  },
  menuItemText: {
    margin: 0,
  },
}));

function ListItemLink(props) {
  const {
    icon,
    primary,
    to,
    className,
    denseClassName,
    iconClassName,
    textClassName,
  } = props;

  const renderLink = React.useMemo(
    () =>
      React.forwardRef((itemProps, ref) => (
        <RouterLink to={to} ref={ref} {...itemProps} />
      )),
    [to]
  );

  return (
    <li>
      <ListItem
        button
        component={renderLink}
        className={className}
        classes={{ root: denseClassName }}
      >
        {icon ? <ListItemIcon className={iconClassName}>{icon}</ListItemIcon> : null}
        <ListItemText primary={primary} className={textClassName} />
      </ListItem>
    </li>
  );
}

const MainListItems = (props) => {
  const {
    drawerClose,
    showHeader = true,
    searchValue,
    onSearchChange,
    isDrawerOpen = true,
  } = props;
  const classes = useStyles();
  const { whatsApps } = useContext(WhatsAppsContext);
  const { user } = useContext(AuthContext);
  const [connectionWarning, setConnectionWarning] = useState(false);
  const [menuSearch, setMenuSearch] = useState("");
  const [openGroups, setOpenGroups] = useState({
    operation: true,
    communication: true,
    ai: true,
    governance: true,
  });

  const isControlledSearch = typeof searchValue === "string";
  const currentSearch = isControlledSearch ? searchValue : menuSearch;
  const setSearch = isControlledSearch ? onSearchChange : setMenuSearch;

  const permissions = user?.permissions || [];
  const isAdmin = user?.profile === "admin";

  const hasPermission = (permissionKey) => {
    if (!permissionKey) {
      return false;
    }

    if (isAdmin) {
      return true;
    }

    if (permissions.includes(permissionKey)) {
      return true;
    }

    const staticPermissions = rules?.[user?.profile]?.static || [];
    return staticPermissions.includes(permissionKey);
  };

  const canAccessAny = (permissionKeys) =>
    permissionKeys.some((key) => hasPermission(key));

  const normalize = (value) => value.trim().toLowerCase();
  const searchValueNormalized = normalize(currentSearch || "");
  const matchesSearch = (label) =>
    !searchValueNormalized || normalize(label).includes(searchValueNormalized);


  const toggleGroup = (groupKey) => {
    setOpenGroups((prevState) => ({
      ...prevState,
      [groupKey]: !prevState[groupKey],
    }));
  };

  const canAccessOperation = canAccessAny([
    "login.access",
    "tickets.view",
    "messages.view",
    "contacts.view",
    "kanban.view",
    "tasks.view",
    "schedules.view",
    "files.view",
  ]);

  const canAccessCommunication = canAccessAny([
    "campaigns.view",
    "informatives.view",
    "dialogs.view",
    "flows.view",
    "tags.view",
    "contactLists.view",
  ]);


  const canAccessAi = canAccessAny([
    "openai.settings.view",
    "openai.use",
    "openai.logs.view",
    "settings.view",
  ]);

  const canAccessGovernance = canAccessAny([
    "users.view",
    "sectors.view",
    "connections.view",
    "integrations.view",
    "settings.view",
  ]);

  const menuConfig = {
    dashboard: {
      labelKey: "mainDrawer.listItems.dashboard",
      to: "/",
      icon: <DashboardOutlinedIcon />,
      permissions: ["login.access", "tickets.view", "messages.view"],
    },
    chats: {
      labelKey: "mainDrawer.listItems.tickets",
      to: "/tickets",
      icon: <WhatsAppIcon />,
      permissions: ["tickets.view"],
    },
    contacts: {
      labelKey: "mainDrawer.listItems.contacts",
      to: "/contacts",
      icon: <ContactPhoneOutlinedIcon />,
      permissions: ["contacts.view"],
    },
    quickAnswers: {
      labelKey: "mainDrawer.listItems.quickAnswers",
      to: "/quickAnswers",
      icon: <QuestionAnswerOutlinedIcon />,
      permissions: ["messages.view", "tickets.view"],
    },
    kanban: {
      labelKey: "mainDrawer.listItems.kanban",
      to: "/kanban",
      icon: <ViewColumnOutlinedIcon />,
      permissions: ["kanban.view"],
    },
    tasks: {
      labelKey: "mainDrawer.listItems.tasks",
      to: "/tasks",
      icon: <AssignmentTurnedInOutlinedIcon />,
      permissions: ["tasks.view"],
    },
    schedules: {
      labelKey: "mainDrawer.listItems.schedules",
      to: "/schedules",
      icon: <EventNoteOutlinedIcon />,
      permissions: ["schedules.view"],
    },
    files: {
      labelKey: "mainDrawer.listItems.files",
      to: "/files",
      icon: <FolderOutlinedIcon />,
      permissions: ["files.view"],
    },
    campaigns: {
      labelKey: "mainDrawer.listItems.campaigns",
      to: "/campaigns",
      icon: <FlagOutlinedIcon />,
      permissions: ["campaigns.view"],
    },
    informatives: {
      labelKey: "mainDrawer.listItems.informatives",
      to: "/informatives",
      icon: <AnnouncementOutlinedIcon />,
      permissions: ["informatives.view"],
    },
    dialogs: {
      labelKey: "mainDrawer.listItems.dialogs",
      to: "/dialogs",
      icon: <ChatBubbleOutlineIcon />,
      permissions: ["dialogs.view"],
    },
    flows: {
      labelKey: "mainDrawer.listItems.flows",
      to: "/flows",
      icon: <AccountTreeOutlinedIcon />,
      permissions: ["flows.view"],
    },
    tags: {
      labelKey: "mainDrawer.listItems.tags",
      to: "/tags",
      icon: <LocalOfferOutlinedIcon />,
      permissions: ["tags.view"],
    },
    contactLists: {
      labelKey: "mainDrawer.listItems.contactLists",
      to: "/contactLists",
      icon: <ListAltOutlinedIcon />,
      permissions: ["contactLists.view"],
    },
    openai: {
      labelKey: "mainDrawer.listItems.openai",
      to: "/openai",
      icon: <MemoryOutlinedIcon />,
      permissions: ["openai.settings.view", "openai.use", "openai.logs.view"],
    },
    apiAdmin: {
      labelKey: "mainDrawer.listItems.apiAdmin",
      to: "/api-admin",
      icon: <SettingsOutlinedIcon />,
      permissions: ["settings.view"],
    },
    users: {
      labelKey: "mainDrawer.listItems.users",
      to: "/users",
      icon: <PeopleAltOutlinedIcon />,
      permissions: ["users.view"],
    },
    sectors: {
      labelKey: "mainDrawer.listItems.queues",
      to: "/queues",
      icon: <AccountTreeOutlinedIcon />,
      permissions: ["sectors.view"],
    },
    connections: {
      labelKey: "mainDrawer.listItems.connections",
      to: "/connections",
      icon: (
        <Badge badgeContent={connectionWarning ? "!" : 0} color="error">
          <SyncAltIcon />
        </Badge>
      ),
      permissions: ["connections.view"],
    },
    integrations: {
      labelKey: "mainDrawer.listItems.integrations",
      to: "/integrations",
      icon: <LinkOutlinedIcon />,
      permissions: ["integrations.view"],
    },
    settings: {
      labelKey: "mainDrawer.listItems.settings",
      to: "/settings",
      icon: <SettingsOutlinedIcon />,
      permissions: ["settings.view"],
    },
  };

  const getMenuLabel = (key) => i18n.t(menuConfig[key].labelKey);
  const isVisibleItem = (key) => canAccessAny(menuConfig[key].permissions);

  const renderMenuItem = (key, className) => {
    if (!isVisibleItem(key)) {
      return null;
    }

    const label = getMenuLabel(key);
    if (!matchesSearch(label)) {
      return null;
    }

    return (
      <ListItemLink
        key={key}
        to={menuConfig[key].to}
        primary={label}
        icon={menuConfig[key].icon}
        className={className}
        denseClassName={classes.listItemRoot}
        iconClassName={clsx(classes.menuItemIcon, !isDrawerOpen && classes.collapsedIcon)}
        textClassName={clsx(classes.menuItemText, !isDrawerOpen && classes.collapsedText)}
      />
    );
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (whatsApps.length > 0) {
        const offlineWhats = whatsApps.filter((whats) => {
          return (
            whats.status === "qrcode" ||
            whats.status === "PAIRING" ||
            whats.status === "DISCONNECTED" ||
            whats.status === "TIMEOUT" ||
            whats.status === "OPENING"
          );
        });
        if (offlineWhats.length > 0) {
          setConnectionWarning(true);
        } else {
          setConnectionWarning(false);
        }
      }
    }, 2000);
    return () => clearTimeout(delayDebounceFn);
  }, [whatsApps]);

  return (
    <div onClick={drawerClose}>
      {showHeader && (
        <>
          <div className={classes.menuHeader}>
            <Typography className={classes.menuTitle}>
              {i18n.t("mainDrawer.title")}
            </Typography>
            <TextField
              value={currentSearch}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={i18n.t("mainDrawer.search.placeholder")}
              size="small"
              variant="outlined"
              fullWidth
              className={classes.searchField}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </div>
          <Divider />
        </>
      )}
      {canAccessOperation && (
        <>
          {isDrawerOpen && (
            <ListItem
              button
              onClick={() => toggleGroup("operation")}
              className={classes.groupHeader}
            >
              <ListItemText
                primary={i18n.t("mainDrawer.groups.operation")}
                primaryTypographyProps={{ className: classes.groupTitle }}
              />
            </ListItem>
          )}
          <Collapse
            in={isDrawerOpen ? openGroups.operation : true}
            timeout="auto"
            unmountOnExit
          >
            <List
              disablePadding
              className={!isDrawerOpen ? classes.collapsedList : undefined}
            >
              {renderMenuItem(
                "dashboard",
                isDrawerOpen ? classes.nestedItem : classes.collapsedItem
              )}
              {renderMenuItem(
                "chats",
                isDrawerOpen ? classes.nestedItem : classes.collapsedItem
              )}
              {renderMenuItem(
                "contacts",
                isDrawerOpen ? classes.nestedItem : classes.collapsedItem
              )}
              {renderMenuItem(
                "quickAnswers",
                isDrawerOpen ? classes.nestedItem : classes.collapsedItem
              )}
              {renderMenuItem(
                "kanban",
                isDrawerOpen ? classes.nestedItem : classes.collapsedItem
              )}
              {renderMenuItem(
                "tasks",
                isDrawerOpen ? classes.nestedItem : classes.collapsedItem
              )}
              {renderMenuItem(
                "schedules",
                isDrawerOpen ? classes.nestedItem : classes.collapsedItem
              )}
              {renderMenuItem(
                "files",
                isDrawerOpen ? classes.nestedItem : classes.collapsedItem
              )}
            </List>
          </Collapse>
          {isDrawerOpen && <Divider className={classes.groupDivider} />}
        </>
      )}

      {canAccessCommunication && (
        <>
          {isDrawerOpen && (
            <ListItem
              button
              onClick={() => toggleGroup("communication")}
              className={classes.groupHeader}
            >
              <ListItemText
                primary={i18n.t("mainDrawer.groups.communication")}
                primaryTypographyProps={{ className: classes.groupTitle }}
              />
            </ListItem>
          )}
          <Collapse
            in={isDrawerOpen ? openGroups.communication : true}
            timeout="auto"
            unmountOnExit
          >
            <List
              disablePadding
              className={!isDrawerOpen ? classes.collapsedList : undefined}
            >
              {renderMenuItem(
                "campaigns",
                isDrawerOpen ? classes.nestedItem : classes.collapsedItem
              )}
              {renderMenuItem(
                "informatives",
                isDrawerOpen ? classes.nestedItem : classes.collapsedItem
              )}
              {renderMenuItem(
                "dialogs",
                isDrawerOpen ? classes.nestedItem : classes.collapsedItem
              )}
              {renderMenuItem(
                "flows",
                isDrawerOpen ? classes.nestedItem : classes.collapsedItem
              )}
              {renderMenuItem(
                "tags",
                isDrawerOpen ? classes.nestedItem : classes.collapsedItem
              )}
              {renderMenuItem(
                "contactLists",
                isDrawerOpen ? classes.nestedItem : classes.collapsedItem
              )}
            </List>
          </Collapse>
          {isDrawerOpen && <Divider className={classes.groupDivider} />}
        </>
      )}

      {canAccessAi && (
        <>
          {isDrawerOpen && (
            <ListItem
              button
              onClick={() => toggleGroup("ai")}
              className={classes.groupHeader}
            >
              <ListItemText
                primary={i18n.t("mainDrawer.groups.aiIntegrations")}
                primaryTypographyProps={{ className: classes.groupTitle }}
              />
            </ListItem>
          )}
          <Collapse
            in={isDrawerOpen ? openGroups.ai : true}
            timeout="auto"
            unmountOnExit
          >
            <List
              disablePadding
              className={!isDrawerOpen ? classes.collapsedList : undefined}
            >
              {renderMenuItem(
                "openai",
                isDrawerOpen ? classes.nestedItem : classes.collapsedItem
              )}
              {renderMenuItem(
                "apiAdmin",
                isDrawerOpen ? classes.nestedItem : classes.collapsedItem
              )}
            </List>
          </Collapse>
          {isDrawerOpen && <Divider className={classes.groupDivider} />}
        </>
      )}

      {canAccessGovernance && (
        <>
          {isDrawerOpen && (
            <ListItem
              button
              onClick={() => toggleGroup("governance")}
              className={classes.groupHeader}
            >
              <ListItemText
                primary={i18n.t("mainDrawer.groups.governance")}
                primaryTypographyProps={{ className: classes.groupTitle }}
              />
            </ListItem>
          )}
          <Collapse
            in={isDrawerOpen ? openGroups.governance : true}
            timeout="auto"
            unmountOnExit
          >
            <List
              disablePadding
              className={!isDrawerOpen ? classes.collapsedList : undefined}
            >
              {renderMenuItem(
                "users",
                isDrawerOpen ? classes.nestedItem : classes.collapsedItem
              )}
              {renderMenuItem(
                "sectors",
                isDrawerOpen ? classes.nestedItem : classes.collapsedItem
              )}
              {renderMenuItem(
                "connections",
                isDrawerOpen ? classes.nestedItem : classes.collapsedItem
              )}
              {renderMenuItem(
                "integrations",
                isDrawerOpen ? classes.nestedItem : classes.collapsedItem
              )}
              {renderMenuItem(
                "settings",
                isDrawerOpen ? classes.nestedItem : classes.collapsedItem
              )}
            </List>
          </Collapse>
        </>
      )}
    </div>
  );
};

export default MainListItems;
