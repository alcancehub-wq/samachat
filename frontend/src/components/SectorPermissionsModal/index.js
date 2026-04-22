import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  Typography,
  makeStyles,
  Divider
} from "@material-ui/core";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";
import { toast } from "react-toastify";
import {
  SECTOR_PERMISSION_GROUPS,
  SECTOR_PERMISSION_ACTION_LABELS
} from "../../utils/sectorPermissions";

const useStyles = makeStyles(theme => ({
  groupHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing(1)
  },
  groupBox: {
    padding: theme.spacing(1, 0)
  },
  divider: {
    margin: theme.spacing(1, 0)
  },
  checkboxRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(1)
  }
}));

const normalizePermissions = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (typeof payload === "string") {
    try {
      const parsed = JSON.parse(payload);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  if (payload && typeof payload === "object") {
    return Object.values(payload).filter(item => typeof item === "string");
  }

  return [];
};

const SectorPermissionsModal = ({ open, onClose, queue }) => {
  const classes = useStyles();
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState([]);

  useEffect(() => {
    if (!open || !queue?.id) {
      setPermissions([]);
      return;
    }

    const fetchPermissions = async () => {
      try {
        const { data } = await api.get(`/queue/${queue.id}/permissions`);
        const responsePermissions =
          data?.permissions ?? data?.data?.permissions ?? [];
        setPermissions(normalizePermissions(responsePermissions));
      } catch (err) {
        toastError(err);
      }
    };

    fetchPermissions();
  }, [open, queue]);

  const permissionSet = useMemo(() => new Set(permissions), [permissions]);

  const togglePermission = permissionKey => {
    setPermissions(prev => {
      const next = new Set(prev);
      if (next.has(permissionKey)) {
        next.delete(permissionKey);
      } else {
        next.add(permissionKey);
      }
      return Array.from(next);
    });
  };

  const toggleGroup = (group, enable) => {
    setPermissions(prev => {
      const next = new Set(prev);
      group.items.forEach(item => {
        if (enable) {
          next.add(item.key);
        } else {
          next.delete(item.key);
        }
      });
      return Array.from(next);
    });
  };

  const isGroupChecked = group =>
    group.items.every(item => permissionSet.has(item.key));

  const isGroupIndeterminate = group => {
    const selected = group.items.filter(item => permissionSet.has(item.key));
    return selected.length > 0 && selected.length < group.items.length;
  };

  const handleSave = async () => {
    if (!queue?.id) {
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.put(`/queue/${queue.id}/permissions`, {
        permissions
      });
      const responsePermissions =
        data?.permissions ?? data?.data?.permissions ?? [];
      setPermissions(normalizePermissions(responsePermissions));
      toast.success(i18n.t("sectorPermissions.modal.success"));
      onClose();
    } catch (err) {
      toastError(err);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {i18n.t("sectorPermissions.modal.title", {
          name: queue?.name || ""
        })}
      </DialogTitle>
      <DialogContent dividers>
        {SECTOR_PERMISSION_GROUPS.map((group, index) => (
          <div key={group.key} className={classes.groupBox}>
            <div className={classes.groupHeader}>
              <Typography variant="subtitle1">
                {i18n.t(group.titleKey)}
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isGroupChecked(group)}
                    indeterminate={isGroupIndeterminate(group)}
                    onChange={event =>
                      toggleGroup(group, event.target.checked)
                    }
                    color="primary"
                  />
                }
                label={i18n.t("sectorPermissions.actions.selectAll")}
              />
            </div>
            <Grid container spacing={1}>
              {group.items.map(item => {
                const actionKey = item.actionKey
                  ? SECTOR_PERMISSION_ACTION_LABELS[item.actionKey]
                  : null;
                const label = item.labelKey
                  ? i18n.t(item.labelKey)
                  : actionKey
                    ? i18n.t(actionKey)
                    : item.key;

                return (
                  <Grid item xs={12} sm={6} md={4} key={item.key}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={permissionSet.has(item.key)}
                          onChange={() => togglePermission(item.key)}
                          color="primary"
                        />
                      }
                      label={label}
                    />
                  </Grid>
                );
              })}
            </Grid>
            {index < SECTOR_PERMISSION_GROUPS.length - 1 && (
              <Divider className={classes.divider} />
            )}
          </div>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          {i18n.t("sectorPermissions.modal.cancel")}
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={saving}
        >
          {i18n.t("sectorPermissions.modal.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SectorPermissionsModal;
