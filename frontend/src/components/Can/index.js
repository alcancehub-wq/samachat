import React, { useContext } from "react";
import rules from "../../rules";
import { AuthContext } from "../../context/Auth/AuthContext";

const check = (role, action, data) => {
	const permissions = rules[role];
	if (!permissions) {
		// role is not present in the rules
		return false;
	}

	const staticPermissions = permissions.static;

	if (staticPermissions && staticPermissions.includes(action)) {
		// static rule not provided for action
		return true;
	}

	const dynamicPermissions = permissions.dynamic;

	if (dynamicPermissions) {
		const permissionCondition = dynamicPermissions[action];
		if (!permissionCondition) {
			// dynamic rule not provided for action
			return false;
		}

		return permissionCondition(data);
	}
	return false;
};

const Can = ({ role, perform, data, yes, no }) => {
	const auth = useContext(AuthContext);
	const permissions = data?.permissions || auth?.user?.permissions;

	if (Array.isArray(permissions) && permissions.includes(perform)) {
		return yes();
	}

	return check(role, perform, data) ? yes() : no();
};

Can.defaultProps = {
	yes: () => null,
	no: () => null,
};

export { Can };
