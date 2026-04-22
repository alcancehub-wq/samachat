import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";

import {
  Button,
  Chip,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  makeStyles,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from "@material-ui/core";

import { ChatBubbleOutline, CloudDownload, Launch, PersonOutline, Search } from "@material-ui/icons";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import Title from "../../components/Title";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";
import { getBackendUrl } from "../../config";

const useStyles = makeStyles(theme => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1),
    overflowY: "scroll",
    ...theme.scrollbarStyles
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
  filtersPaper: {
    padding: theme.spacing(1),
    marginBottom: theme.spacing(1),
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(1)
  },
  actions: {
    whiteSpace: "nowrap"
  },
  chip: {
    textTransform: "capitalize"
  }
}));

const Files = () => {
  const classes = useStyles();
  const history = useHistory();

  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [searchParam, setSearchParam] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [ticketId, setTicketId] = useState("");
  const [contactId, setContactId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchFiles = async () => {
        try {
          const params = {
            searchParam,
            mediaType: mediaType || undefined,
            ticketId: ticketId || undefined,
            contactId: contactId || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined
          };

          const { data } = await api.get("/files", { params });
          setFiles(data || []);
          setLoading(false);
        } catch (err) {
          toastError(err);
          setLoading(false);
        }
      };

      fetchFiles();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, mediaType, ticketId, contactId, dateFrom, dateTo]);

  const formatDate = value => {
    if (!value) {
      return "-";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleString();
  };

  const resolveOrigin = file => {
    if (file.fromMe === true) {
      return i18n.t("files.origin.sent");
    }

    if (file.fromMe === false) {
      return i18n.t("files.origin.received");
    }

    return i18n.t("files.origin.unknown");
  };

  const resolveMediaType = media => {
    if (!media) {
      return "-";
    }

    const [type, subtype] = media.split("/");
    return subtype ? `${type}/${subtype}` : media;
  };

  const handleOpenTicket = id => {
    if (!id) return;
    history.push(`/tickets/${id}`);
  };

  const handleOpenContact = contact => {
    if (!contact) return;
    const query = contact.name || contact.number || contact.id;
    if (!query) return;
    history.push(`/contacts?search=${encodeURIComponent(query)}`);
  };

  const handleOpenFile = url => {
    if (!url) return;
    const normalizedUrl = normalizeMediaUrl(url);
    if (!normalizedUrl) return;
    window.open(normalizedUrl, "_blank", "noopener,noreferrer");
  };

  const handleDownloadFile = file => {
    if (!file?.mediaUrl) return;

    const normalizedUrl = normalizeMediaUrl(file.mediaUrl);
    if (!normalizedUrl) return;
    const link = document.createElement("a");
    link.href = normalizedUrl;
    link.download = normalizedUrl.split("/").pop() || "file";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const normalizeMediaUrl = url => {
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

  return (
    <MainContainer>
      <MainHeader>
        <div className={classes.headerTitle}>
          <Title>{i18n.t("files.title")}</Title>
          <Typography className={classes.headerSubtitle}>
            {i18n.t("files.subtitle")}
          </Typography>
        </div>
        <MainHeaderButtonsWrapper>
          <TextField
            placeholder={i18n.t("files.searchPlaceholder")}
            type="search"
            value={searchParam}
            onChange={event => setSearchParam(event.target.value.toLowerCase())}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search style={{ color: "gray" }} />
                </InputAdornment>
              )
            }}
          />
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper className={classes.filtersPaper} variant="outlined">
        <FormControl variant="outlined" size="small" style={{ minWidth: 200 }}>
          <InputLabel>{i18n.t("files.filters.type")}</InputLabel>
          <Select
            value={mediaType}
            onChange={event => setMediaType(event.target.value)}
            label={i18n.t("files.filters.type")}
          >
            <MenuItem value="">{i18n.t("files.filters.typeAll")}</MenuItem>
            <MenuItem value="image">{i18n.t("files.filters.typeImage")}</MenuItem>
            <MenuItem value="video">{i18n.t("files.filters.typeVideo")}</MenuItem>
            <MenuItem value="audio">{i18n.t("files.filters.typeAudio")}</MenuItem>
            <MenuItem value="application">{i18n.t("files.filters.typeDocument")}</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label={i18n.t("files.filters.ticket")}
          type="number"
          variant="outlined"
          size="small"
          value={ticketId}
          onChange={event => setTicketId(event.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label={i18n.t("files.filters.contact")}
          type="number"
          variant="outlined"
          size="small"
          value={contactId}
          onChange={event => setContactId(event.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label={i18n.t("files.filters.dateFrom")}
          type="date"
          variant="outlined"
          size="small"
          value={dateFrom}
          onChange={event => setDateFrom(event.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label={i18n.t("files.filters.dateTo")}
          type="date"
          variant="outlined"
          size="small"
          value={dateTo}
          onChange={event => setDateTo(event.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Paper>
      <Paper className={classes.mainPaper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{i18n.t("files.table.name")}</TableCell>
              <TableCell>{i18n.t("files.table.type")}</TableCell>
              <TableCell>{i18n.t("files.table.origin")}</TableCell>
              <TableCell>{i18n.t("files.table.createdAt")}</TableCell>
              <TableCell>{i18n.t("files.table.ticket")}</TableCell>
              <TableCell>{i18n.t("files.table.contact")}</TableCell>
              <TableCell align="center">{i18n.t("files.table.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRowSkeleton columns={7} />
            ) : (
              files.map(file => (
                <TableRow key={file.id}>
                  <TableCell>{file.mediaUrl?.split("/").pop() || file.body || "-"}</TableCell>
                  <TableCell>
                    <Chip className={classes.chip} label={resolveMediaType(file.mediaType)} />
                  </TableCell>
                  <TableCell>{resolveOrigin(file)}</TableCell>
                  <TableCell>{formatDate(file.createdAt)}</TableCell>
                  <TableCell>{file.ticketId ? `#${file.ticketId}` : "-"}</TableCell>
                  <TableCell>{file.contact?.name || "-"}</TableCell>
                  <TableCell align="center" className={classes.actions}>
                    <IconButton size="small" onClick={() => handleOpenFile(file.mediaUrl)}>
                      <Launch />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDownloadFile(file)}>
                      <CloudDownload />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleOpenTicket(file.ticketId)}>
                      <ChatBubbleOutline />
                    </IconButton>
                    {file.contact?.id && (
                      <IconButton size="small" onClick={() => handleOpenContact(file.contact)}>
                        <PersonOutline />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
};

export default Files;
