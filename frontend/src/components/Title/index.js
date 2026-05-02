import React from "react";
import Typography from "@material-ui/core/Typography";

export default function Title(props) {
	return (
		<Typography
			variant="h6"
			style={{
				fontWeight: 700,
				color: "var(--cw-text, #1F2937)",
				fontSize: "1.125rem",
				lineHeight: 1.25,
				letterSpacing: "-0.01em",
				margin: 0,
			}}
			gutterBottom
		>
			{props.children}
		</Typography>
	);
}
