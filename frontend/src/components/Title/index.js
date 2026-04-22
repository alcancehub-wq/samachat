import React from "react";
import Typography from "@material-ui/core/Typography";

export default function Title(props) {
	return (
		<Typography variant="h6" style={{ fontWeight: 700 }} gutterBottom>
			{props.children}
		</Typography>
	);
}
