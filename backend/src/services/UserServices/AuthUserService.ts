import User from "../../models/User";
import AppError from "../../errors/AppError";
import {
  createAccessToken,
  createRefreshToken
} from "../../helpers/CreateTokens";
import { SerializeUser } from "../../helpers/SerializeUser";
import Queue from "../../models/Queue";
import QueuePermission from "../../models/QueuePermission";
import { logger } from "../../utils/logger";

interface SerializedUser {
  id: number;
  name: string;
  email: string;
  profile: string;
  queues: Queue[];
}

interface Request {
  email: string;
  password: string;
}

interface Response {
  serializedUser: SerializedUser;
  token: string;
  refreshToken: string;
}

const AuthUserService = async ({
  email,
  password
}: Request): Promise<Response> => {
  logger.info({ email }, "Auth login lookup user");

  let user: User | null = null;
  try {
    user = await User.findOne({
      where: { email },
      include: [
        {
          model: Queue,
          as: "queues",
          include: [QueuePermission]
        }
      ]
    });
  } catch (error) {
    logger.error({ err: error }, "Auth login user lookup failed");
    if (error instanceof Error) {
      logger.error({ stack: error.stack }, "Auth login user lookup stack");
    }
    throw error;
  }

  if (!user) {
    logger.warn({ email }, "Auth login user not found");
    throw new AppError("ERR_INVALID_CREDENTIALS", 401);
  }

  try {
    const passwordMatches = await user.checkPassword(password);
    if (!passwordMatches) {
      logger.warn({ email, userId: user.id }, "Auth login invalid password");
      throw new AppError("ERR_INVALID_CREDENTIALS", 401);
    }
  } catch (error) {
    logger.error({ err: error, userId: user.id }, "Auth login password check failed");
    if (error instanceof Error) {
      logger.error({ stack: error.stack }, "Auth login password check stack");
    }
    throw error;
  }

  let token: string;
  let refreshToken: string;

  try {
    token = createAccessToken(user);
    refreshToken = createRefreshToken(user);
  } catch (error) {
    logger.error({ err: error, userId: user.id }, "Auth login token generation failed");
    if (error instanceof Error) {
      logger.error({ stack: error.stack }, "Auth login token generation stack");
    }
    throw error;
  }

  const serializedUser = SerializeUser(user);

  logger.info({ userId: user.id }, "Auth login success");

  return {
    serializedUser,
    token,
    refreshToken
  };
};

export default AuthUserService;
