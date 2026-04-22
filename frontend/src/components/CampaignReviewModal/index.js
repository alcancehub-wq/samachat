import React, { useEffect, useMemo, useState } from "react";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography
} from "@material-ui/core";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";

const formatDateTime = value => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
};

const CampaignReviewModal = ({ open, onClose, campaignId }) => {
  const [campaign, setCampaign] = useState(null);
  const [tags, setTags] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!campaignId || !open) {
        setCampaign(null);
        return;
      }

      try {
        const [{ data: campaignData }, { data: tagData }] = await Promise.all([
          api.get(`/campaigns/${campaignId}`),
          api.get("/tags")
        ]);
        setCampaign(campaignData);
        setTags(tagData || []);
      } catch (err) {
        toastError(err);
      }
    };

    fetchData();
  }, [campaignId, open]);

  const tagNames = useMemo(() => {
    if (!campaign) {
      return "-";
    }

    const map = new Map(tags.map(tag => [tag.id, tag.name]));
    const names = (campaign.tagIds || [])
      .map(id => map.get(id))
      .filter(Boolean);

    return names.length > 0 ? names.join(", ") : "-";
  }, [campaign, tags]);

  const handleConfirmReview = async () => {
    if (!campaign) {
      return;
    }

    const nextStatus =
      campaign.status === "draft" && campaign.scheduledAt
        ? "scheduled"
        : campaign.status;

    try {
      await api.put(`/campaigns/${campaign.id}`, {
        status: nextStatus,
        reviewedAt: new Date().toISOString()
      });
      toast.success(i18n.t("campaignReview.success"));
      onClose();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{i18n.t("campaignReview.title")}</DialogTitle>
      <DialogContent dividers>
        {!campaign ? (
          <Typography color="textSecondary">
            {i18n.t("campaignReview.loading")}
          </Typography>
        ) : (
          <>
            <Typography variant="subtitle1" gutterBottom>
              {campaign.name}
            </Typography>
            <Typography color="textSecondary" gutterBottom>
              {campaign.description || "-"}
            </Typography>
            <Typography>
              {i18n.t("campaignReview.dialog")}: {campaign.dialog?.name || "-"}
            </Typography>
            <Typography>
              {i18n.t("campaignReview.list")}: {campaign.contactList?.name || "-"}
            </Typography>
            <Typography>
              {i18n.t("campaignReview.tags")}: {tagNames}
            </Typography>
            <Typography>
              {i18n.t("campaignReview.status")}: {i18n.t(`campaignModal.status.${campaign.status}`)}
            </Typography>
            <Typography>
              {i18n.t("campaignReview.scheduledAt")}: {formatDateTime(campaign.scheduledAt)}
            </Typography>
            <Typography>
              {i18n.t("campaignReview.lastStatusAt")}: {formatDateTime(campaign.lastStatusAt)}
            </Typography>
            <Typography>
              {i18n.t("campaignReview.reviewedAt")}: {formatDateTime(campaign.reviewedAt)}
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary" variant="outlined">
          {i18n.t("campaignReview.buttons.close")}
        </Button>
        <Button
          onClick={handleConfirmReview}
          color="primary"
          variant="contained"
          disabled={!campaign}
        >
          {i18n.t("campaignReview.buttons.confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CampaignReviewModal;
