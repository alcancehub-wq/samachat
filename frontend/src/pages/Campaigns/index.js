import React, { useEffect, useReducer, useState } from "react";

import openSocket from "../../services/socket-io";

import {
  Button,
  IconButton,
  makeStyles,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  TextField,
  InputAdornment
} from "@material-ui/core";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import Title from "../../components/Title";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import { DeleteOutline, Edit, Visibility } from "@material-ui/icons";
import CampaignModal from "../../components/CampaignModal";
import CampaignReviewModal from "../../components/CampaignReviewModal";
import { toast } from "react-toastify";
import ConfirmationModal from "../../components/ConfirmationModal";
import SearchIcon from "@material-ui/icons/Search";

const useStyles = makeStyles(theme => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1.5, 2),
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
    gap: theme.spacing(0.5)
  },
  headerSubtitle: {
    color: theme.palette.text.secondary,
    fontSize: "0.9rem"
  },
  tagList: {
    maxWidth: 260,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  }
}));

const reducer = (state, action) => {
  if (action.type === "LOAD_CAMPAIGNS") {
    const campaigns = action.payload;
    const newCampaigns = [];

    campaigns.forEach(campaign => {
      const campaignIndex = state.findIndex(item => item.id === campaign.id);
      if (campaignIndex !== -1) {
        state[campaignIndex] = campaign;
      } else {
        newCampaigns.push(campaign);
      }
    });

    return [...state, ...newCampaigns];
  }

  if (action.type === "UPDATE_CAMPAIGN") {
    const campaign = action.payload;
    const campaignIndex = state.findIndex(item => item.id === campaign.id);

    if (campaignIndex !== -1) {
      state[campaignIndex] = campaign;
      return [...state];
    }

    return [campaign, ...state];
  }

  if (action.type === "DELETE_CAMPAIGN") {
    const campaignId = action.payload;
    const campaignIndex = state.findIndex(item => item.id === campaignId);
    if (campaignIndex !== -1) {
      state.splice(campaignIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const Campaigns = () => {
  const classes = useStyles();

  const [campaigns, dispatch] = useReducer(reducer, []);
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [tags, setTags] = useState([]);

  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  useEffect(() => {
    dispatch({ type: "RESET" });
  }, [searchParam]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [campaignResponse, tagResponse] = await Promise.all([
          api.get("/campaigns", {
            params: { searchParam }
          }),
          api.get("/tags")
        ]);
        dispatch({ type: "LOAD_CAMPAIGNS", payload: campaignResponse.data });
        setTags(tagResponse.data || []);

        setLoading(false);
      } catch (err) {
        toastError(err);
        setLoading(false);
      }
    })();
  }, [searchParam]);

  useEffect(() => {
    const socket = openSocket();

    socket.on("campaign", data => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_CAMPAIGN", payload: data.campaign });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_CAMPAIGN", payload: +data.campaignId });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleOpenCampaignModal = () => {
    setCampaignModalOpen(true);
    setSelectedCampaign(null);
  };

  const handleCloseCampaignModal = () => {
    setCampaignModalOpen(false);
    setSelectedCampaign(null);
  };

  const handleEditCampaign = campaign => {
    setSelectedCampaign(campaign);
    setCampaignModalOpen(true);
  };

  const handleOpenReview = campaign => {
    setSelectedCampaign(campaign);
    setReviewModalOpen(true);
  };

  const handleCloseReview = () => {
    setReviewModalOpen(false);
    setSelectedCampaign(null);
  };

  const handleCloseConfirmationModal = () => {
    setConfirmModalOpen(false);
    setSelectedCampaign(null);
  };

  const handleDeleteCampaign = async campaignId => {
    try {
      await api.delete(`/campaigns/${campaignId}`);
      toast.success(i18n.t("campaigns.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setSelectedCampaign(null);
  };

  const handleSearch = event => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const formatDate = dateValue => {
    if (!dateValue) {
      return "-";
    }

    return new Date(dateValue).toLocaleString();
  };

  const resolveTagNames = tagIds => {
    if (!tagIds || tagIds.length === 0) {
      return "-";
    }

    const map = new Map(tags.map(tag => [tag.id, tag.name]));
    const names = tagIds
      .map(id => map.get(id))
      .filter(Boolean)
      .join(", ");

    return names || "-";
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={
          selectedCampaign &&
          `${i18n.t("campaigns.confirmationModal.deleteTitle")} ${selectedCampaign.name}?`
        }
        open={confirmModalOpen}
        onClose={handleCloseConfirmationModal}
        onConfirm={() => handleDeleteCampaign(selectedCampaign.id)}
      >
        {i18n.t("campaigns.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <CampaignModal
        open={campaignModalOpen}
        onClose={handleCloseCampaignModal}
        campaignId={selectedCampaign?.id}
      />
      <CampaignReviewModal
        open={reviewModalOpen}
        onClose={handleCloseReview}
        campaignId={selectedCampaign?.id}
      />
      <MainHeader>
        <div className={classes.headerTitle}>
          <Title>{i18n.t("campaigns.title")}</Title>
          <Typography className={classes.headerSubtitle}>
            {i18n.t("campaigns.subtitle")}
          </Typography>
        </div>
        <MainHeaderButtonsWrapper>
          <TextField
            placeholder={i18n.t("campaigns.searchPlaceholder")}
            type="search"
            value={searchParam}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon style={{ color: "gray" }} />
                </InputAdornment>
              )
            }}
          />
          <Button variant="contained" color="primary" onClick={handleOpenCampaignModal}>
            {i18n.t("campaigns.buttons.add")}
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper className={classes.mainPaper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">{i18n.t("campaigns.table.name")}</TableCell>
              <TableCell align="center">{i18n.t("campaigns.table.dialog")}</TableCell>
              <TableCell align="center">{i18n.t("campaigns.table.list")}</TableCell>
              <TableCell align="center">{i18n.t("campaigns.table.tags")}</TableCell>
              <TableCell align="center">{i18n.t("campaigns.table.status")}</TableCell>
              <TableCell align="center">{i18n.t("campaigns.table.scheduledAt")}</TableCell>
              <TableCell align="center">{i18n.t("campaigns.table.lastStatusAt")}</TableCell>
              <TableCell align="center">{i18n.t("campaigns.table.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <>
              {campaigns.map(campaign => (
                <TableRow key={campaign.id}>
                  <TableCell align="center">{campaign.name}</TableCell>
                  <TableCell align="center">
                    {campaign.dialog?.name || "-"}
                  </TableCell>
                  <TableCell align="center">
                    {campaign.contactList?.name || "-"}
                  </TableCell>
                  <TableCell align="center" className={classes.tagList}>
                    {resolveTagNames(campaign.tagIds)}
                  </TableCell>
                  <TableCell align="center">
                    {i18n.t(`campaignModal.status.${campaign.status || "draft"}`)}
                  </TableCell>
                  <TableCell align="center">
                    {formatDate(campaign.scheduledAt)}
                  </TableCell>
                  <TableCell align="center">
                    {formatDate(campaign.lastStatusAt || campaign.updatedAt)}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => handleEditCampaign(campaign)}>
                      <Edit />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleOpenReview(campaign)}>
                      <Visibility />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedCampaign(campaign);
                        setConfirmModalOpen(true);
                      }}
                    >
                      <DeleteOutline />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {loading && <TableRowSkeleton columns={8} />}
            </>
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
};

export default Campaigns;
