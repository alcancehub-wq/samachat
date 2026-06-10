import QuickAnswer from "../../models/QuickAnswer";
import AppError from "../../errors/AppError";

interface QuickAnswerData {
  shortcut?: string;
  message?: string;
}

interface Request {
  quickAnswerData: QuickAnswerData;
  quickAnswerId: string;
  userId: number;
}

const UpdateQuickAnswerService = async ({
  quickAnswerData,
  quickAnswerId,
  userId
}: Request): Promise<QuickAnswer> => {
  const { shortcut, message } = quickAnswerData;

  const quickAnswer = await QuickAnswer.findOne({
    where: { id: quickAnswerId, userId },
    attributes: ["id", "shortcut", "message", "userId"]
  });

  if (!quickAnswer) {
    throw new AppError("ERR_NO_QUICK_ANSWERS_FOUND", 404);
  }

  await quickAnswer.update({
    shortcut,
    message
  });

  await quickAnswer.reload({
    attributes: ["id", "shortcut", "message", "userId"]
  });

  return quickAnswer;
};

export default UpdateQuickAnswerService;
