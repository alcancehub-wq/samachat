import React, { useState, useContext } from "react";

import MenuItem from "@material-ui/core/MenuItem";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import ConfirmationModal from "../ConfirmationModal";
import { Menu } from "@material-ui/core";
import { ReplyMessageContext } from "../../context/ReplyingMessage/ReplyingMessageContext";
import toastError from "../../errors/toastError";

const MessageOptionsMenu = ({
  message,
  menuOpen,
  handleClose,
  anchorEl,
  onMessageReplaced
}) => {
  const { setReplyingMessage } = useContext(ReplyMessageContext);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendConfirmationOpen, setResendConfirmationOpen] = useState(false);

  const handleDeleteMessage = async () => {
    try {
      await api.delete(`/messages/${message.id}`);
    } catch (err) {
      toastError(err);
    }
  };

  const handleResendRequest = () => {
    handleClose();

    if (Number(message.ack) === -2) {
      setResendConfirmationOpen(true);
      return;
    }

    handleResendMessage();
  };

  const handleResendMessage = async () => {
    if (resending) {
      return;
    }

    setResendConfirmationOpen(false);
    setResending(true);
    handleClose();

    try {
      const { data } = await api.post(
        `/messages/${message.id}/resend`
      );

      if (
        data?.previousMessageId &&
        data?.message
      ) {
        onMessageReplaced?.(
          data.previousMessageId,
          data.message
        );
      }
    } catch (err) {
      window.dispatchEvent(
        new Event("refreshMessages")
      );
      toastError(err);
    } finally {
      setResending(false);
    }
  };

  const hanldeReplyMessage = () => {
    setReplyingMessage(message);
    handleClose();
  };

  const handleOpenConfirmationModal = (e) => {
    setConfirmationOpen(true);
    handleClose();
  };

  return (
    <>
      <ConfirmationModal
        title={i18n.t("messageOptionsMenu.confirmationModal.title")}
        open={confirmationOpen}
        onClose={setConfirmationOpen}
        onConfirm={handleDeleteMessage}
      >
        {i18n.t("messageOptionsMenu.confirmationModal.message")}
      </ConfirmationModal>

      <ConfirmationModal
        title={i18n.t("messageOptionsMenu.resendConfirmationModal.title")}
        open={resendConfirmationOpen}
        onClose={setResendConfirmationOpen}
        onConfirm={handleResendMessage}
      >
        {i18n.t("messageOptionsMenu.resendConfirmationModal.message")}
      </ConfirmationModal>

      <Menu
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
        onClose={handleClose}
      >
        {message.fromMe &&
          !message.isInternal &&
          !message.isDeleted &&
          [-1, -2].includes(Number(message.ack)) && (
            <MenuItem
              onClick={handleResendRequest}
              disabled={resending}
            >
              {resending
                ? i18n.t("messageOptionsMenu.resending")
                : i18n.t("messageOptionsMenu.resend")}
            </MenuItem>
          )}

        {message.fromMe && (
          <MenuItem onClick={handleOpenConfirmationModal}>
            {i18n.t("messageOptionsMenu.delete")}
          </MenuItem>
        )}
        <MenuItem onClick={hanldeReplyMessage}>
          {i18n.t("messageOptionsMenu.reply")}
        </MenuItem>
      </Menu>
    </>
  );
};

export default MessageOptionsMenu;
