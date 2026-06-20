import React, { useState, useEffect, useReducer, useRef } from "react";

import { isSameDay, parseISO, format } from "date-fns";
import openSocket from "../../services/socket-io";
import clsx from "clsx";

import { green } from "@material-ui/core/colors";
import {
  Button,
  CircularProgress,
  Divider,
  IconButton,
  makeStyles,
} from "@material-ui/core";
import {
  AccessTime,
  Block,
  Done,
  DoneAll,
  ExpandMore,
  GetApp,
  Launch,
} from "@material-ui/icons";

import MarkdownWrapper from "../MarkdownWrapper";
import VcardPreview from "../VcardPreview";
import LocationPreview from "../LocationPreview";
import ModalImageCors from "../ModalImageCors";
import MessageOptionsMenu from "../MessageOptionsMenu";
import whatsBackground from "../../assets/wa-background.png";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import Audio from "../Audio";
import { getBackendUrl } from "../../config";
import { i18n } from "../../translate/i18n";

const useStyles = makeStyles((theme) => ({
  messagesListWrapper: {
    overflow: "hidden",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    width: "100%",
    minWidth: 0,
    paddingTop: 8,
    [theme.breakpoints.down("sm")]: {
      paddingTop: 0,
    },
  },

  messagesList: {
    backgroundImage: `url(${whatsBackground})`,
    backgroundColor: theme.custom.softBackground,
    backgroundBlendMode: theme.palette.type === "dark" ? "multiply" : "normal",
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    width: "100%",
    minWidth: 0,
    padding: "12px 20px 20px 20px",
    overflowY: "scroll",
    [theme.breakpoints.down("sm")]: {
      padding: "10px 12px 96px",
      paddingBottom: "90px",
    },
    ...theme.scrollbarStyles,
  },

  circleLoading: {
    color: green[500],
    position: "absolute",
    opacity: "70%",
    top: 0,
    left: "50%",
    marginTop: 12,
  },

  messageLeft: {
    marginRight: 20,
    marginTop: 2,
    minWidth: 100,
    maxWidth: 600,
    height: "auto",
    display: "block",
    position: "relative",
    "&:hover #messageActionsButton": {
      display: "flex",
      position: "absolute",
      top: 0,
      right: 0,
    },

    whiteSpace: "pre-wrap",
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
    alignSelf: "flex-start",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingLeft: 5,
    paddingRight: 5,
    paddingTop: 5,
    paddingBottom: 0,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: "none",
    [theme.breakpoints.down("sm")]: {
      marginRight: 48,
      maxWidth: "82%",
    },
  },

  quotedContainerLeft: {
    margin: "-3px -80px 6px -6px",
    overflow: "hidden",
    backgroundColor: theme.custom.softBackground,
    borderRadius: "7.5px",
    display: "flex",
    position: "relative",
  },

  quotedMsg: {
    padding: 10,
    maxWidth: 300,
    height: "auto",
    display: "block",
    whiteSpace: "pre-wrap",
    overflow: "hidden",
  },

  quotedSideColorLeft: {
    flex: "none",
    width: "4px",
    backgroundColor: theme.palette.primary.main,
  },

  messageRight: {
    marginLeft: 20,
    marginTop: 2,
    minWidth: 100,
    maxWidth: 600,
    height: "auto",
    display: "block",
    position: "relative",
    "&:hover #messageActionsButton": {
      display: "flex",
      position: "absolute",
      top: 0,
      right: 0,
    },

    whiteSpace: "pre-wrap",
  backgroundColor: "#DCF8C6",
  color: "#1F2937",
    alignSelf: "flex-end",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 0,
    paddingLeft: 5,
    paddingRight: 5,
    paddingTop: 5,
    paddingBottom: 0,
    border: "1px solid rgba(53, 205, 150, 0.20)",
    boxShadow: "none",
    [theme.breakpoints.down("sm")]: {
      marginLeft: 48,
      maxWidth: "82%",
    },
  },

  internalMessageRight: {
    backgroundColor: "#FFF4DB",
    border: "1px solid #F0D08B",
  },

  quotedContainerRight: {
    margin: "-3px -80px 6px -6px",
    overflowY: "hidden",
    backgroundColor: theme.palette.type === "dark" ? "rgba(88, 214, 141, 0.12)" : "#cfe9ba",
    borderRadius: "7.5px",
    display: "flex",
    position: "relative",
  },

  quotedMsgRight: {
    padding: 10,
    maxWidth: 300,
    height: "auto",
    whiteSpace: "pre-wrap",
  },

  quotedSideColorRight: {
    flex: "none",
    width: "4px",
    backgroundColor: "#35cd96",
  },

  messageActionsButton: {
    display: "none",
    position: "relative",
    color: theme.palette.text.secondary,
    zIndex: 1,
    backgroundColor: "inherit",
    opacity: "90%",
    "&:hover, &.Mui-focusVisible": { backgroundColor: "inherit" },
  },

  messageContactName: {
    display: "flex",
    color: theme.palette.primary.main,
    fontWeight: 700,
  },

  internalMeta: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(0.75),
    padding: theme.spacing(0.25, 0.4, 0, 0.4),
    color: "#8A5B00",
    fontSize: "0.76rem",
    fontWeight: 700,
  },

  internalBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: theme.spacing(0.25, 0.75),
    borderRadius: 999,
    backgroundColor: "rgba(138, 91, 0, 0.12)",
    border: "1px solid rgba(138, 91, 0, 0.18)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontSize: "0.68rem",
  },

  textContentItem: {
    overflowWrap: "break-word",
    padding: "3px 80px 6px 6px",
  },

  textContentItemDeleted: {
    fontStyle: "italic",
    color: "rgba(0, 0, 0, 0.36)",
    overflowWrap: "break-word",
    padding: "3px 80px 6px 6px",
  },

  messageMedia: {
    objectFit: "cover",
    width: 250,
    height: 200,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },

  timestamp: {
    fontSize: 11,
    position: "absolute",
    bottom: 0,
    right: 5,
    color: "#999",
  },

  dailyTimestamp: {
    alignItems: "center",
    textAlign: "center",
    alignSelf: "center",
    width: "110px",
    backgroundColor: "#e1f3fb",
    margin: "10px",
    borderRadius: "10px",
    boxShadow: "0 1px 1px #b3b3b3",
  },

  dailyTimestampText: {
    color: "#808888",
    padding: 8,
    alignSelf: "center",
    marginLeft: "0px",
  },

  ackIcons: {
    fontSize: 18,
    verticalAlign: "middle",
    marginLeft: 4,
  },

  deletedIcon: {
    fontSize: 18,
    verticalAlign: "middle",
    marginRight: 4,
  },

  ackDoneAllIcon: {
    color: green[500],
    fontSize: 18,
    verticalAlign: "middle",
    marginLeft: 4,
  },

  downloadMedia: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "inherit",
    padding: 10,
    gap: 8,
  },
}));

