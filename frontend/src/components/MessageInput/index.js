import React, { useState, useEffect, useContext, useRef } from "react";
import "emoji-mart/css/emoji-mart.css";
import { useParams } from "react-router-dom";
import { Picker } from "emoji-mart";
import clsx from "clsx";

import { makeStyles, useTheme } from "@material-ui/core/styles";
import useMediaQuery from "@material-ui/core/useMediaQuery";
import Paper from "@material-ui/core/Paper";
import InputBase from "@material-ui/core/InputBase";
import TextField from "@material-ui/core/TextField";
import CircularProgress from "@material-ui/core/CircularProgress";
import Button from "@material-ui/core/Button";
import { green } from "@material-ui/core/colors";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import IconButton from "@material-ui/core/IconButton";
import MoreVert from "@material-ui/icons/MoreVert";
import MoodIcon from "@material-ui/icons/Mood";
import SendIcon from "@material-ui/icons/Send";
import ChatBubbleOutlineIcon from "@material-ui/icons/ChatBubbleOutline";
import CancelIcon from "@material-ui/icons/Cancel";
import ClearIcon from "@material-ui/icons/Clear";
import MicIcon from "@material-ui/icons/Mic";
import CheckCircleOutlineIcon from "@material-ui/icons/CheckCircleOutline";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import SpeakerNotesOutlinedIcon from "@material-ui/icons/SpeakerNotesOutlined";
import {
  Hidden,
  Menu,
  MenuItem,
} from "@material-ui/core";
import ClickAwayListener from "@material-ui/core/ClickAwayListener";
import { toast } from "react-toastify";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import RecordingTimer from "./RecordingTimer";
import { ReplyMessageContext } from "../../context/ReplyingMessage/ReplyingMessageContext";
import { AuthContext } from "../../context/Auth/AuthContext";
import toastError from "../../errors/toastError";
const nativeSpellCheckInputProps = {
  spellCheck: true,
  autoCorrect: "on",
  autoCapitalize: "sentences",
  lang: "pt-BR",
};

const audioToastIds = {
  permissionDenied: "messageInput-audio-permission-denied",
  unsupported: "messageInput-audio-unsupported",
  startError: "messageInput-audio-start-error",
  sendError: "messageInput-audio-send-error",
};

const showAudioToast = (message, toastId) => {
  toast.error(message, { toastId });
};

const stopMediaStream = stream => {
  if (!stream) return;

  stream.getTracks().forEach(track => track.stop());
};

