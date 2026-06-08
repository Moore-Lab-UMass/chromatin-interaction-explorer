"use client";

import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#59c3ff",
    },
    background: {
      default: "#10101f",
      paper: "#1a1a2e",
    },
  },
  shape: {
    borderRadius: 12,
  },
});

export default theme;
