import React, { useContext, useEffect, useRef, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import SearchIcon from "@material-ui/icons/Search";
import InputBase from "@material-ui/core/InputBase";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Badge from "@material-ui/core/Badge";
import MoveToInboxIcon from "@material-ui/icons/MoveToInbox";
import CheckBoxIcon from "@material-ui/icons/CheckBox";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Switch from "@material-ui/core/Switch";
import NewTicketModal from "../NewTicketModal";
import TicketsList from "../TicketsList";
import TabPanel from "../TabPanel";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../Can";
import TicketsQueueSelect from "../TicketsQueueSelect";
import { Button } from "@material-ui/core";
import TagSelect from "../TagSelect";

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
    backgroundImage: "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(250,251,252,0.96) 100%)",
  },
  tabsHeader: {
    flex: "none",
    backgroundColor: theme.palette.background.paper,
    borderBottom: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(1.25, 1.25, 0.5),
    "& .MuiTabs-flexContainer": {
      gap: theme.spacing(0.75),
    },
  },
  settingsIcon: {
    alignSelf: "center",
    marginLeft: "auto",
    padding: 8,
  },
  tab: {
    minWidth: 112,
    width: 112,
    minHeight: 46,
    borderRadius: theme.shape.borderRadius,
    color: "#6B7280 !important",
    fontWeight: 700,
    "&.MuiTab-textColorPrimary": {
      color: "#6B7280 !important",
    },
    "&.Mui-selected": {
      color: "#111111 !important",
      fontWeight: 700,
    },
    "&.MuiTab-textColorPrimary.Mui-selected": {
      color: "#111111 !important",
    },
  },
  subTabs: {
  },
  subTab: {
    color: "#6B7280 !important",
    fontWeight: 700,
    "&.MuiTab-textColorPrimary": {
      color: "#6B7280 !important",
    },
    "&.Mui-selected": {
      color: "#111111 !important",
      fontWeight: 700,
    },
    "&.MuiTab-textColorPrimary.Mui-selected": {
      color: "#111111 !important",
    },
  },
  ticketOptionsBox: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: theme.palette.background.paper,
    padding: theme.spacing(1.5),
    gap: theme.spacing(1.25),
    borderBottom: `1px solid ${theme.palette.divider}`,
    flexWrap: "wrap",
  },
  ticketOptionsPrimary: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    flexWrap: "wrap",
  },
  ticketOptionsSecondary: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    flexWrap: "wrap",
    marginLeft: "auto",
    [theme.breakpoints.down("sm")]: {
      width: "100%",
      marginLeft: 0,
    },
  },
  serachInputWrapper: {
    minWidth: 260,
    flex: "1 1 280px",
    background: theme.palette.background.default,
    display: "flex",
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(0.85, 1.25),
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: "inset 0 1px 2px rgba(15, 23, 42, 0.03)",
  },
  searchIcon: {
    color: theme.palette.text.secondary,
    marginLeft: 6,
    marginRight: 6,
    alignSelf: "center",
  },
  searchInput: {
    flex: 1,
    border: "none",
    borderRadius: theme.shape.borderRadius,
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.background.default,
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
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
    boxShadow: "none",
    borderRadius: 4,
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
    marginLeft: 0,
    padding: theme.spacing(0.35, 1),
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.default,
  },
  showAllSwitchBase: {
    color: "rgba(15, 23, 42, 0.28)",
    "&$showAllSwitchChecked": {
      color: "#FF1919",
      "& + $showAllSwitchTrack": {
        backgroundColor: "rgba(255, 25, 25, 0.42)",
        opacity: 1,
        borderColor: "transparent",
      },
    },
  },
  showAllSwitchChecked: {},
  showAllSwitchTrack: {
    backgroundColor: "rgba(15, 23, 42, 0.18)",
    opacity: 1,
  },
}));

const TicketsManager = () => {
  const classes = useStyles();
  const [searchParam, setSearchParam] = useState("");
  const [tab, setTab] = useState("open");
  const [tabOpen, setTabOpen] = useState("open");
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [showAllTickets, setShowAllTickets] = useState(false);
  const searchInputRef = useRef();
  const { user } = useContext(AuthContext);
  const [openCount, setOpenCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const userQueueIds = user.queues.map((q) => q.id);
  const [selectedQueueIds, setSelectedQueueIds] = useState(userQueueIds || []);
  const [selectedTagIds, setSelectedTagIds] = useState([]);

  useEffect(() => {
    if (user.profile.toUpperCase() === "ADMIN") {
      setShowAllTickets(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab === "search") {
      searchInputRef.current.focus();
      setSearchParam("");
    }
  }, [tab]);

  let searchTimeout;

  const handleSearch = (e) => {
    const searchedTerm = e.target.value.toLowerCase();

    clearTimeout(searchTimeout);

    if (searchedTerm === "") {
      setSearchParam(searchedTerm);
      setTab("open");
      return;
    }

    searchTimeout = setTimeout(() => {
      setSearchParam(searchedTerm);
    }, 500);
  };

  const handleChangeTab = (e, newValue) => {
    setTab(newValue);
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
            value={"closed"}
            icon={<CheckBoxIcon />}
            label={i18n.t("tickets.tabs.closed.title")}
            classes={{ root: classes.tab }}
          />
          <Tab
            value={"search"}
            icon={<SearchIcon />}
            label={i18n.t("tickets.tabs.search.title")}
            classes={{ root: classes.tab }}
          />
        </Tabs>
      </Paper>
      <Paper square elevation={0} className={classes.ticketOptionsBox}>
        {tab === "search" ? (
          <div className={classes.serachInputWrapper}>
            <SearchIcon className={classes.searchIcon} />
            <InputBase
              className={classes.searchInput}
              inputRef={searchInputRef}
              placeholder={i18n.t("tickets.search.placeholder")}
              type="search"
              onChange={handleSearch}
            />
          </div>
        ) : (
          <>
            <div className={classes.ticketOptionsPrimary}>
              <Button
                variant="contained"
                className={classes.newTicketButton}
                onClick={() => setNewTicketModalOpen(true)}
              >
                {i18n.t("ticketsManager.buttons.newTicket")}
              </Button>
              <Can
                role={user.profile}
                perform="tickets-manager:showall"
                yes={() => (
                  <FormControlLabel
                    className={classes.showAllControl}
                    label={i18n.t("tickets.buttons.showAll")}
                    labelPlacement="start"
                    control={
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
                    }
                  />
                )}
              />
            </div>
            <div className={classes.ticketOptionsSecondary}>
              <TagSelect
                selectedTagIds={selectedTagIds}
                onChange={setSelectedTagIds}
                label={i18n.t("ticketsManager.tagsFilter")}
                style={{ minWidth: 180 }}
              />
              <TicketsQueueSelect
                selectedQueueIds={selectedQueueIds}
                userQueues={user?.queues}
                onChange={(values) => setSelectedQueueIds(values)}
              />
            </div>
          </>
        )}
      </Paper>
      <TabPanel value={tab} name="open" className={classes.ticketsWrapper}>
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
      <TabPanel value={tab} name="closed" className={classes.ticketsWrapper}>
        <TicketsList
          status="closed"
          showAll={true}
          selectedQueueIds={selectedQueueIds}
          selectedTagIds={selectedTagIds}
        />
      </TabPanel>
      <TabPanel value={tab} name="search" className={classes.ticketsWrapper}>
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