const useStyles = makeStyles(theme => ({
  mainWrapper: {
    background: theme.custom.softBackground,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    borderTop: `1px solid ${theme.palette.divider}`,
    [theme.breakpoints.down("sm")]: {
      position: "fixed",
      bottom: 0,
      width: "100%",
      left: 0,
      background: theme.custom.softBackground,
      borderTop: `1px solid ${theme.palette.divider}`,
    },
  },

  newMessageBox: {
    background: theme.custom.softBackground,
    width: "100%",
    display: "flex",
    padding: "7px",
    alignItems: "center",
    [theme.breakpoints.down("sm")]: {
      background: theme.custom.softBackground,
      padding: "8px 10px calc(8px + env(safe-area-inset-bottom, 0px))",
      gap: 8,
      alignItems: "flex-end",
    },
  },

  correctTextButton: {
    alignSelf: "center",
    marginLeft: theme.spacing(0.5),
    marginRight: theme.spacing(0.5),
    minWidth: 0,
    padding: "3px 8px",
    borderRadius: 10,
    fontSize: 11,
    lineHeight: 1.2,
    textTransform: "none",
    whiteSpace: "nowrap",
  },

  messageInputWrapper: {
    padding: 6,
    marginRight: 7,
    background: theme.custom.inputBackground,
    display: "flex",
    borderRadius: 20,
    flex: 1,
    position: "relative",
    [theme.breakpoints.down("sm")]: {
      minHeight: 48,
      marginRight: 0,
      padding: "6px 10px",
      borderRadius: 24,
      background: theme.palette.background.paper,
      border: `1px solid ${theme.palette.divider}`,
      boxShadow: "0 4px 16px rgba(15, 23, 42, 0.08)",
      alignItems: "center",
      gap: 4,
    },
  },

  modeToggleButtonActive: {
    backgroundColor: `${theme.palette.primary.main} !important`,
    color: "#ffffff !important",
  },

  messageInput: {
    paddingLeft: 10,
    flex: 1,
    border: "none",
    [theme.breakpoints.down("sm")]: {
      paddingLeft: 6,
      fontSize: "0.95rem",
    },
  },

  sendMessageIcons: {
    color: theme.palette.text.secondary,
  },
  mobileAttachButton: {
    [theme.breakpoints.down("sm")]: {
      color: theme.palette.text.secondary,
      padding: 8,
      alignSelf: "center",
    },
  },
  mobilePrimaryAction: {
    [theme.breakpoints.down("sm")]: {
      width: 48,
      height: 48,
      backgroundColor: theme.palette.primary.main,
      color: "#FFFFFF",
      boxShadow: "0 10px 20px rgba(255, 25, 25, 0.24)",
      "&:hover": {
        backgroundColor: theme.palette.primary.dark,
      },
      "& svg": {
        color: "#FFFFFF",
      },
    },
  },
  mobileMenuPaper: {
    borderRadius: 14,
    minWidth: 188,
    "& .MuiList-padding": {
      paddingTop: 4,
      paddingBottom: 4,
    },
  },
  mobileMenuItem: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(0.75),
    minWidth: 0,
    paddingTop: theme.spacing(0.75),
    paddingBottom: theme.spacing(0.75),
    paddingLeft: theme.spacing(1.25),
    paddingRight: theme.spacing(1.25),
    minHeight: 40,
    "& .MuiIconButton-root": {
      padding: 4,
    },
  },
  mobileMenuLabel: {
    fontSize: "0.9rem",
    lineHeight: 1.15,
    color: theme.palette.text.primary,
  },

  uploadInput: {
    display: "none",
  },

  viewMediaInputWrapper: {
    display: "flex",
    padding: "10px 13px",
    position: "relative",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.custom.softBackground,
    borderTop: `1px solid ${theme.palette.divider}`,
  },

  emojiBox: {
    position: "absolute",
    bottom: 63,
    width: 40,
    borderTop: `1px solid ${theme.palette.divider}`,
  },

  circleLoading: {
    color: green[500],
    opacity: "70%",
    position: "absolute",
    top: "20%",
    left: "50%",
    marginLeft: -12,
  },

  audioLoading: {
    color: green[500],
    opacity: "70%",
  },

  recorderWrapper: {
    display: "flex",
    alignItems: "center",
    alignContent: "middle",
    [theme.breakpoints.down("sm")]: {
      gap: 6,
    },
  },

  cancelAudioIcon: {
    color: "red",
  },

  sendAudioIcon: {
    color: "green",
  },

  replyginMsgWrapper: {
    display: "flex",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
    paddingLeft: 73,
    paddingRight: 7,
  },

  replyginMsgContainer: {
    flex: 1,
    marginRight: 5,
    overflowY: "hidden",
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: "7.5px",
    display: "flex",
    position: "relative",
  },

  replyginMsgBody: {
    padding: 10,
    height: "auto",
    display: "block",
    whiteSpace: "pre-wrap",
    overflow: "hidden",
  },

  replyginContactMsgSideColor: {
    flex: "none",
    width: "4px",
    backgroundColor: "#35cd96",
  },

  replyginSelfMsgSideColor: {
    flex: "none",
    width: "4px",
    backgroundColor: "#FF1919",
  },

  messageContactName: {
    display: "flex",
    color: theme.palette.primary.main,
    fontWeight: 700,
  },
  messageQuickAnswersWrapper: {
    margin: 0,
    position: "absolute",
    bottom: "50px",
    background: "#ffffff",
    padding: "2px",
    border: "1px solid #CCC",
    left: 0,
    width: "100%",
    "& li": {
      listStyle: "none",
      "& a": {
        display: "block",
        padding: "8px",
        textOverflow: "ellipsis",
        overflow: "hidden",
        maxHeight: "32px",
        "&:hover": {
          background: "#F1F1F1",
          cursor: "pointer",
        },
      },
    },
  },

  internalComposerWrapper: {
    width: "100%",
    padding: "10px 16px 8px",
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    position: "relative",
    zIndex: 2,
    [theme.breakpoints.down("sm")]: {
      padding: "12px 16px 10px",
      backgroundColor: theme.palette.background.paper,
      boxShadow: "0 -8px 20px rgba(0, 0, 0, 0.08)",
    },
  },

  internalComposerTitle: {
    color: theme.palette.text.primary,
    fontSize: "0.95rem",
    fontWeight: 700,
    marginBottom: 4,
  },

  internalComposerHelper: {
    color: theme.palette.text.secondary,
    fontSize: "0.8rem",
    marginBottom: 10,
  },

  internalComposerInput: {
    width: "100%",
    marginBottom: 8,
    "& .MuiOutlinedInput-root": {
      alignItems: "flex-start",
      borderRadius: 8,
      backgroundColor: theme.palette.background.paper,
    },
    "& .MuiOutlinedInput-inputMultiline": {
      minHeight: 28,
      lineHeight: 1.4,
    },
  },

  internalComposerSuggestions: {
    marginBottom: 8,
    borderRadius: 10,
    border: `1px solid ${theme.palette.divider}`,
    overflow: "hidden",
    maxHeight: 180,
    overflowY: "auto",
    ...theme.scrollbarStyles,
  },

  internalComposerSuggestionItem: {
    width: "100%",
    padding: theme.spacing(1, 1.25),
    border: 0,
    background: theme.palette.background.paper,
    color: theme.palette.text.primary,
    textAlign: "left",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(0.25),
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
    },
    "& + &": {
      borderTop: `1px solid ${theme.palette.divider}`,
    },
  },

  internalComposerSuggestionName: {
    fontWeight: 700,
    fontSize: "0.9rem",
  },

  internalComposerSuggestionEmail: {
    color: theme.palette.text.secondary,
    fontSize: "0.82rem",
  },

  internalComposerActions: {
    display: "flex",
    gap: theme.spacing(1),
    justifyContent: "flex-start",
    [theme.breakpoints.down("xs")]: {
      flexWrap: "wrap",
    },
  },

  internalSaveButton: {
    borderRadius: 8,
    textTransform: "none",
    fontWeight: 700,
  },

  internalCancelButton: {
    borderRadius: 8,
    textTransform: "none",
    fontWeight: 700,
  },
}));

