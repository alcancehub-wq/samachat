import React, { useContext, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import SearchIcon from "@material-ui/icons/Search";
import IconButton from "@material-ui/core/IconButton";
import ClearIcon from "@material-ui/icons/Clear";
import InputBase from "@material-ui/core/InputBase";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Badge from "@material-ui/core/Badge";
import MoveToInboxIcon from "@material-ui/icons/MoveToInbox";
import CheckBoxIcon from "@material-ui/icons/CheckBox";
import AccessTimeIcon from "@material-ui/icons/AccessTime";
import Switch from "@material-ui/core/Switch";
import NewTicketModal from "../NewTicketModal";
import TicketsList from "../TicketsList";
import TabPanel from "../TabPanel";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import TicketsQueueSelect from "../TicketsQueueSelect";
import { Button } from "@material-ui/core";
import TagSelect from "../TagSelect";
import { useLocation } from "react-router-dom";

const useStyles = makeStyles((theme) => ({
  ticketsWrapper: {
    position: "relative",
    display: "flex",
    height: "100%",
    flexDirection: "column",
    overflow: "hidden",
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    backgroundImage: theme.palette.type === "dark"
      ? theme.custom.panelGradientSoft
      : "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(250,251,252,0.96) 100%)",
  },
  tabsHeader: {
    flex: "none",
    backgroundColor: theme.palette.background.paper,
    borderBottom: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(1.25, 1.5, 0.75),
    "& .MuiTabs-flexContainer": {
      gap: theme.spacing(0.75),
    },
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1, 1, 0.5),
    },
  },
  settingsIcon: {
    alignSelf: "center",
    marginLeft: "auto",
    padding: 8,
  },
  tab: {
    minWidth: 0,
    minHeight: 42,
    borderRadius: 12,
    padding: theme.spacing(0.25, 1),
    color: `${theme.palette.text.secondary} !important`,
    fontWeight: 700,
    textTransform: "none",
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.default,
    "& .MuiTab-wrapper": {
      flexDirection: "row",
      gap: theme.spacing(0.75),
      fontSize: "0.92rem",
    },
    "& svg": {
      fontSize: "1.05rem",
      marginBottom: "0 !important",
    },
    "&.MuiTab-textColorPrimary": {
      color: `${theme.palette.text.secondary} !important`,
    },
    "&.Mui-selected": {
      color: `${theme.palette.text.primary} !important`,
      fontWeight: 700,
      borderColor: "rgba(229, 57, 53, 0.16)",
      backgroundColor: theme.palette.type === "dark" ? theme.custom.softBackground : "rgba(229, 57, 53, 0.08)",
    },
    "&.MuiTab-textColorPrimary.Mui-selected": {
      color: `${theme.palette.text.primary} !important`,
    },
  },
  subTabs: {
    backgroundColor: theme.palette.background.paper,
    borderBottom: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(0.75, 1.5, 1),
    overflow: "visible",
    "& .MuiTabs-flexContainer": {
      gap: theme.spacing(0.75),
    },
    "& .MuiTabs-scroller": {
      overflow: "visible !important",
    },
  },
  subTab: {
    color: `${theme.palette.text.secondary} !important`,
    fontWeight: 700,
    minHeight: 46,
    minWidth: 0,
    borderRadius: 12,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.default,
    textTransform: "none",
    padding: theme.spacing(0.5, 1),
    "& .MuiTab-wrapper": {
      minHeight: 30,
      lineHeight: 1.15,
    },
    "&.MuiTab-textColorPrimary": {
      color: `${theme.palette.text.secondary} !important`,
    },
    "&.Mui-selected": {
      color: `${theme.palette.text.primary} !important`,
      fontWeight: 700,
      borderColor: "rgba(229, 57, 53, 0.16)",
      backgroundColor: theme.palette.type === "dark" ? theme.custom.softBackground : "rgba(229, 57, 53, 0.08)",
    },
    "&.MuiTab-textColorPrimary.Mui-selected": {
      color: `${theme.palette.text.primary} !important`,
    },
  },
  ticketOptionsBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    background: theme.palette.background.paper,
    padding: theme.spacing(1, 1.5, 1.25),
    gap: theme.spacing(0.9),
    borderBottom: `1px solid ${theme.palette.divider}`,
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(0.85, 1, 1),
    },
  },
  ticketOptionsPrimary: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(0.75),
    flexWrap: "wrap",
    width: "100%",
  },
  ticketOptionsSecondary: {
    display: "flex",
    alignItems: "stretch",
    gap: theme.spacing(0.75),
    flexWrap: "nowrap",
    width: "100%",
    [theme.breakpoints.down("sm")]: {
      flexWrap: "wrap",
      alignItems: "center",
      gap: theme.spacing(0.5),
    },
  },
  showAllInline: {
    flex: "1 1 140px",
    minWidth: 140,
  },
  filterField: {
    flex: "1 1 160px",
    minWidth: 140,
  },
  serachInputWrapper: {
    minWidth: 220,
    flex: "1 1 280px",
    background: theme.palette.background.default,
    display: "flex",
    alignItems: "center",
    borderRadius: 14,
    padding: theme.spacing(0.35, 1),
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: "none",
  },
  searchInputActive: {
    borderColor: "rgba(255, 25, 25, 0.22)",
    boxShadow: "0 0 0 3px rgba(255, 25, 25, 0.08)",
  },
  searchIcon: {
    color: theme.palette.text.secondary,
    marginLeft: 4,
    marginRight: 8,
    alignSelf: "center",
  },
  searchInput: {
    flex: 1,
    border: "none",
    borderRadius: theme.shape.borderRadius,
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.background.default,
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: theme.spacing(0.25),
  },
  badge: {
    right: "-8px",
  },
  pendingBadge: {
    backgroundColor: "#FF1919",
    color: "#FFFFFF",
  },
  openBadge: {
    backgroundColor: "#FF1919",
    color: "#FFFFFF",
  },
  show: {
    display: "block",
  },
  hide: {
    display: "none !important",
  },
  newTicketButton: {
    whiteSpace: "nowrap",
    minHeight: 40,
    paddingLeft: theme.spacing(1.5),
    paddingRight: theme.spacing(1.5),
    boxShadow: "none",
    borderRadius: 12,
    textTransform: "none",
    fontWeight: 600,
    backgroundColor: "#FF1919",
    color: "#FFFFFF",
    "&:hover": {
      backgroundColor: "#E11414",
      boxShadow: "none",
    },
  },
  showAllControl: {
    margin: 0,
    marginLeft: 0,
    width: "100%",
    height: 40,
    minHeight: 40,
    padding: theme.spacing(0.15, 1),
    borderRadius: 12,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.default,
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    "& .MuiSwitch-root": {
      marginLeft: theme.spacing(0.75),
      marginRight: 0,
      flexShrink: 0,
    },
  },
  showAllLabel: {
    color: theme.palette.text.primary,
    fontWeight: 600,
    fontSize: "0.92rem",
    lineHeight: 1,
  },
  showAllSwitchBase: {
    color: theme.palette.type === "dark" ? "rgba(243, 246, 252, 0.42)" : "rgba(15, 23, 42, 0.28)",
    "&$showAllSwitchChecked": {
      color: "#FF1919",
      "& + $showAllSwitchTrack": {
        backgroundColor: theme.palette.type === "dark" ? "rgba(255, 90, 95, 0.56)" : "rgba(255, 25, 25, 0.42)",
        opacity: 1,
        borderColor: "transparent",
      },
    },
  },
  showAllSwitchChecked: {},
  showAllSwitchTrack: {
    backgroundColor: theme.palette.type === "dark" ? "rgba(148, 163, 184, 0.28)" : "rgba(15, 23, 42, 0.18)",
    opacity: 1,
  },
}));

