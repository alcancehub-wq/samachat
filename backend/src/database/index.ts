import { Sequelize } from "sequelize-typescript";
import User from "../models/User";
import Setting from "../models/Setting";
import Contact from "../models/Contact";
import Ticket from "../models/Ticket";
import Whatsapp from "../models/Whatsapp";
import ContactCustomField from "../models/ContactCustomField";
import Message from "../models/Message";
import Queue from "../models/Queue";
import QueuePermission from "../models/QueuePermission";
import WhatsappQueue from "../models/WhatsappQueue";
import UserQueue from "../models/UserQueue";
import QuickAnswer from "../models/QuickAnswer";
import WppKey from "../models/WppKey";
import Tag from "../models/Tag";
import ContactTag from "../models/ContactTag";
import TicketTag from "../models/TicketTag";
import ContactList from "../models/ContactList";
import ContactListContact from "../models/ContactListContact";
import Dialog from "../models/Dialog";
import Campaign from "../models/Campaign";
import CampaignLog from "../models/CampaignLog";
import Integration from "../models/Integration";
import Webhook from "../models/Webhook";
import WebhookLog from "../models/WebhookLog";
import Informative from "../models/Informative";
import KanbanColumn from "../models/KanbanColumn";
import KanbanCard from "../models/KanbanCard";
import Task from "../models/Task";
import Flow from "../models/Flow";
import FlowNode from "../models/FlowNode";
import FlowEdge from "../models/FlowEdge";
import FlowTrigger from "../models/FlowTrigger";
import FlowExecution from "../models/FlowExecution";
import FlowExecutionLog from "../models/FlowExecutionLog";
import Schedule from "../models/Schedule";
import ScheduleLog from "../models/ScheduleLog";
import OpenAISetting from "../models/OpenAISetting";
import OpenAILog from "../models/OpenAILog";

// eslint-disable-next-line
const dbConfig = require("../config/database");
// import dbConfig from "../config/database";

const sequelize = new Sequelize(dbConfig);

const models = [
  User,
  Contact,
  Ticket,
  Message,
  Whatsapp,
  ContactCustomField,
  Setting,
  Queue,
  QueuePermission,
  WhatsappQueue,
  UserQueue,
  QuickAnswer,
  WppKey,
  Tag,
  ContactTag,
  TicketTag,
  ContactList,
  ContactListContact,
  Dialog,
  Campaign,
  CampaignLog,
  Integration,
  Webhook,
  WebhookLog,
  Informative,
  KanbanColumn,
  KanbanCard,
  Task,
  Flow,
  FlowNode,
  FlowEdge,
  FlowTrigger,
  FlowExecution,
  FlowExecutionLog,
  Schedule,
  ScheduleLog,
  OpenAISetting,
  OpenAILog
];

sequelize.addModels(models);

export default sequelize;
