import React, { useContext, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import useMediaQuery from "@material-ui/core/useMediaQuery";
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
import ChatBubbleOutlineIcon from "@material-ui/icons/ChatBubbleOutline";
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
    [theme.breakpoints.down("sm")]: {
      backgroundColor: theme.palette.background.paper,
      backgroundImage: "none",
      border: 0,
      borderRadius: 0,
    },
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
      display: "none",
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
    [theme.breakpoints.down("sm")]: {
      minHeight: 36,
      minWidth: "fit-content",
      padding: theme.spacing(0.35, 1.15),
      borderRadius: 999,
      "& .MuiTab-wrapper": {
        gap: theme.spacing(0.5),
        fontSize: "0.84rem",
      },
      "& svg": {
        display: "none",
      },
    },
  },
  tabLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: theme.spacing(0.6),
    whiteSpace: "nowrap",
  },
  tabCount: {
    minWidth: 18,
    height: 18,
    padding: theme.spacing(0, 0.55),
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.72rem",
    fontWeight: 700,
    color: "#FFFFFF",
    backgroundColor: "#FF1919",
    lineHeight: 1,
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
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(0, 1, 0.75),
      borderBottom: 0,
      "& .MuiTabs-scroller": {
        overflow: "hidden !important",
      },
      "& .MuiTabs-flexContainer": {
        gap: theme.spacing(0.5),
        width: "100%",
      },
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
    [theme.breakpoints.down("sm")]: {
      minHeight: 42,
      minWidth: 0,
      flex: 1,
      maxWidth: "none",
      borderRadius: 999,
      padding: theme.spacing(0.45, 1.1),
      "& .MuiTab-wrapper": {
        minHeight: 0,
      },
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
      padding: theme.spacing(0.35, 1, 0.85),
      gap: theme.spacing(0.75),
      borderBottom: 0,
    },
  },
  ticketOptionsPrimary: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(0.75),
    flexWrap: "wrap",
    width: "100%",
    [theme.breakpoints.down("sm")]: {
      flexDirection: "column",
      alignItems: "stretch",
      gap: theme.spacing(0.75),
    },
  },
  ticketOptionsSecondary: {
    display: "flex",
    alignItems: "stretch",
    gap: theme.spacing(0.75),
    flexWrap: "nowrap",
    width: "100%",
    [theme.breakpoints.down("sm")]: {
      flexWrap: "nowrap",
      alignItems: "stretch",
      gap: theme.spacing(0.5),
      overflowX: "hidden",
      paddingBottom: theme.spacing(0.25),
    },
  },
  showAllInline: {
    flex: "1 1 140px",
    minWidth: 140,
    [theme.breakpoints.down("sm")]: {
      flex: 1,
      minWidth: 0,
    },
  },
  filterField: {
    flex: "1 1 160px",
    minWidth: 140,
    [theme.breakpoints.down("sm")]: {
      flex: 1,
      minWidth: 0,
    },
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
    [theme.breakpoints.down("sm")]: {
      minWidth: 0,
      width: "100%",
      flex: "1 1 auto",
      borderRadius: 999,
      padding: theme.spacing(0.45, 1.1),
    },
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
    display: "inline-flex",
    alignItems: "center",
    gap: theme.spacing(0.8),
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
    [theme.breakpoints.down("sm")]: {
      position: "fixed",
      right: theme.spacing(2),
      bottom: theme.spacing(2.5),
      zIndex: 20,
      width: 58,
      minWidth: 58,
      height: 58,
      minHeight: 58,
      padding: 0,
      borderRadius: 18,
      boxShadow: "0 14px 28px rgba(255, 25, 25, 0.24)",
    },
  },
  newTicketButtonText: {
    [theme.breakpoints.down("sm")]: {
      display: "none",
    },
  },
  newTicketButtonIcon: {
    fontSize: "1.15rem",
    flexShrink: 0,
  },
  showAllControl: {
    width: "100%",
    height: 39,
    minHeight: 39,
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(0.5),
    padding: theme.spacing(0, 1.5),
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
    [theme.breakpoints.down("sm")]: {
      height: 42,
      minHeight: 42,
      width: "100%",
      marginTop: 0,
      marginBottom: 0,
      borderRadius: 999,
      padding: theme.spacing(0, 1.1),
      minWidth: 0,
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
  selectSurface: {
    [theme.breakpoints.down("sm")]: {
      minWidth: 0,
      flex: 1,
      width: "100%",
      "& .MuiFormControl-root": {
        margin: "0 !important",
        width: "100%",
      },
      "& .MuiInputLabel-outlined": {
        transform: "translate(14px, 14px) scale(1)",
        fontSize: "0.84rem",
      },
      "& .MuiInputLabel-shrink": {
        transform: "translate(14px, -6px) scale(0.75)",
      },
      "& .MuiOutlinedInput-root": {
        minHeight: 42,
        borderRadius: 999,
        backgroundColor: theme.palette.background.default,
      },
      "& .MuiSelect-outlined": {
        paddingTop: 11,
        paddingBottom: 11,
        fontSize: "0.84rem",
      },
    },
  },
}));