const TicketsManager = () => {
  const classes = useStyles();
  const [searchParam, setSearchParam] = useState("");
  const [searchInputValue, setSearchInputValue] = useState("");
  const [tab, setTab] = useState("open");
  const [tabOpen, setTabOpen] = useState("open");
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [showAllTickets, setShowAllTickets] = useState(false);
  const searchInputRef = useRef();
  const searchTimeoutRef = useRef();
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const [openCount, setOpenCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [followUpCount, setFollowUpCount] = useState(0);
  const userQueueIds = user.queues.map((q) => q.id);
  const [selectedQueueIds, setSelectedQueueIds] = useState(userQueueIds || []);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const canShowAllTickets = user?.profile?.toUpperCase() === "ADMIN";
  const existingTicketSearch =
    location.state && typeof location.state.existingTicketSearch === "string"
      ? location.state.existingTicketSearch.trim()
      : "";
  const dashboardFilters =
    location.state && location.state.dashboardFilters
      ? location.state.dashboardFilters
      : null;

  useEffect(() => {
    if (canShowAllTickets) {
      setShowAllTickets(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canShowAllTickets]);

  const activeTab = searchParam ? "search" : tab;

  useEffect(() => {
    if (!existingTicketSearch) {
      return;
    }

    setSearchInputValue(existingTicketSearch);
    setSearchParam(existingTicketSearch.toLowerCase());
  }, [existingTicketSearch]);

  useEffect(() => {
    if (!dashboardFilters) {
      return;
    }

    if (dashboardFilters.tab) {
      setTab(dashboardFilters.tab);
    }

    if (dashboardFilters.tabOpen) {
      setTabOpen(dashboardFilters.tabOpen);
    }

    if (Array.isArray(dashboardFilters.queueIds)) {
      setSelectedQueueIds(dashboardFilters.queueIds);
    }

    if (Array.isArray(dashboardFilters.tagIds)) {
      setSelectedTagIds(dashboardFilters.tagIds);
    }

    if (
      typeof dashboardFilters.showAllTickets === "boolean" &&
      canShowAllTickets
    ) {
      setShowAllTickets(dashboardFilters.showAllTickets);
    }
  }, [dashboardFilters, canShowAllTickets]);

  const handleSearch = (e) => {
    const inputValue = e.target.value;
    const searchedTerm = inputValue.toLowerCase();

    setSearchInputValue(inputValue);

    clearTimeout(searchTimeoutRef.current);

    if (searchedTerm === "") {
      setSearchParam(searchedTerm);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      setSearchParam(searchedTerm);
    }, 500);
  };

  const handleChangeTab = (e, newValue) => {
    setTab(newValue);
  };

  const handleClearSearch = () => {
    clearTimeout(searchTimeoutRef.current);
    setSearchInputValue("");
    setSearchParam("");
    searchInputRef.current?.focus();
  };

  const handleChangeTabOpen = (e, newValue) => {
    setTabOpen(newValue);
  };

  const applyPanelStyle = (status) => {
    if (tabOpen !== status) {
      return { width: 0, height: 0 };
    }
  };

  return (
    <Paper elevation={0} variant="outlined" className={classes.ticketsWrapper}>
      <NewTicketModal
        modalOpen={newTicketModalOpen}
        onClose={(e) => setNewTicketModalOpen(false)}
      />
      <Paper elevation={0} square className={classes.tabsHeader}>
        <Tabs
          value={tab}
          onChange={handleChangeTab}
          variant="fullWidth"
          textColor="inherit"
          aria-label="icon label tabs example"
          TabIndicatorProps={{ style: { display: "none" } }}
        >
          <Tab
            value={"open"}
            icon={<MoveToInboxIcon />}
            label={i18n.t("tickets.tabs.open.title")}
            classes={{ root: classes.tab }}
          />
          <Tab
            value={"followUp"}
            icon={<AccessTimeIcon />}
            label={
              <Badge
                className={classes.badge}
                badgeContent={followUpCount}
                color="primary"
                classes={{ badge: classes.openBadge }}
              >
                {i18n.t("tickets.tabs.followUp.title")}
              </Badge>
            }
            classes={{ root: classes.tab }}
          />
          <Tab
            value={"closed"}
            icon={<CheckBoxIcon />}
            label={i18n.t("tickets.tabs.closed.title")}
            classes={{ root: classes.tab }}
          />
        </Tabs>
      </Paper>
      <Paper square elevation={0} className={classes.ticketOptionsBox}>
        <div className={classes.ticketOptionsPrimary}>
          <div
            className={clsx(classes.serachInputWrapper, {
              [classes.searchInputActive]: Boolean(searchInputValue),
            })}
          >
            <SearchIcon className={classes.searchIcon} />
            <InputBase
              className={classes.searchInput}
              inputRef={searchInputRef}
              placeholder={i18n.t("tickets.search.placeholder")}
              type="search"
              value={searchInputValue}
              onChange={handleSearch}
            />
            {searchInputValue ? (
              <IconButton
                size="small"
                onClick={handleClearSearch}
                className={classes.clearSearchButton}
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            ) : null}
          </div>
          <Button
            variant="contained"
            className={classes.newTicketButton}
            onClick={() => setNewTicketModalOpen(true)}
          >
            {i18n.t("ticketsManager.buttons.newTicket")}
          </Button>
        </div>
        <div className={classes.ticketOptionsSecondary}>
          {canShowAllTickets && (
            <div className={clsx(classes.showAllControl, classes.showAllInline)}>
              <span className={classes.showAllLabel}>{i18n.t("tickets.buttons.showAll")}</span>
              <Switch
                size="small"
                checked={showAllTickets}
                classes={{
                  switchBase: classes.showAllSwitchBase,
                  checked: classes.showAllSwitchChecked,
                  track: classes.showAllSwitchTrack,
                }}
                onChange={() =>
                  setShowAllTickets((prevState) => !prevState)
                }
                name="showAllTickets"
                color="primary"
              />
            </div>
          )}
          <TagSelect
            selectedTagIds={selectedTagIds}
            onChange={setSelectedTagIds}
            label={i18n.t("ticketsManager.tagsFilter")}
            style={{ minWidth: 140, flex: "1 1 0" }}
          />
          <div className={classes.filterField}>
            <TicketsQueueSelect
              selectedQueueIds={selectedQueueIds}
              userQueues={user?.queues}
              onChange={(values) => setSelectedQueueIds(values)}
              style={{ width: "100%", marginTop: 0 }}
            />
          </div>
        </div>
      </Paper>
      <TabPanel value={activeTab} name="open" className={classes.ticketsWrapper}>
        <Tabs
          value={tabOpen}
          onChange={handleChangeTabOpen}
          textColor="inherit"
          variant="fullWidth"
          className={classes.subTabs}
          TabIndicatorProps={{ style: { display: "none" } }}
        >
          <Tab
            label={
              <Badge
                className={classes.badge}
                badgeContent={openCount}
                color="primary"
                classes={{ badge: classes.openBadge }}
              >
                {i18n.t("ticketsList.assignedHeader")}
              </Badge>
            }
            value={"open"}
            className={classes.subTab}
          />
          <Tab
            label={
              <Badge
                className={classes.badge}
                badgeContent={pendingCount}
                color="secondary"
                classes={{ badge: classes.pendingBadge }}
              >
                {i18n.t("ticketsList.pendingHeader")}
              </Badge>
            }
            value={"pending"}
            className={classes.subTab}
          />
        </Tabs>
        <Paper className={classes.ticketsWrapper}>
          <TicketsList
            status="open"
            showAll={showAllTickets}
            selectedQueueIds={selectedQueueIds}
            updateCount={(val) => setOpenCount(val)}
            style={applyPanelStyle("open")}
            selectedTagIds={selectedTagIds}
          />
          <TicketsList
            status="pending"
            selectedQueueIds={selectedQueueIds}
            updateCount={(val) => setPendingCount(val)}
            style={applyPanelStyle("pending")}
            selectedTagIds={selectedTagIds}
          />
        </Paper>
      </TabPanel>
      <TabPanel value={activeTab} name="closed" className={classes.ticketsWrapper}>
        <TicketsList
          status="closed"
          showAll={true}
          selectedQueueIds={selectedQueueIds}
          selectedTagIds={selectedTagIds}
        />
      </TabPanel>
      <TabPanel value={activeTab} name="followUp" className={classes.ticketsWrapper}>
        <TicketsList
          status="closed"
          showAll={true}
          selectedQueueIds={selectedQueueIds}
          selectedTagIds={selectedTagIds}
          followUp="true"
          updateCount={(val) => setFollowUpCount(val)}
        />
      </TabPanel>
      <TabPanel value={activeTab} name="search" className={classes.ticketsWrapper}>
        <TicketsList
          searchParam={searchParam}
          showAll={true}
          selectedQueueIds={selectedQueueIds}
          selectedTagIds={selectedTagIds}
        />
      </TabPanel>
    </Paper>
  );
};

export default TicketsManager;
