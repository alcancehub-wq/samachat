import React, { useState, useContext } from "react";

import {
  Avatar,
  Button,
  CssBaseline,
  TextField,
  Typography,
  Container,
  InputAdornment,
  IconButton,
  Link
} from '@material-ui/core';

import { KeyboardTabOutlined, Visibility, VisibilityOff } from '@material-ui/icons';

import { makeStyles } from "@material-ui/core/styles";

import { i18n } from "../../translate/i18n";

import { AuthContext } from "../../context/Auth/AuthContext";

// const Copyright = () => {
// 	return (
// 		<Typography variant="body2" color="textSecondary" align="center">
// 			{"Copyleft "}
// 			<Link color="inherit" href="https://github.com/canove">
// 				Canove
// 			</Link>{" "}
// 			{new Date().getFullYear()}
// 			{"."}
// 		</Typography>
// 	);
// };

const useStyles = makeStyles((theme) => ({
  root: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    backgroundImage: [
      "radial-gradient(circle at top left, rgba(255, 25, 25, 0.12), transparent 26%)",
      "radial-gradient(circle at bottom right, rgba(17, 17, 17, 0.08), transparent 30%)",
      "linear-gradient(180deg, #FAFAFB 0%, #EEF1F4 100%)",
    ].join(", "),
    padding: theme.spacing(3),
    [theme.breakpoints.down("xs")]: {
      padding: theme.spacing(2),
      alignItems: "stretch",
    },
    "&::before": {
      content: '""',
      position: "absolute",
      inset: "auto auto -72px -72px",
      width: 220,
      height: 220,
      borderRadius: "50%",
      background: "rgba(255, 25, 25, 0.08)",
      filter: "blur(12px)",
    },
    "&::after": {
      content: '""',
      position: "absolute",
      inset: "52px -82px auto auto",
      width: 180,
      height: 180,
      borderRadius: "50%",
      background: "rgba(17, 17, 17, 0.05)",
      filter: "blur(18px)",
    },
  },
  shell: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: 430,
    [theme.breakpoints.down("xs")]: {
      maxWidth: "100%",
      display: "flex",
      alignItems: "center",
    },
  },
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: theme.spacing(3.5, 3.25, 3.1),
    boxShadow: "0 28px 60px rgba(15, 23, 42, 0.14)",
    border: "1px solid rgba(255, 255, 255, 0.75)",
    backdropFilter: "blur(14px)",
    position: "relative",
    overflow: "hidden",
    "&::before": {
      content: '""',
      position: "absolute",
      inset: 0,
      background: "linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0) 22%)",
      pointerEvents: "none",
    },
    [theme.breakpoints.down("xs")]: {
      padding: theme.spacing(3, 1.8, 2.6),
      borderRadius: 14,
      minHeight: "auto",
    },
  },
  paper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    position: "relative",
    zIndex: 1,
  },
  avatar: {
    width: 72,
    height: 72,
    marginBottom: theme.spacing(2),
    backgroundColor: "rgba(255, 25, 25, 0.12)",
    color: "#FF1919",
  },
  icon: {
    fontSize: 34,
  },
  title: {
    fontSize: "1.9rem",
    fontWeight: 700,
    lineHeight: 1,
    color: "#111111",
    marginBottom: theme.spacing(1.1),
    textAlign: "center",
    [theme.breakpoints.down("xs")]: {
      fontSize: "1.75rem",
    },
  },
  subtitle: {
    maxWidth: 300,
    fontSize: "0.98rem",
    fontWeight: 400,
    lineHeight: 1.6,
    color: "#4B5563",
    textAlign: "center",
    marginBottom: theme.spacing(3.25),
    [theme.breakpoints.down("xs")]: {
      fontSize: "0.95rem",
      marginBottom: theme.spacing(2.75),
    },
  },
  form: {
    width: "100%",
    position: "relative",
    zIndex: 1,
  },
  fieldLabel: {
    display: "block",
    fontSize: "0.98rem",
    fontWeight: 700,
    lineHeight: 1.4,
    color: "#111111",
    marginBottom: theme.spacing(0.85),
  },
  fieldGroup: {
    marginBottom: theme.spacing(2.3),
  },
  passwordHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(1),
  },
  forgotPassword: {
    fontSize: "0.92rem",
    fontWeight: 500,
    color: "#FF1919",
    textDecoration: "none",
    transition: "opacity 0.2s ease",
    "&:hover": {
      opacity: 0.82,
      textDecoration: "none",
    },
  },
  inputRoot: {
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderRadius: 8,
    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.8)",
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: "rgba(15, 23, 42, 0.12)",
    },
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: "rgba(15, 23, 42, 0.22)",
    },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: "#FF1919",
    },
    "&.Mui-focused": {
      boxShadow: "0 0 0 4px rgba(255, 25, 25, 0.08)",
    },
    "& input": {
      padding: theme.spacing(1.35, 1.3),
      fontSize: "1rem",
      color: "#111111",
    },
    "& input::placeholder": {
      color: "#9CA3AF",
      opacity: 1,
    },
  },
  visibilityButton: {
    color: "#9CA3AF",
  },
  submit: {
    marginTop: theme.spacing(1.1),
    minHeight: 54,
    borderRadius: 8,
    textTransform: "none",
    fontSize: "1.08rem",
    fontWeight: 700,
    letterSpacing: "0.01em",
    background: "linear-gradient(180deg, #FF2626 0%, #FF1919 100%)",
    boxShadow: "0 14px 24px rgba(255, 25, 25, 0.22)",
    "&:hover": {
      background: "linear-gradient(180deg, #F11D1D 0%, #E11414 100%)",
      boxShadow: "0 14px 24px rgba(255, 25, 25, 0.24)",
    },
  },
}));

