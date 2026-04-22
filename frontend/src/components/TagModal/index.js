import React, { useEffect, useRef, useState } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";

import {
  makeStyles,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  CircularProgress,
  IconButton,
  InputAdornment
} from "@material-ui/core";
import { green } from "@material-ui/core/colors";
import { Colorize } from "@material-ui/icons";

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import ColorPicker from "../ColorPicker";

const useStyles = makeStyles(theme => ({
  root: {
    display: "flex",
    flexWrap: "wrap"
  },
  textField: {
    marginRight: theme.spacing(1),
    flex: 1
  },
  btnWrapper: {
    position: "relative"
  },
  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12
  },
  colorAdorment: {
    width: 20,
    height: 20
  }
}));

const TagSchema = Yup.object().shape({
  name: Yup.string().min(2, "Too Short!").max(50, "Too Long!").required("Required"),
  color: Yup.string().min(3, "Too Short!").max(9, "Too Long!").required()
});

const TagModal = ({ open, onClose, tagId }) => {
  const classes = useStyles();
  const nameRef = useRef();

  const initialState = {
    name: "",
    color: "#64748b"
  };

  const [colorPickerModalOpen, setColorPickerModalOpen] = useState(false);
  const [tag, setTag] = useState(initialState);

  useEffect(() => {
    (async () => {
      if (!tagId) return;
      try {
        const { data } = await api.get(`/tags/${tagId}`);
        setTag(prevState => {
          return { ...prevState, ...data };
        });
      } catch (err) {
        toastError(err);
      }
    })();

    return () => {
      setTag(initialState);
    };
  }, [tagId, open]);

  const handleClose = () => {
    onClose();
    setTag(initialState);
  };

  const handleSaveTag = async values => {
    try {
      if (tagId) {
        await api.put(`/tags/${tagId}`, values);
      } else {
        await api.post("/tags", values);
      }
      toast.success(i18n.t("tagModal.success"));
      handleClose();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <div className={classes.root}>
      <Dialog open={open} onClose={handleClose} scroll="paper">
        <DialogTitle>
          {tagId ? `${i18n.t("tagModal.title.edit")}` : `${i18n.t("tagModal.title.add")}`}
        </DialogTitle>
        <Formik
          initialValues={tag}
          enableReinitialize={true}
          validationSchema={TagSchema}
          onSubmit={(values, actions) => {
            setTimeout(() => {
              handleSaveTag(values);
              actions.setSubmitting(false);
            }, 400);
          }}
        >
          {({ touched, errors, isSubmitting, values }) => (
            <Form>
              <DialogContent dividers>
                <Field
                  as={TextField}
                  label={i18n.t("tagModal.form.name")}
                  autoFocus
                  name="name"
                  error={touched.name && Boolean(errors.name)}
                  helperText={
                    touched.name && errors.name
                      ? errors.name
                      : i18n.t("tagModal.form.nameHelper")
                  }
                  variant="outlined"
                  margin="dense"
                  className={classes.textField}
                  inputRef={nameRef}
                />
                <Field
                  as={TextField}
                  label={i18n.t("tagModal.form.color")}
                  name="color"
                  id="color"
                  onFocus={() => {
                    setColorPickerModalOpen(true);
                    nameRef.current.blur();
                  }}
                  error={touched.color && Boolean(errors.color)}
                  helperText={
                    touched.color && errors.color
                      ? errors.color
                      : i18n.t("tagModal.form.colorHelper")
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <div
                          style={{ backgroundColor: values.color }}
                          className={classes.colorAdorment}
                        ></div>
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <IconButton
                        size="small"
                        color="default"
                        onClick={() => setColorPickerModalOpen(true)}
                      >
                        <Colorize />
                      </IconButton>
                    )
                  }}
                  variant="outlined"
                  margin="dense"
                />
                <ColorPicker
                  open={colorPickerModalOpen}
                  handleClose={() => setColorPickerModalOpen(false)}
                  onChange={color => {
                    values.color = color;
                    setTag(() => {
                      return { ...values, color };
                    });
                  }}
                />
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={handleClose}
                  color="secondary"
                  disabled={isSubmitting}
                  variant="outlined"
                >
                  {i18n.t("tagModal.buttons.cancel")}
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  disabled={isSubmitting}
                  variant="contained"
                  className={classes.btnWrapper}
                >
                  {tagId
                    ? `${i18n.t("tagModal.buttons.okEdit")}`
                    : `${i18n.t("tagModal.buttons.okAdd")}`}
                  {isSubmitting && (
                    <CircularProgress size={24} className={classes.buttonProgress} />
                  )}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
    </div>
  );
};

export default TagModal;
