import React, { useContext, useEffect, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import Chip from "@material-ui/core/Chip";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import { userHasPermission } from "../../utils/permissions";

const useStyles = makeStyles(theme => ({
  chips: {
    display: "flex",
    flexWrap: "wrap"
  },
  chip: {
    margin: 2
  }
}));

const TagSelect = ({ selectedTagIds = [], onChange, label, style, className }) => {
  const classes = useStyles();
  const [tags, setTags] = useState([]);
  const { user } = useContext(AuthContext);
  const canViewTags = userHasPermission(user, "tags.view");

  useEffect(() => {
	if (!canViewTags) {
		setTags([]);
		return undefined;
	}

    (async () => {
      try {
        const { data } = await api.get("/tags");
        setTags(data);
      } catch (err) {
		if (err?.response?.status !== 403) {
			toastError(err);
		}
      }
    })();
  }, [canViewTags]);

	if (!canViewTags) {
		return null;
	}

  const handleChange = event => {
    if (typeof onChange === "function") {
      onChange(event.target.value);
    }
  };

  return (
    <div style={style} className={className}>
      <FormControl fullWidth margin="dense" variant="outlined">
        <InputLabel>{label || i18n.t("tags.inputLabel")}</InputLabel>
        <Select
          multiple
          label={label || i18n.t("tags.inputLabel")}
          value={selectedTagIds}
          onChange={handleChange}
          MenuProps={{
            anchorOrigin: {
              vertical: "bottom",
              horizontal: "left"
            },
            transformOrigin: {
              vertical: "top",
              horizontal: "left"
            },
            getContentAnchorEl: null
          }}
          renderValue={selected => (
            <div className={classes.chips}>
              {selected?.length > 0 &&
                selected.map(id => {
                  const tag = tags.find(item => item.id === id);
                  return tag ? (
                    <Chip
                      key={id}
                      style={{ backgroundColor: tag.color, color: "#ffffff" }}
                      variant="outlined"
                      label={tag.name}
                      className={classes.chip}
                    />
                  ) : null;
                })}
            </div>
          )}
        >
          {tags.map(tag => (
            <MenuItem key={tag.id} value={tag.id}>
              {tag.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  );
};

export default TagSelect;
