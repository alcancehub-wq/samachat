const CreateTicketService = require("../../../../dist/services/TicketServices/CreateTicketService").default;
const sequelize = require("../../../../dist/database").default;
const Contact = require("../../../../dist/models/Contact").default;
const Ticket = require("../../../../dist/models/Ticket").default;
const User = require("../../../../dist/models/User").default;
const Whatsapp = require("../../../../dist/models/Whatsapp").default;

describe("CreateTicketService concurrent creation", () => {
  let userId: number;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    const whatsapp = await Whatsapp.create({
      name: "R26C T2 WhatsApp",
      status: "CONNECTED"
    });
    const user = await User.create({
      name: "R26C T2 User",
      email: "r26c-t2@example.test",
      profile: "admin",
      whatsappId: whatsapp.id
    });
    userId = user.id;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it.each([1, 2, 3, 4, 5])(
    "T15 run %s creates at most one operational ticket under a real contact lock",
    async run => {
      const contact = await Contact.create({
        name: `R26C T2 Contact ${run}`,
        number: `551199999${String(run).padStart(4, "0")}`,
        email: ""
      });

      const attempt = () =>
        CreateTicketService({ contactId: contact.id, status: "open", userId, queueId: null }).then(
          () => ({ succeeded: true as const }),
          (error: unknown) => ({ succeeded: false as const, error })
        );
      const results = await Promise.all([attempt(), attempt()]);

      const activeTickets = await Ticket.findAll({
        where: { contactId: contact.id, status: ["open", "pending"] },
        order: [["id", "ASC"]]
      });
      const fulfilled = results.filter(result => result.succeeded);
      const rejected = results.filter(result => !result.succeeded);

      expect(activeTickets).toHaveLength(1);
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0].error).toMatchObject({ statusCode: 409 });
      expect(activeTickets[0].status).toBe("open");
    },
    20000
  );
});