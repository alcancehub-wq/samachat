import React from "react";
import { BrowserRouter, Switch, Redirect } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import LoggedInLayout from "../layout";
import Dashboard from "../pages/Dashboard/";
import Tickets from "../pages/Tickets/";
import Signup from "../pages/Signup/";
import Login from "../pages/Login/";
import Connections from "../pages/Connections/";
import Settings from "../pages/Settings/";
import ApiAdmin from "../pages/ApiAdmin/";
import Users from "../pages/Users";
import Contacts from "../pages/Contacts/";
import QuickAnswers from "../pages/QuickAnswers/";
import Queues from "../pages/Queues/";
import Tags from "../pages/Tags/";
import ContactLists from "../pages/ContactLists/";
import Dialogs from "../pages/Dialogs/";
import Campaigns from "../pages/Campaigns/";
import Integrations from "../pages/Integrations/";
import Informatives from "../pages/Informatives/";
import Kanban from "../pages/Kanban/";
import Tasks from "../pages/Tasks/";
import Files from "../pages/Files/";
import Schedules from "../pages/Schedules/";
import Flows from "../pages/Flows/";
import FlowBuilder from "../pages/FlowBuilder/";
import OpenAI from "../pages/OpenAI/";
import Lgpd from "../pages/Lgpd/";
import Manual from "../pages/Manual/";
import ReleaseNotes from "../pages/ReleaseNotes/";
import { AuthProvider } from "../context/Auth/AuthContext";
import { WhatsAppsProvider } from "../context/WhatsApp/WhatsAppsContext";
import { ThemeProvider } from "../context/DarkMode";
import Route from "./Route";

const Routes = () => {
  const RedirectToQueues = () => <Redirect to="/queues" />;
  const RedirectToSettings = () => <Redirect to="/settings" />;

  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <Switch>
            <Route exact path="/login" component={Login} />
            <Route exact path="/signup" component={Signup} />
            <WhatsAppsProvider>
              <LoggedInLayout>
                <Route exact path="/" component={Dashboard} isPrivate />
                <Route exact path="/tickets/:ticketId?" component={Tickets} isPrivate />
                <Route exact path="/connections" component={Connections} isPrivate />
                <Route exact path="/contacts" component={Contacts} isPrivate />
                <Route exact path="/users" component={Users} isPrivate />
                <Route exact path="/quickAnswers" component={QuickAnswers} isPrivate />
                <Route exact sensitive path="/settings" component={Settings} isPrivate />
                <Route exact sensitive path="/Settings" component={RedirectToSettings} isPrivate />
                <Route exact sensitive path="/queues" component={Queues} isPrivate />
                <Route exact sensitive path="/Queues" component={RedirectToQueues} isPrivate />
                <Route exact path="/api-admin" component={ApiAdmin} isPrivate />
                <Route exact path="/tags" component={Tags} isPrivate />
                <Route exact path="/contactLists" component={ContactLists} isPrivate />
                <Route exact path="/dialogs" component={Dialogs} isPrivate />
                <Route exact path="/campaigns" component={Campaigns} isPrivate />
                <Route exact path="/kanban" component={Kanban} isPrivate />
                <Route exact path="/tasks" component={Tasks} isPrivate />
                <Route exact path="/files" component={Files} isPrivate />
                <Route exact path="/schedules" component={Schedules} isPrivate />
                <Route exact path="/flows" component={Flows} isPrivate />
                <Route
                  exact
                  path="/flowbuilder/:flowId"
                  component={FlowBuilder}
                  isPrivate
                />
                <Route exact path="/informatives" component={Informatives} isPrivate />
                <Route exact path="/integrations" component={Integrations} isPrivate />
                <Route exact path="/openai" component={OpenAI} isPrivate />
                <Route exact path="/lgpd" component={Lgpd} isPrivate />
                <Route exact path="/manual" component={Manual} isPrivate />
                <Route exact path="/release-notes" component={ReleaseNotes} isPrivate />
              </LoggedInLayout>
            </WhatsAppsProvider>
          </Switch>
          <ToastContainer autoClose={3000} />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default Routes;
