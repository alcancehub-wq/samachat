interface ResolveMediaMessageBodyInput {
  body?: string | null;
  originalFilename?: string | null;
  storedFilename?: string | null;
}

const ResolveMediaMessageBody = ({
  body,
  originalFilename,
  storedFilename
}: ResolveMediaMessageBodyInput): string => {
  return body || originalFilename || storedFilename || "";
};

export default ResolveMediaMessageBody;