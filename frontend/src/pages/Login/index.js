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
    background: "linear-gradient(180deg, #f7f7f7 0%, #efefef 100%)",
    padding: theme.spacing(3),
  },
  card: {
    width: "100%",
    maxWidth: 430,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: theme.spacing(2.9, 2.9, 2.9),
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.12)",
    border: "1px solid rgba(15, 23, 42, 0.08)",
    [theme.breakpoints.down("xs")]: {
      padding: theme.spacing(2.9, 2.3),
    },
  },
  paper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  avatar: {
    width: 62,
    height: 62,
    marginBottom: theme.spacing(2.3),
    backgroundColor: "rgba(255, 25, 25, 0.12)",
    color: "#FF1919",
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontSize: "1.15rem",
    fontWeight: 700,
    lineHeight: 1.15,
    color: "#111111",
    marginBottom: theme.spacing(1.5),
    textAlign: "center",
    [theme.breakpoints.down("xs")]: {
      fontSize: "1.15rem",
    },
  },
  subtitle: {
    fontSize: "0.9375rem",
    fontWeight: 300,
    lineHeight: 1.55,
    color: "#4B5563",
    textAlign: "center",
    marginBottom: theme.spacing(3.45),
  },
  form: {
    width: "100%",
  },
  fieldLabel: {
    display: "block",
    fontSize: "1rem",
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
    fontSize: "0.9375rem",
    fontWeight: 400,
    color: "#FF1919",
    textDecoration: "none",
  },
  inputRoot: {
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: "rgba(15, 23, 42, 0.12)",
    },
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: "rgba(15, 23, 42, 0.22)",
    },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: "#FF1919",
    },
    "& input": {
      padding: theme.spacing(1.2, 1.25),
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
    marginTop: theme.spacing(1),
    minHeight: 39,
    borderRadius: 4,
    textTransform: "none",
    fontSize: "1.0625rem",
    fontWeight: 700,
    backgroundColor: "#FF1919",
    boxShadow: "none",
    "&:hover": {
      backgroundColor: "#E11414",
      boxShadow: "none",
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
      <Container component="main" maxWidth="xs">
        <div className={classes.card}>
          <div className={classes.paper}>
            <Avatar className={classes.avatar}>
              <KeyboardTabOutlined className={classes.icon} />
            </Avatar>
            <Typography component="h1" className={classes.title}>
              SamaChat
            </Typography>
            <Typography className={classes.subtitle}>
              Entre com suas credenciais para acessar o sistema
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
