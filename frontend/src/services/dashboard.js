import api from "./api";

export const getDashboardDateRange = period => {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  if (period === "30d") {
    start.setDate(now.getDate() - 29);
  } else if (period === "7d") {
    start.setDate(now.getDate() - 6);
  }

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10)
  };
};

export const buildDashboardParams = filters => ({
  period: filters?.period || "today",
  queueId:
    filters?.queueId && filters.queueId !== "all" ? Number(filters.queueId) : undefined,
  assigneeId:
    filters?.assigneeId && filters.assigneeId !== "all"
      ? Number(filters.assigneeId)
      : undefined,
});

export const loadDashboardData = async filters => {
  const { data } = await api.get("/dashboard", {
    params: buildDashboardParams(filters),
  });

  return data;
};

const loadUsers = async () => {
  let pageNumber = 1;
  let hasMore = true;
  const users = [];

  while (hasMore) {
    const { data } = await api.get("/users", {
      params: { searchParam: "", pageNumber },
    });

    users.push(...(data.users || []));
    hasMore = Boolean(data.hasMore);
    pageNumber += 1;

    if (!data.hasMore) {
      break;
    }
  }

  return users;
};

export const loadDashboardFilterOptions = async () => {
  const [queuesResponse, users] = await Promise.all([
    api.get("/queue"),
    loadUsers(),
  ]);

  return {
    queues: queuesResponse.data || [],
    users,
  };
};