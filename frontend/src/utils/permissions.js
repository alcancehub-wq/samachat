const normalizeProfile = profile => String(profile || "").toLowerCase();

export const userHasPermission = (user, permission) => {
	if (!permission) {
		return false;
	}

	if (normalizeProfile(user?.profile) === "admin") {
		return true;
	}

	return Array.isArray(user?.permissions) && user.permissions.includes(permission);
};

export const userHasAnyPermission = (user, permissions = []) => {
	return permissions.some(permission => userHasPermission(user, permission));
};

export const getDefaultRouteForUser = user => {
	const routeRules = [
		{ path: "/tickets", permissions: ["tickets.view"] },
		{ path: "/contacts", permissions: ["contacts.view"] },
		{ path: "/kanban", permissions: ["kanban.view"] },
		{ path: "/tasks", permissions: ["tasks.view"] },
		{ path: "/schedules", permissions: ["schedules.view"] },
		{ path: "/files", permissions: ["files.view"] },
		{ path: "/connections", permissions: ["connections.view"] },
		{ path: "/quickAnswers", permissions: ["messages.view", "tickets.view"] },
		{ path: "/campaigns", permissions: ["campaigns.view"] },
		{ path: "/dialogs", permissions: ["dialogs.view"] },
		{ path: "/flows", permissions: ["flows.view"] },
		{ path: "/tags", permissions: ["tags.view"] },
		{ path: "/contactLists", permissions: ["contactLists.view"] },
		{ path: "/users", permissions: ["users.view"] },
		{ path: "/queues", permissions: ["sectors.view"] },
		{ path: "/settings", permissions: ["settings.view"] },
		{ path: "/dashboard", permissions: ["login.access", "messages.view"] },
	];

	const match = routeRules.find(route => userHasAnyPermission(user, route.permissions));

	return match?.path || "/connections";
};