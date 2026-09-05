interface Request {
  original: string;
  candidate: string;
}

const stripDiacritics = (value: string): string =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const isAccentOnlyCorrection = (
  original: string,
  candidate: string
): boolean => {
  if (typeof original !== "string" || typeof candidate !== "string") {
    return false;
  }

  if (!candidate) {
    return false;
  }

  return stripDiacritics(original) === stripDiacritics(candidate);
};

const ApplyAccentOnlyCorrectionService = ({
  original,
  candidate
}: Request): string => {
  if (!isAccentOnlyCorrection(original, candidate)) {
    return original;
  }

  return candidate;
};

export default ApplyAccentOnlyCorrectionService;