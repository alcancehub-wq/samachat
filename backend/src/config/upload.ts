import path from "path";
import multer from "multer";

const publicFolder = path.resolve(__dirname, "..", "..", "public");
export default {
  directory: publicFolder,

  fileFilter(
    req: Express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) {
    if (file.mimetype === "audio/webm") {
      return cb(null, true);
    }

    return cb(null, true);
  },

  storage: multer.diskStorage({
    destination: publicFolder,
    filename(req, file, cb) {
      const fileName = new Date().getTime() + path.extname(file.originalname);

      return cb(null, fileName);
    }
  })
};
