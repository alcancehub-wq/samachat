import * as Yup from "yup";
import { Request, Response } from "express";

import AppError from "../errors/AppError";
import {
  addDocument,
  listKnowledgeFiles,
  MAX_DOCUMENT_CHARS,
  removeDocument,
  searchKnowledge
} from "../services/SdrKnowledgeServices/KnowledgeService";

const validate = async (schema: Yup.ObjectSchema<any>, data: unknown) => {
  try {
    await schema.validate(data);
  } catch (err) {
    throw new AppError(err.message);
  }
};

export const index = async (_req: Request, res: Response) =>
  res.json({ files: await listKnowledgeFiles(), maxChars: MAX_DOCUMENT_CHARS });

export const store = async (req: Request, res: Response) => {
  await validate(
    Yup.object().shape({
      name: Yup.string().required().max(200),
      category: Yup.string().max(80),
      content: Yup.string().required()
    }),
    req.body
  );
  return res.status(201).json(await addDocument(req.body));
};

export const remove = async (req: Request, res: Response) => {
  await removeDocument(Number(req.params.id));
  return res.status(204).send();
};

// Para testar a busca na tela: devolve os trechos que o agente receberia.
export const search = async (req: Request, res: Response) => {
  await validate(
    Yup.object().shape({ query: Yup.string().required() }),
    req.body
  );
  return res.json({ hits: await searchKnowledge(req.body.query) });
};