const TicketsManager = () => {
  const classes = useStyles();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
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
      return { display: "none" };
    }
  };

  const renderTabLabel = (label, count) => (
    <span className={classes.tabLabel}>
      <span>{label}</span>
      {typeof count === "number" && count > 0 ? (
        <span className={classes.tabCount}>{count}</span>
      ) : null}
    </span>
  );

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
          variant={isMobile ? "scrollable" : "fullWidth"}
          scrollButtons={isMobile ? "auto" : "off"}
          textColor="inherit"
          aria-label="icon label tabs example"
          TabIndicatorProps={{ style: { display: "none" } }}
        >
          <Tab
            value={"open"}
            icon={isMobile ? undefined : <MoveToInboxIcon />}
            label={renderTabLabel(i18n.t("tickets.tabs.open.title"))}
            classes={{ root: classes.tab }}
          />
          <Tab
            value={"followUp"}
            icon={isMobile ? undefined : <AccessTimeIcon />}
            label={
              isMobile ? (
                renderTabLabel(i18n.t("tickets.tabs.followUp.title"), followUpCount)
              ) : (
                <Badge
                  className={classes.badge}
                  badgeContent={followUpCount}
                  color="primary"
                  classes={{ badge: classes.openBadge }}
                >
                  {i18n.t("tickets.tabs.followUp.title")}
                </Badge>
              )
            }
            classes={{ root: classes.tab }}
          />
          <Tab
            value={"closed"}
            icon={isMobile ? undefined : <CheckBoxIcon />}
            label={renderTabLabel(i18n.t("tickets.tabs.closed.title"))}
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
            <ChatBubbleOutlineIcon className={classes.newTicketButtonIcon} />
            <span className={classes.newTicketButtonText}>
              {i18n.t("ticketsManager.buttons.newTicket")}
            </span>
          </Button>
        </div>
        <div className={classes.ticketOptionsSecondary}>
          {canShowAllTickets && (
            <div className={classes.showAllInline}>
              <div className={classes.showAllControl}>
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
            </div>
          )}
          <TagSelect
            selectedTagIds={selectedTagIds}
            onChange={setSelectedTagIds}
            label={i18n.t("ticketsManager.tagsFilter")}
            style={{ minWidth: 140, flex: "1 1 0" }}
            className={classes.selectSurface}
          />
          <div className={clsx(classes.filterField, classes.selectSurface)}>
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
          scrollButtons="off"
          className={classes.subTabs}
          TabIndicatorProps={{ style: { display: "none" } }}
        >
          <Tab
            label={
              isMobile ? (
                renderTabLabel(i18n.t("ticketsList.assignedHeader"), openCount)
              ) : (
                <Badge
                  className={classes.badge}
                  badgeContent={openCount}
                  color="primary"
                  classes={{ badge: classes.openBadge }}
                >
                  {i18n.t("ticketsList.assignedHeader")}
                </Badge>
              )
            }
            value={"open"}
            className={classes.subTab}
          />
          <Tab
            label={
              isMobile ? (
                renderTabLabel(i18n.t("ticketsList.pendingHeader"), pendingCount)
              ) : (
                <Badge
                  className={classes.badge}
                  badgeContent={pendingCount}
                  color="secondary"
                  classes={{ badge: classes.pendingBadge }}
                >
                  {i18n.t("ticketsList.pendingHeader")}
                </Badge>
              )
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
            showAll={showAllTickets}
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
          showAll={canShowAllTickets}
          selectedQueueIds={selectedQueueIds}
          selectedTagIds={selectedTagIds}
        />
      </TabPanel>
      <TabPanel value={activeTab} name="followUp" className={classes.ticketsWrapper}>
        <TicketsList
          status="closed"
          showAll={canShowAllTickets}
          selectedQueueIds={selectedQueueIds}
          selectedTagIds={selectedTagIds}
          followUp="true"
          updateCount={(val) => setFollowUpCount(val)}
        />
      </TabPanel>
      <TabPanel value={activeTab} name="search" className={classes.ticketsWrapper}>
        <TicketsList
          searchParam={searchParam}
          showAll={canShowAllTickets}
          selectedQueueIds={selectedQueueIds}
          selectedTagIds={selectedTagIds}
        />
      </TabPanel>
    </Paper>
  );
};

export default TicketsManager;
