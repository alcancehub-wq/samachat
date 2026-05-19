type MediaDescriptor = {
  mimetype?: string;
  filename?: string;
};

type MediaDeliveryOptions = {
  sendAsVoice?: boolean;
};

const IMAGE_EXTENSION_PATTERN = /\.(jpe?g|png|gif|webp)$/i;

export const shouldSendMediaAsDocument = (
  media: MediaDescriptor,
  options: MediaDeliveryOptions = {}
): boolean => {
  const mimeType = (media.mimetype || "").toLowerCase();
  const fileName = (media.filename || "").toLowerCase();

  if (options.sendAsVoice) {
    return false;
  }

  if (mimeType.startsWith("image/")) {
    return !IMAGE_EXTENSION_PATTERN.test(fileName);
  }

  if (mimeType.startsWith("video/")) {
    return false;
  }

  if (mimeType.startsWith("audio/")) {
    return false;
  }

  return true;
};