const MessageInput = ({ ticketStatus }) => {
  const classes = useStyles();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { ticketId } = useParams();

  const [medias, setMedias] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [internalInputMessage, setInternalInputMessage] = useState("");
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionOptions, setMentionOptions] = useState([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(false);
  const [correctingText, setCorrectingText] = useState(false);
  const [autoCorrectTextEnabled, setAutoCorrectTextEnabled] = useState(false);
  const [recording, setRecording] = useState(false);
  const [isInternalMessage, setIsInternalMessage] = useState(false);
  const [quickAnswers, setQuickAnswer] = useState([]);
  const [typeBar, setTypeBar] = useState(false);
  const inputRef = useRef();
  const internalInputRef = useRef();
  const acceptedPendingTicketRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioMimeTypeRef = useRef("audio/ogg");
  const isStoppingRef = useRef(false);
  const isCancellingAudioRef = useRef(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const { setReplyingMessage, replyingMessage } =
    useContext(ReplyMessageContext);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (isInternalMessage) {
      internalInputRef.current?.focus();
      return;
    }

    inputRef.current?.focus();
  }, [replyingMessage, isInternalMessage]);

  useEffect(() => {
    inputRef.current.focus();
    return () => {
      stopMediaStream(mediaStreamRef.current);
      mediaRecorderRef.current = null;
      mediaStreamRef.current = null;
      audioChunksRef.current = [];
      setInputMessage("");
      setInternalInputMessage("");
      setShowEmoji(false);
      setMedias([]);
      setIsInternalMessage(false);
      setReplyingMessage(null);
    };
  }, [ticketId, setReplyingMessage]);

  useEffect(() => {
    acceptedPendingTicketRef.current = false;
  }, [ticketId, ticketStatus]);

  useEffect(() => {
    if (!isInternalMessage || !mentionQuery.trim()) {
      setMentionOptions([]);
      setMentionLoading(false);
      return undefined;
    }

    setMentionLoading(true);

    const delayDebounceFn = setTimeout(async () => {
      try {
        const { data } = await api.get("/users/", {
          params: { searchParam: mentionQuery.trim() },
        });

        setMentionOptions(data.users || []);
      } catch (err) {
        setMentionOptions([]);
      } finally {
        setMentionLoading(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounceFn);
  }, [isInternalMessage, mentionQuery]);

  const resetRecordingState = () => {
    isStoppingRef.current = false;
    isCancellingAudioRef.current = false;
    audioChunksRef.current = [];
    mediaRecorderRef.current = null;
    setLoading(false);
    setRecording(false);
    stopMediaStream(mediaStreamRef.current);
    mediaStreamRef.current = null;
  };

  const getAutoCorrectTextStorageKey = () =>
    user?.id
      ? `samachat:autoCorrectTextEnabled:${user.id}`
      : "samachat:autoCorrectTextEnabled";

  useEffect(() => {
    const storedValue = localStorage.getItem(getAutoCorrectTextStorageKey());
    setAutoCorrectTextEnabled(storedValue === "true");
  }, [user?.id]);

  const handleChangeInput = e => {
    setInputMessage(e.target.value);
    handleLoadQuickAnswer(e.target.value);
  };

  const handleQuickAnswersClick = value => {
    setInputMessage(value);
    setTypeBar(false);
  };

  const extractCorrectedText = data => {
    if (typeof data === "string") return data;

    return (
      data?.content ||
      data?.text ||
      data?.result ||
      data?.response ||
      data?.message ||
      ""
    );
  };

  const correctTextValue = async textToCorrect => {
    const { data } = await api.post("/openai/correct-text", {
      ticketId,
      text: textToCorrect
    });

    return extractCorrectedText(data).trim();
  };

  const handleToggleAutoCorrectText = () => {
    setAutoCorrectTextEnabled(prevState => {
      const nextState = !prevState;
      localStorage.setItem(getAutoCorrectTextStorageKey(), String(nextState));
      return nextState;
    });
  };

  const handleAddEmoji = e => {
    let emoji = e.native;
    setInputMessage(prevState => prevState + emoji);
  };

  const handleChangeMedias = e => {
    if (isInternalMessage) {
      return;
    }

    if (!e.target.files) {
      return;
    }

    const selectedMedias = Array.from(e.target.files);
    setMedias(selectedMedias);
  };

  const handleInputPaste = e => {
    if (isInternalMessage) {
      return;
    }

    if (e.clipboardData.files[0]) {
      setMedias([e.clipboardData.files[0]]);
    }
  };

  const handleToggleInternalMessage = () => {
    setIsInternalMessage(prevState => {
      const nextState = !prevState;

      if (nextState) {
        setShowEmoji(false);
        setMedias([]);
        setTypeBar(false);
      } else {
        setInternalInputMessage("");
      }

      return nextState;
    });
  };

  const handleCancelInternalMessage = () => {
    setInternalInputMessage("");
    setIsInternalMessage(false);
    setMentionQuery("");
    setMentionOptions([]);
    setShowEmoji(false);
    setTypeBar(false);
  };

  const handleChangeInternalInput = event => {
    const nextValue = event.target.value;
    const mentionMatch = nextValue.match(/(?:^|\s)@([^\s@]*)$/);

    setInternalInputMessage(nextValue);

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      return;
    }

    setMentionQuery("");
    setMentionOptions([]);
  };

  const handleSelectMention = selectedUser => {
    if (!selectedUser?.email) {
      return;
    }

    setInternalInputMessage(prevState =>
      prevState.replace(/(^|\s)@([^\s@]*)$/, `$1@${selectedUser.email} `)
    );
    setMentionQuery("");
    setMentionOptions([]);
    internalInputRef.current?.focus();
  };

  const handleUploadMedia = async e => {
    setLoading(true);
    e.preventDefault();

    try {
      await uploadMediaFiles(medias);
    } catch (err) {
      toastError(err);
    }

    setLoading(false);
    setMedias([]);
  };

  const uploadMediaFiles = async files => {
    await ensureTicketIsOpen();

    const formData = new FormData();
    formData.append("fromMe", true);
    files.forEach(media => {
      formData.append("medias", media);
      formData.append("body", media.name);
    });

    await api.post(`/messages/${ticketId}`, formData);
  };

  const ensureTicketIsOpen = async () => {
    if (
      ticketStatus !== "pending" ||
      acceptedPendingTicketRef.current ||
      !ticketId ||
      !user?.id
    ) {
      return;
    }

    await api.put(`/tickets/${ticketId}`, {
      status: "open",
      userId: user.id,
    });

    acceptedPendingTicketRef.current = true;
  };

  const handleSendMessage = async ({ internalMode = isInternalMessage } = {}) => {
    let currentMessage = internalMode ? internalInputMessage : inputMessage;

    if (currentMessage.trim() === "") return;

    setLoading(true);

    if (autoCorrectTextEnabled) {
      setCorrectingText(true);

      try {
        const correctedText = await correctTextValue(currentMessage.trim());
        if (correctedText) {
          currentMessage = correctedText;
        }
      } catch (err) {
        toastError(err);
        setLoading(false);
        setCorrectingText(false);
        return;
      } finally {
        setCorrectingText(false);
      }
    }

    const shouldSignMessages = user?.signMessages !== false;
    const trimmedMessage = currentMessage.trim();

    const message = {
      read: 1,
      fromMe: true,
      mediaUrl: "",
      body:
        internalMode || !shouldSignMessages
          ? trimmedMessage
          : `*${user?.name}:*\n${trimmedMessage}`,
      quotedMsg: replyingMessage,
      isInternal: internalMode,
    };
    try {
      await ensureTicketIsOpen();
      await api.post(`/messages/${ticketId}`, message);
      console.log("Mensagem enviada com sucesso");
      window.dispatchEvent(new Event("refreshMessages"));
    } catch (err) {
      toastError(err);
    }

    if (internalMode) {
      setInternalInputMessage("");
      setIsInternalMessage(false);
      setMentionQuery("");
      setMentionOptions([]);
    } else {
      setInputMessage("");
    }

    setShowEmoji(false);
    setTypeBar(false);
    setLoading(false);
    setReplyingMessage(null);
  };

  const handleStartRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        showAudioToast(
          i18n.t("messagesInput.audioUnsupported"),
          audioToastIds.unsupported
        );
        return;
      }

      const permissionStatus = await navigator.permissions
        ?.query?.({ name: "microphone" })
        .catch(() => null);

      if (permissionStatus?.state === "denied") {
        showAudioToast(
          i18n.t("messagesInput.audioPermissionDenied"),
          audioToastIds.permissionDenied
        );
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
        ? "audio/ogg;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "";

      mediaRecorderRef.current = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      audioChunksRef.current = [];
      audioMimeTypeRef.current =
        mediaRecorderRef.current.mimeType || mimeType || "audio/webm";
      isCancellingAudioRef.current = false;

      mediaRecorderRef.current.ondataavailable = event => {
        console.log("chunk", event.data.size);
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        try {
          if (isCancellingAudioRef.current) {
            return;
          }

          if (!audioChunksRef.current || audioChunksRef.current.length === 0) {
            console.error("Sem chunks — abortando envio");
            return;
          }

          const resolvedMimeType =
            mediaRecorderRef.current?.mimeType || audioMimeTypeRef.current || "audio/webm";
          const audioBlob = new Blob(audioChunksRef.current, {
            type: resolvedMimeType,
          });
          const extension = resolvedMimeType.includes("ogg") ? "ogg" : "webm";
          const file = new File(
            [audioBlob],
            `recorded_${Date.now()}.${extension}`,
            { type: resolvedMimeType }
          );

          setLoading(true);
          await uploadMediaFiles([file]);

          window.dispatchEvent(new Event("refreshMessages"));
        } catch (err) {
          console.error("Erro ao enviar áudio:", err);
          showAudioToast(
            i18n.t("messagesInput.audioSendError"),
            audioToastIds.sendError
          );
        } finally {
          resetRecordingState();
        }
      };

      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (err) {
      console.error("Erro ao iniciar gravação:", err);
      setLoading(false);
      stopMediaStream(mediaStreamRef.current);
      mediaStreamRef.current = null;

      if (
        err?.name === "NotAllowedError" ||
        err?.name === "PermissionDeniedError"
      ) {
        showAudioToast(
          i18n.t("messagesInput.audioPermissionDenied"),
          audioToastIds.permissionDenied
        );
        return;
      }

      showAudioToast(
        i18n.t("messagesInput.audioStartError"),
        audioToastIds.startError
      );
    }
  };

  const handleLoadQuickAnswer = async value => {
    if (value && value.indexOf("/") === 0) {
      try {
        const { data } = await api.get("/quickAnswers/", {
          params: { searchParam: inputMessage.substring(1) },
        });
        setQuickAnswer(data.quickAnswers);
        if (data.quickAnswers.length > 0) {
          setTypeBar(true);
        } else {
          setTypeBar(false);
        }
      } catch (err) {
        setTypeBar(false);
      }
    } else {
      setTypeBar(false);
    }
  };

  const handleUploadAudio = () => {
    if (!mediaRecorderRef.current || isStoppingRef.current) return;
    if (mediaRecorderRef.current.state !== "recording") return;
    isStoppingRef.current = true;
    setLoading(true);
    mediaRecorderRef.current.stop();
  };

  const handleCancelAudio = () => {
    isCancellingAudioRef.current = true;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    } else {
      stopMediaStream(mediaStreamRef.current);
      resetRecordingState();
    }
  };

  const handleOpenMenuClick = event => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuItemClick = event => {
    setAnchorEl(null);
  };

  const mobilePlaceholder = "Mensagem";

  const renderReplyingMessage = message => {
    return (
      <div className={classes.replyginMsgWrapper}>
        <div className={classes.replyginMsgContainer}>
          <span
            className={clsx(classes.replyginContactMsgSideColor, {
              [classes.replyginSelfMsgSideColor]: !message.fromMe,
            })}
          ></span>
          <div className={classes.replyginMsgBody}>
            {!message.fromMe && (
              <span className={classes.messageContactName}>
                {message.contact?.name}
              </span>
            )}
            {message.body}
          </div>
        </div>
        <IconButton
          aria-label="showRecorder"
          component="span"
          disabled={loading || ticketStatus !== "open"}
          onClick={() => setReplyingMessage(null)}
        >
          <ClearIcon className={classes.sendMessageIcons} />
        </IconButton>
      </div>
    );
  };

  const renderInternalComposer = () => {
    if (!isInternalMessage) {
      return null;
    }

    return (
      <div className={classes.internalComposerWrapper}>
        <div className={classes.internalComposerTitle}>
          {i18n.t("messagesInput.internalComposer.title")}
        </div>
        <div className={classes.internalComposerHelper}>
          {i18n.t("messagesInput.internalComposer.helper")}
        </div>
        <TextField
          inputRef={internalInputRef}
          className={classes.internalComposerInput}
          variant="outlined"
          multiline
          minRows={2}
          maxRows={4}
          fullWidth
          autoFocus
          inputProps={nativeSpellCheckInputProps}
          value={internalInputMessage}
          placeholder={i18n.t("messagesInput.placeholderInternal")}
          onChange={handleChangeInternalInput}
          disabled={loading || recording || ticketStatus !== "open"}
          onKeyPress={e => {
            if (loading || e.shiftKey) return;
            if (e.key === "Enter") {
              e.preventDefault();
              e.preventDefault();
              handleSendMessage({ internalMode: true });
            }
          }}
        />
        {(mentionLoading || mentionOptions.length > 0) && (
          <Paper elevation={0} className={classes.internalComposerSuggestions}>
            {mentionLoading ? (
              <button
                type="button"
                className={classes.internalComposerSuggestionItem}
                disabled
              >
                <span className={classes.internalComposerSuggestionName}>
                  Buscando usuarios...
                </span>
              </button>
            ) : (
              mentionOptions.map(option => (
                <button
                  key={option.id}
                  type="button"
                  className={classes.internalComposerSuggestionItem}
                  onClick={() => handleSelectMention(option)}
                >
                  <span className={classes.internalComposerSuggestionName}>
                    {option.name}
                  </span>
                  <span className={classes.internalComposerSuggestionEmail}>
                    {option.email}
                  </span>
                </button>
              ))
            )}
          </Paper>
        )}
        <div className={classes.internalComposerActions}>
          <Button
            variant="contained"
            color="primary"
            className={classes.internalSaveButton}
            onClick={() => handleSendMessage({ internalMode: true })}
            disabled={loading || recording || ticketStatus !== "open"}
          >
            {i18n.t("messagesInput.internalComposer.save")}
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            className={classes.internalCancelButton}
            onClick={handleCancelInternalMessage}
            disabled={loading}
          >
            {i18n.t("messagesInput.internalComposer.cancel")}
          </Button>
        </div>
      </div>
    );
  };

  if (medias.length > 0)
    return (
      <Paper elevation={0} square className={classes.viewMediaInputWrapper}>
        <IconButton
          aria-label="cancel-upload"
          component="span"
          onClick={e => setMedias([])}
        >
          <CancelIcon className={classes.sendMessageIcons} />
        </IconButton>

        {loading ? (
          <div>
            <CircularProgress className={classes.circleLoading} />
          </div>
        ) : (
          <span>
            {medias[0]?.name}
            {/* <img src={media.preview} alt=""></img> */}
          </span>
        )}
        <IconButton
          aria-label="send-upload"
          component="span"
          onClick={handleUploadMedia}
          disabled={loading}
        >
          <SendIcon className={classes.sendMessageIcons} />
        </IconButton>
      </Paper>
    );
  else {
    return (
      <Paper square elevation={0} className={classes.mainWrapper}>
        {replyingMessage && renderReplyingMessage(replyingMessage)}
        {renderInternalComposer()}
        <div className={classes.newMessageBox}>
          <Hidden only={["sm", "xs"]}>
            <IconButton
              aria-label="emojiPicker"
              component="span"
              disabled={
                loading ||
                recording ||
                ticketStatus !== "open" ||
                isInternalMessage
              }
              onClick={e => setShowEmoji(prevState => !prevState)}
            >
              <MoodIcon className={classes.sendMessageIcons} />
            </IconButton>
            {showEmoji ? (
              <div className={classes.emojiBox}>
                <ClickAwayListener onClickAway={e => setShowEmoji(false)}>
                  <Picker
                    perLine={16}
                    showPreview={false}
                    showSkinTones={false}
                    onSelect={handleAddEmoji}
                  />
                </ClickAwayListener>
              </div>
            ) : null}

            <input
              multiple
              type="file"
              id="upload-button"
              disabled={
                loading ||
                recording ||
                ticketStatus !== "open" ||
                isInternalMessage
              }
              className={classes.uploadInput}
              onChange={handleChangeMedias}
            />
            <label htmlFor="upload-button">
              <IconButton
                aria-label="upload"
                component="span"
                disabled={
                  loading ||
                  recording ||
                  ticketStatus !== "open" ||
                  isInternalMessage
                }
              >
                <AttachFileIcon className={classes.sendMessageIcons} />
              </IconButton>
            </label>
          </Hidden>
          <Hidden only={["md", "lg", "xl"]}>
            <IconButton
              aria-controls="simple-menu"
              aria-haspopup="true"
              onClick={handleOpenMenuClick}
              className={classes.mobileAttachButton}
            >
              <AttachFileIcon />
            </IconButton>
            <Menu
              id="simple-menu"
              keepMounted
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuItemClick}
              classes={{ paper: classes.mobileMenuPaper }}
            >
              <MenuItem onClick={handleMenuItemClick} className={classes.mobileMenuItem}>
                <IconButton
                  aria-label="emojiPicker"
                  component="span"
                  disabled={
                    loading ||
                    recording ||
                    ticketStatus !== "open" ||
                    isInternalMessage
                  }
                  onClick={e => setShowEmoji(prevState => !prevState)}
                >
                  <MoodIcon className={classes.sendMessageIcons} />
                </IconButton>
                <span className={classes.mobileMenuLabel}>Emoji</span>
              </MenuItem>
              <MenuItem onClick={handleMenuItemClick} className={classes.mobileMenuItem}>
                <input
                  multiple
                  type="file"
                  id="upload-button"
                  disabled={
                    loading ||
                    recording ||
                    ticketStatus !== "open" ||
                    isInternalMessage
                  }
                  className={classes.uploadInput}
                  onChange={handleChangeMedias}
                />
                <label htmlFor="upload-button">
                  <IconButton
                    aria-label="upload"
                    component="span"
                    disabled={
                      loading ||
                      recording ||
                      ticketStatus !== "open" ||
                      isInternalMessage
                    }
                  >
                    <AttachFileIcon className={classes.sendMessageIcons} />
                  </IconButton>
                </label>
                <span className={classes.mobileMenuLabel}>Arquivo</span>
              </MenuItem>
              <MenuItem
                onClick={() => {
                  if (loading || recording || ticketStatus !== "open") return;
                  handleToggleInternalMessage();
                  setAnchorEl(null);
                }}
                className={classes.mobileMenuItem}
                disabled={loading || recording || ticketStatus !== "open"}
              >
                <IconButton
                  aria-label="toggleInternalMessage"
                  component="span"
                  className={clsx({
                    [classes.modeToggleButtonActive]: isInternalMessage,
                  })}
                  disabled={loading || recording || ticketStatus !== "open"}
                  onClick={handleToggleInternalMessage}
                >
                  {isInternalMessage ? (
                    <SpeakerNotesOutlinedIcon />
                  ) : (
                    <ChatBubbleOutlineIcon className={classes.sendMessageIcons} />
                  )}
                </IconButton>
                <span className={classes.mobileMenuLabel}>
                  {isInternalMessage ? "Mensagem externa" : "Mensagem interna"}
                </span>
              </MenuItem>
            </Menu>
          </Hidden>
          <Hidden only={["sm", "xs"]}>
            <IconButton
              aria-label="toggleInternalMessage"
              component="span"
              className={clsx({
                [classes.modeToggleButtonActive]: isInternalMessage,
              })}
              disabled={loading || recording || ticketStatus !== "open"}
              onClick={handleToggleInternalMessage}
              title={
                isInternalMessage
                  ? i18n.t("messagesInput.internalModeEnabled")
                  : i18n.t("messagesInput.internalModeDisabled")
              }
            >
              {isInternalMessage ? (
                <SpeakerNotesOutlinedIcon />
              ) : (
                <ChatBubbleOutlineIcon className={classes.sendMessageIcons} />
              )}
            </IconButton>
          </Hidden>
          <Button
            size="small"
            variant={autoCorrectTextEnabled ? "contained" : "outlined"}
            color={autoCorrectTextEnabled ? "primary" : "default"}
            className={classes.correctTextButton}
            onClick={handleToggleAutoCorrectText}
            disabled={loading || correctingText || recording || ticketStatus !== "open"}
            title="Liga ou desliga a correção automática de texto para este usuário"
          >
            {correctingText
              ? "Corrigindo..."
              : autoCorrectTextEnabled
              ? "Correção IA: ligada"
              : "Correção IA: desligada"}
          </Button>
          <div className={classes.messageInputWrapper}>
            <InputBase
              inputRef={input => {
                if (!isInternalMessage && input) {
                  input.focus();
                }
                input && (inputRef.current = input);
              }}
              className={classes.messageInput}
              inputProps={nativeSpellCheckInputProps}
              placeholder={
                ticketStatus !== "open"
                  ? i18n.t("messagesInput.placeholderClosed")
                  : isInternalMessage
                  ? i18n.t("messagesInput.internalComposer.helper")
                  : isMobile
                  ? mobilePlaceholder
                  : i18n.t("messagesInput.placeholderOpen")
              }
              multiline
              maxRows={isMobile ? 3 : 5}
              value={inputMessage}
              onChange={handleChangeInput}
              disabled={
                recording ||
                loading ||
                ticketStatus !== "open" ||
                isInternalMessage
              }
              onPaste={e => {
                ticketStatus === "open" && !isInternalMessage && handleInputPaste(e);
              }}
              onKeyPress={e => {
                if (loading || e.shiftKey) return;
                else if (e.key === "Enter") {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            {typeBar ? (
              <ul className={classes.messageQuickAnswersWrapper}>
                {quickAnswers.map((value, index) => {
                  return (
                    <li
                      className={classes.messageQuickAnswersWrapperItem}
                      key={index}
                    >
                      {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                      <a onClick={() => handleQuickAnswersClick(value.message)}>
                        {`${value.shortcut} - ${value.message}`}
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div></div>
            )}
          </div>
          {inputMessage ? (
            <IconButton
              aria-label="sendMessage"
              component="span"
              onClick={handleSendMessage}
              disabled={loading || recording || isInternalMessage || ticketStatus !== "open"}
              className={clsx({ [classes.mobilePrimaryAction]: isMobile })}
            >
              <SendIcon className={classes.sendMessageIcons} />
            </IconButton>
          ) : recording ? (
            <div className={classes.recorderWrapper}>
              <IconButton
                aria-label="cancelRecording"
                component="span"
                fontSize="large"
                disabled={loading}
                onClick={handleCancelAudio}
              >
                <HighlightOffIcon className={classes.cancelAudioIcon} />
              </IconButton>
              {loading ? (
                <div>
                  <CircularProgress className={classes.audioLoading} />
                </div>
              ) : (
                <RecordingTimer />
              )}

              <IconButton
                aria-label="sendRecordedAudio"
                component="span"
                onClick={handleUploadAudio}
                disabled={loading}
                className={clsx({ [classes.mobilePrimaryAction]: isMobile })}
              >
                <CheckCircleOutlineIcon className={classes.sendAudioIcon} />
              </IconButton>
            </div>
          ) : (
            <IconButton
              aria-label="showRecorder"
              component="span"
              disabled={loading || ticketStatus !== "open" || isInternalMessage}
              onClick={handleStartRecording}
              className={clsx({ [classes.mobilePrimaryAction]: isMobile })}
            >
              <MicIcon className={classes.sendMessageIcons} />
            </IconButton>
          )}
        </div>
      </Paper>
    );
  }
};

export default MessageInput;