const Login = () => {
  const classes = useStyles();

  const [user, setUser] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  const { handleLogin } = useContext(AuthContext);

  const handleChangeInput = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  const handlSubmit = (e) => {
    e.preventDefault();
    handleLogin(user);
  };

  return (
    <div className={classes.root}>
      <CssBaseline />
      <Container component="main" maxWidth="xs" className={classes.shell}>
        <div className={classes.card}>
          <div className={classes.paper}>
            <Avatar className={classes.avatar}>
              <KeyboardTabOutlined className={classes.icon} />
            </Avatar>
            <Typography component="h1" className={classes.title}>
              SamaChat
            </Typography>
            <Typography className={classes.subtitle}>
              Entre com suas credenciais para
              <br />
              acessar o sistema
            </Typography>
          </div>
          <form className={classes.form} noValidate onSubmit={handlSubmit}>
            <div className={classes.fieldGroup}>
              <Typography component="label" htmlFor="email" className={classes.fieldLabel}>
                {i18n.t("login.form.email")}
              </Typography>
              <TextField
                variant="outlined"
                required
                fullWidth
                id="email"
                name="email"
                value={user.email}
                onChange={handleChangeInput}
                autoComplete="email"
                autoFocus
                placeholder="seu@email.com"
                InputProps={{
                  classes: {
                    root: classes.inputRoot,
                  },
                }}
              />
            </div>
            <div className={classes.fieldGroup}>
              <div className={classes.passwordHeader}>
                <Typography component="label" htmlFor="password" className={classes.fieldLabel}>
                  {i18n.t("login.form.password")}
                </Typography>
                <Link href="#" className={classes.forgotPassword}>
                  Esqueci minha senha
                </Link>
              </div>
              <TextField
                variant="outlined"
                required
                fullWidth
                name="password"
                id="password"
                value={user.password}
                onChange={handleChangeInput}
                autoComplete="current-password"
                type={showPassword ? "text" : "password"}
                InputProps={{
                  classes: {
                    root: classes.inputRoot,
                  },
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword((currentValue) => !currentValue)}
                        edge="end"
                        className={classes.visibilityButton}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </div>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              className={classes.submit}
            >
              {i18n.t("login.buttons.submit")}
            </Button>
          </form>
        </div>
      </Container>
    </div>
  );
};

export default Login;
