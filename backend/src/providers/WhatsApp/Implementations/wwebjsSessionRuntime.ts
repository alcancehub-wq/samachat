interface SessionLike {
  id?: number;
}

export const ensureSessionListed = <T extends SessionLike>(
  sessions: T[],
  session: T
): void => {
  if (session.id === undefined) {
    return;
  }

  const sessionIndex = sessions.findIndex(item => item.id === session.id);

  if (sessionIndex === -1) {
    sessions.push(session);
    return;
  }

  sessions[sessionIndex] = session;
};

export const registerReadySession = <T extends SessionLike>(
  sessions: T[],
  readySessions: Set<number>,
  session: T
): void => {
  if (session.id === undefined) {
    return;
  }

  readySessions.add(session.id);
  ensureSessionListed(sessions, session);
};

export const resolvePersistedStatusFromChangeState = (
  isReady: boolean,
  newState: string
): string => {
  if (newState === "CONNECTED" && !isReady) {
    return "OPENING";
  }

  return newState;
};

export const resetSessionRuntimeState = <T extends SessionLike>(
  sessions: T[],
  readySessions: Set<number>
): void => {
  sessions.splice(0, sessions.length);
  readySessions.clear();
};