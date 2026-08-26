import React, { useEffect, useState } from "react";

import {
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import RefreshIcon from "@material-ui/icons/Refresh";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";

const useStyles = makeStyles(theme => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1.25, 1, 0),
    overflowY: "auto",
    ...theme.scrollbarStyles,
    borderRadius: 16,
    border: `1px solid ${theme.custom.panelBorder}`,
    boxShadow: "none",
    backgroundColor: theme.palette.background.paper,
    backgroundImage: theme.custom.panelGradient
  },
  headerTitle: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: theme.spacing(0.5)
  },
  pageSubtitle: {
    color: theme.palette.text.secondary,
    fontSize: "0.9375rem",
    fontWeight: 300,
    lineHeight: 1.6
  },
  filters: {
    minWidth: 260
  },
  table: {
    borderCollapse: "separate",
    borderSpacing: "0 8px"
  },
  tableHeadCell: {
    color: theme.palette.text.primary,
    fontWeight: 700,
    fontSize: "0.78rem",
    textTransform: "uppercase",
    letterSpacing: 1.1,
    borderBottom: "none"
  },
  tableRow: {
    backgroundColor: theme.palette.background.paper,
    "& > td": { borderBottom: "none" },
    "& td:first-child": {
      borderTopLeftRadius: 12,
      borderBottomLeftRadius: 12
    },
    "& td:last-child": {
      borderTopRightRadius: 12,
      borderBottomRightRadius: 12
    },
    "&:hover": {
      backgroundColor: theme.custom.tableHover
    }
  },
  emptyState: {
    padding: theme.spacing(5, 2),
    textAlign: "center",
    color: theme.palette.text.secondary
  },
  refreshButton: {
    borderRadius: 10,
    textTransform: "none",
    fontWeight: 600
  }
}));

const MetaTemplates = () => {
  const classes = useStyles();
  const [officialConnections, setOfficialConnections] = useState([]);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const [selectedWhatsappId, setSelectedWhatsappId] = useState("");
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadAuthorizedConnections = async () => {
    setConnectionsLoading(true);

    try {
      const { data } = await api.get(
        "/meta-message-templates/authorized-connections"
      );
      setOfficialConnections(Array.isArray(data) ? data : []);
    } catch (err) {
      setOfficialConnections([]);
      toastError(err);
    } finally {
      setConnectionsLoading(false);
    }
  };

  useEffect(() => {
    loadAuthorizedConnections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!selectedWhatsappId && officialConnections.length > 0) {
      setSelectedWhatsappId(String(officialConnections[0].id));
    }
  }, [officialConnections, selectedWhatsappId]);

  const fetchTemplates = async () => {
    if (!selectedWhatsappId) {
      setTemplates([]);
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.get(
        `/meta-message-templates/${selectedWhatsappId}`
      );
      setTemplates(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      setTemplates([]);
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWhatsappId]);

  return (
    <MainContainer>
      <MainHeader>
        <div className={classes.headerTitle}>
          <Title>{i18n.t("metaTemplates.title")}</Title>
          <Typography className={classes.pageSubtitle}>
            {i18n.t("metaTemplates.subtitle")}
          </Typography>
        </div>

        <MainHeaderButtonsWrapper>
          <FormControl
            variant="outlined"
            size="small"
            className={classes.filters}
            disabled={connectionsLoading || officialConnections.length === 0}
          >
            <InputLabel>{i18n.t("metaTemplates.connection")}</InputLabel>
            <Select
              value={selectedWhatsappId}
              onChange={event => setSelectedWhatsappId(event.target.value)}
              label={i18n.t("metaTemplates.connection")}
            >
              {officialConnections.map(connection => (
                <MenuItem key={connection.id} value={String(connection.id)}>
                  {connection.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            className={classes.refreshButton}
            startIcon={
              loading ? <CircularProgress size={16} /> : <RefreshIcon />
            }
            disabled={!selectedWhatsappId || loading}
            onClick={fetchTemplates}
          >
            {i18n.t("metaTemplates.refresh")}
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>

      <Paper className={classes.mainPaper}>
        <Table size="small" className={classes.table}>
          <TableHead>
            <TableRow>
              <TableCell className={classes.tableHeadCell}>
                {i18n.t("metaTemplates.table.name")}
              </TableCell>
              <TableCell className={classes.tableHeadCell}>
                {i18n.t("metaTemplates.table.category")}
              </TableCell>
              <TableCell className={classes.tableHeadCell}>
                {i18n.t("metaTemplates.table.language")}
              </TableCell>
              <TableCell className={classes.tableHeadCell}>
                {i18n.t("metaTemplates.table.status")}
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading && <TableRowSkeleton columns={4} />}

            {!loading &&
              templates.map(template => (
                <TableRow
                  key={template.id || `${template.name}-${template.language}`}
                  className={classes.tableRow}
                >
                  <TableCell>{template.name || "-"}</TableCell>
                  <TableCell>{template.category || "-"}</TableCell>
                  <TableCell>{template.language || "-"}</TableCell>
                  <TableCell>{template.status || "-"}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>

        {!loading && officialConnections.length === 0 && (
          <Typography className={classes.emptyState}>
            {i18n.t("metaTemplates.empty.noOfficialConnection")}
          </Typography>
        )}

        {!loading &&
          officialConnections.length > 0 &&
          templates.length === 0 && (
            <Typography className={classes.emptyState}>
              {i18n.t("metaTemplates.empty.noTemplates")}
            </Typography>
          )}
      </Paper>
    </MainContainer>
  );
};

export default MetaTemplates;