const reducer = (state, action) => {
  if (action.type === "LOAD_MESSAGES") {
    const messages = action.payload;
    const newMessages = [];

    messages.forEach((message) => {
      const messageIndex = state.findIndex((m) => m.id === message.id);
      if (messageIndex !== -1) {
        state[messageIndex] = message;
      } else {
        newMessages.push(message);
      }
    });

    return [...newMessages, ...state];
  }

  if (action.type === "SYNC_MESSAGES") {
    const mergedMessages = new Map();

    state.forEach(message => {
      mergedMessages.set(message.id, message);
    });

    action.payload.forEach(message => {
      mergedMessages.set(message.id, message);
    });

    return Array.from(mergedMessages.values()).sort((messageA, messageB) => {
      const messageATime = messageA.createdAt
        ? new Date(messageA.createdAt).getTime()
        : 0;
      const messageBTime = messageB.createdAt
        ? new Date(messageB.createdAt).getTime()
        : 0;

      if (messageATime !== messageBTime) {
        return messageATime - messageBTime;
      }

      return String(messageA.id).localeCompare(String(messageB.id));
    });
  }

  if (action.type === "ADD_MESSAGE") {
    const newMessage = action.payload;
    const messageIndex = state.findIndex((m) => m.id === newMessage.id);

    if (messageIndex !== -1) {
      state[messageIndex] = newMessage;
    } else {
      state.push(newMessage);
    }

    return [...state];
  }

  if (action.type === "UPDATE_MESSAGE") {
    const messageToUpdate = action.payload;
    const messageIndex = state.findIndex((m) => m.id === messageToUpdate.id);

    if (messageIndex !== -1) {
      state[messageIndex] = messageToUpdate;
    }

    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const MessagesList = ({ ticketId, isGroup }) => {
  const classes = useStyles();

  const [messagesList, dispatch] = useReducer(reducer, []);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);
  const lastMessageRef = useRef();

  const [selectedMessage, setSelectedMessage] = useState({});
  const [anchorEl, setAnchorEl] = useState(null);
  const messageOptionsMenuOpen = Boolean(anchorEl);
  const currentTicketId = useRef(ticketId);
  const shouldSyncMessagesRef = useRef(false);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);

    currentTicketId.current = ticketId;
    shouldSyncMessagesRef.current = false;
  }, [ticketId]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchMessages = async () => {
        try {
          const { data } = await api.get("/messages/" + ticketId, {
            params: { pageNumber },
          });

          if (currentTicketId.current === ticketId) {
            dispatch({
              type: shouldSyncMessagesRef.current ? "SYNC_MESSAGES" : "LOAD_MESSAGES",
              payload: data.messages,
            });
            shouldSyncMessagesRef.current = false;
            setHasMore(data.hasMore);
            setLoading(false);
          }

          if (pageNumber === 1 && data.messages.length > 1) {
            scrollToBottom();
          }
        } catch (err) {
          setLoading(false);
          toastError(err);
        }
      };
      fetchMessages();
    }, 500);
    return () => {
      clearTimeout(delayDebounceFn);
    };
  }, [pageNumber, reloadCount, ticketId]);

  useEffect(() => {
    const handleRefreshMessages = () => {
      shouldSyncMessagesRef.current = true;
      setPageNumber(1);
      setReloadCount(prevCount => prevCount + 1);
    };

    window.addEventListener("refreshMessages", handleRefreshMessages);
    return () => {
      window.removeEventListener("refreshMessages", handleRefreshMessages);
    };
  }, []);

  useEffect(() => {
    const socket = openSocket();

    socket.on("connect", () => socket.emit("joinChatBox", ticketId));

    socket.on("appMessage", (data) => {
      if (data.action === "create") {
        dispatch({ type: "ADD_MESSAGE", payload: data.message });
        scrollToBottom();
      }

      if (data.action === "update") {
        dispatch({ type: "UPDATE_MESSAGE", payload: data.message });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [ticketId]);

  const loadMore = () => {
    setPageNumber((prevPageNumber) => prevPageNumber + 1);
  };

  const scrollToBottom = () => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({});
    }
  };

  const handleScroll = (e) => {
    if (!hasMore) return;
    const { scrollTop } = e.currentTarget;

    if (scrollTop === 0) {
      document.getElementById("messagesList").scrollTop = 1;
    }

    if (loading) {
      return;
    }

    if (scrollTop < 50) {
      loadMore();
    }
  };

  const handleOpenMessageOptionsMenu = (e, message) => {
    setAnchorEl(e.currentTarget);
    setSelectedMessage(message);
  };

  const handleCloseMessageOptionsMenu = (e) => {
    setAnchorEl(null);
  };

  const checkMessageMedia = (message) => {
    const normalizeMediaUrl = (url) => {
      if (!url) return url;

      const backendUrl = getBackendUrl();
      const normalizedBackend = backendUrl?.endsWith("/")
        ? backendUrl.slice(0, -1)
        : backendUrl;
      const needsReplace =
        url.startsWith("http://backend") || url.startsWith("https://backend");
      let resolved = needsReplace && normalizedBackend
        ? url.replace(/^https?:\/\/backend/, normalizedBackend)
        : url;

      if (!resolved.startsWith("http") && normalizedBackend) {
        resolved = `${normalizedBackend}${resolved.startsWith("/") ? "" : "/"}${resolved}`;
      }

      return resolved.replace(/:(\d+):\1\b/, ":$1");
    };

    const appendFilenameToMediaUrl = (url, filename) => {
      if (!url) return url;

      const trimmedName = filename?.trim();
      if (!trimmedName) return url;

      const separator = url.includes("?") ? "&" : "?";
      return `${url}${separator}filename=${encodeURIComponent(trimmedName)}`;
    };

    const mediaUrl = normalizeMediaUrl(message.mediaUrl);
    const attachmentName = message.body?.trim()
      ? message.body.trim()
      : mediaUrl?.split("/").pop() || "arquivo";
    const mediaOpenUrl = appendFilenameToMediaUrl(mediaUrl, attachmentName);

    if (message.mediaType === "location" && message.body.split('|').length >= 2) {
      let locationParts = message.body.split('|')
      let imageLocation = locationParts[0]
      let linkLocation = locationParts[1]

      let descriptionLocation = null

      if (locationParts.length > 2)
        descriptionLocation = message.body.split('|')[2]

      return <LocationPreview image={imageLocation} link={linkLocation} description={descriptionLocation} />
    }
    else if (message.mediaType === "vcard") {
      //console.log("vcard")
      //console.log(message)
      let array = message.body.split("\n");
      let obj = [];
      let contact = "";
      for (let index = 0; index < array.length; index++) {
        const v = array[index];
        let values = v.split(":");
        for (let ind = 0; ind < values.length; ind++) {
          if (values[ind].indexOf("+") !== -1) {
            obj.push({ number: values[ind] });
          }
          if (values[ind].indexOf("FN") !== -1) {
            contact = values[ind + 1];
          }
        }
      }
      return <VcardPreview contact={contact} numbers={obj[0]?.number} />
    }
    /*else if (message.mediaType === "multi_vcard") {
      console.log("multi_vcard")
      console.log(message)
    	
      if(message.body !== null && message.body !== "") {
        let newBody = JSON.parse(message.body)
        return (
          <>
            {
            newBody.map(v => (
              <VcardPreview contact={v.name} numbers={v.number} />
            ))
            }
          </>
        )
      } else return (<></>)
    }*/
    else if ( /^.*\.(jpe?g|png|gif)?$/i.exec(mediaUrl) && message.mediaType === "image") {
      return <ModalImageCors imageUrl={mediaUrl} />;
    } else if (message.mediaType === "audio") {
      return <Audio url={mediaUrl} />
    } else if (message.mediaType === "video") {
      return (
        <video
          className={classes.messageMedia}
          src={mediaUrl}
          controls
        />
      );
    } else {
      return (
        <>
          <div className={classes.downloadMedia}>
            <Button
              startIcon={<Launch />}
              color="primary"
              variant="contained"
              target="_blank"
              rel="noopener noreferrer"
              href={mediaOpenUrl}
            >
              Abrir arquivo
            </Button>
            <Button
              startIcon={<GetApp />}
              color="primary"
              variant="outlined"
              component="a"
              href={mediaOpenUrl}
              download={attachmentName || true}
            >
              Download
            </Button>
          </div>
          <Divider />
        </>
      );
    }
  };

  const renderMessageAck = (message) => {
    if (message.isInternal) {
      return null;
    }

    if (message.ack === 0) {
      return <AccessTime fontSize="small" className={classes.ackIcons} />;
    }
    if (message.ack === 1) {
      return <Done fontSize="small" className={classes.ackIcons} />;
    }
    if (message.ack === 2) {
      return <DoneAll fontSize="small" className={classes.ackIcons} />;
    }
    if (message.ack === 3 || message.ack === 4) {
      return <DoneAll fontSize="small" className={classes.ackDoneAllIcon} />;
    }
  };

  const renderDailyTimestamps = (message, index) => {
    const messageDay = parseISO(message.createdAt);
    const previousMessage = index > 0 ? messagesList[index - 1] : null;
    const shouldRenderDate =
      index === 0 ||
      (previousMessage &&
        !isSameDay(messageDay, parseISO(previousMessage.createdAt)));
    const shouldRenderLastRef = index === messagesList.length - 1;

    return (
      <>
        {shouldRenderDate && (
          <span
            className={classes.dailyTimestamp}
            key={`timestamp-${message.id}`}
          >
            <div className={classes.dailyTimestampText}>
              {format(messageDay, "dd/MM/yyyy")}
            </div>
          </span>
        )}
        {shouldRenderLastRef && (
          <div
            key={`ref-${message.createdAt}`}
            ref={lastMessageRef}
            style={{ float: "left", clear: "both" }}
          />
        )}
      </>
    );
  };

  const renderMessageDivider = (message, index) => {
    if (index < messagesList.length && index > 0) {
      let messageUser = messagesList[index].fromMe;
      let previousMessageUser = messagesList[index - 1].fromMe;

      if (messageUser !== previousMessageUser) {
        return (
          <span style={{ marginTop: 16 }} key={`divider-${message.id}`}></span>
        );
      }
    }
  };

  const renderQuotedMessage = (message) => {
    return (
      <div
        className={clsx(classes.quotedContainerLeft, {
          [classes.quotedContainerRight]: message.fromMe,
        })}
      >
        <span
          className={clsx(classes.quotedSideColorLeft, {
            [classes.quotedSideColorRight]: message.quotedMsg?.fromMe,
          })}
        ></span>
        <div className={classes.quotedMsg}>
          {message.quotedMsg?.isInternal ? (
            <span className={classes.messageContactName}>
              {`${i18n.t("messagesInput.internalModeLabel")}${
                message.quotedMsg?.senderName ? ` ${String.fromCharCode(8226)} ${message.quotedMsg.senderName}` : ""
              }`}
            </span>
          ) : !message.quotedMsg?.fromMe && (
            <span className={classes.messageContactName}>
              {message.quotedMsg?.contact?.name}
            </span>
          )}
          {message.quotedMsg?.body}
        </div>
      </div>
    );
  };

  const renderInternalMeta = message => {
    if (!message.isInternal) {
      return null;
    }

    return (
      <div className={classes.internalMeta}>
        <span className={classes.internalBadge}>
          {i18n.t("messagesInput.internalModeLabel")}
        </span>
        {message.senderName && <span>{message.senderName}</span>}
      </div>
    );
  };

  const renderMessages = () => {
    if (messagesList.length > 0) {
      const viewMessagesList = messagesList.map((message, index) => {
        if (!message.fromMe) {
          return (
            <React.Fragment key={message.id}>
              {renderDailyTimestamps(message, index)}
              {renderMessageDivider(message, index)}
              <div className={classes.messageLeft}>
                {renderInternalMeta(message)}
                <IconButton
                  variant="contained"
                  size="small"
                  id="messageActionsButton"
                  disabled={message.isDeleted}
                  className={classes.messageActionsButton}
                  onClick={(e) => handleOpenMessageOptionsMenu(e, message)}
                >
                  <ExpandMore />
                </IconButton>
                {isGroup && (
                  <span className={classes.messageContactName}>
                    {message.contact?.name}
                  </span>
                )}
                {(message.mediaUrl || message.mediaType === "location" || message.mediaType === "vcard"
                  //|| message.mediaType === "multi_vcard" 
                ) && checkMessageMedia(message)}
                <div className={classes.textContentItem}>
                  {message.quotedMsg && renderQuotedMessage(message)}
                  <MarkdownWrapper>{message.body}</MarkdownWrapper>
                  <span className={classes.timestamp}>
                    {format(parseISO(message.createdAt), "HH:mm")}
                  </span>
                </div>
              </div>
            </React.Fragment>
          );
        } else {
          return (
            <React.Fragment key={message.id}>
              {renderDailyTimestamps(message, index)}
              {renderMessageDivider(message, index)}
              <div
                className={clsx(classes.messageRight, {
                  [classes.internalMessageRight]: message.isInternal,
                })}
              >
                {renderInternalMeta(message)}
                <IconButton
                  variant="contained"
                  size="small"
                  id="messageActionsButton"
                  disabled={message.isDeleted}
                  className={classes.messageActionsButton}
                  onClick={(e) => handleOpenMessageOptionsMenu(e, message)}
                >
                  <ExpandMore />
                </IconButton>
                {(message.mediaUrl || message.mediaType === "location" || message.mediaType === "vcard"
                  //|| message.mediaType === "multi_vcard" 
                ) && checkMessageMedia(message)}
                <div
                  className={clsx(classes.textContentItem, {
                    [classes.textContentItemDeleted]: message.isDeleted,
                  })}
                >
                  {message.isDeleted && (
                    <Block
                      color="disabled"
                      fontSize="small"
                      className={classes.deletedIcon}
                    />
                  )}
                  {message.quotedMsg && renderQuotedMessage(message)}
                  <MarkdownWrapper>{message.body}</MarkdownWrapper>
                  <span className={classes.timestamp}>
                    {format(parseISO(message.createdAt), "HH:mm")}
                    {renderMessageAck(message)}
                  </span>
                </div>
              </div>
            </React.Fragment>
          );
        }
      });
      return viewMessagesList;
    } else {
      return <div>Say hello to your new contact!</div>;
    }
  };

  return (
    <div className={classes.messagesListWrapper}>
      <MessageOptionsMenu
        message={selectedMessage}
        anchorEl={anchorEl}
        menuOpen={messageOptionsMenuOpen}
        handleClose={handleCloseMessageOptionsMenu}
      />
      <div
        id="messagesList"
        className={classes.messagesList}
        onScroll={handleScroll}
      >
        {messagesList.length > 0 ? renderMessages() : []}
      </div>
      {loading && (
        <div>
          <CircularProgress className={classes.circleLoading} />
        </div>
      )}
    </div>
  );
};

export default MessagesList;