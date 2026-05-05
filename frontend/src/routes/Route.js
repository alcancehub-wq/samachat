import React, { useContext } from "react";
import { Route as RouterRoute, Redirect } from "react-router-dom";

import { AuthContext } from "../context/Auth/AuthContext";
import BackdropLoading from "../components/BackdropLoading";
import { getDefaultRouteForUser } from "../utils/permissions";

const Route = ({ component: Component, isPrivate = false, ...rest }) => {
  const { isAuth, loading, user } = useContext(AuthContext);

  if (loading) {
    return <BackdropLoading />;
  }

  if (!isAuth && isPrivate) {
    return (
      <>
        <Redirect to={{ pathname: "/login", state: { from: rest.location } }} />
      </>
    );
  }

  if (isAuth && !isPrivate) {
    return (
      <>
        <Redirect
          to={{ pathname: getDefaultRouteForUser(user), state: { from: rest.location } }}
        />
      </>
    );
  }

  return (
    <>
      <RouterRoute {...rest} component={Component} />
    </>
  );
};

export default Route;
