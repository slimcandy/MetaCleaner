import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const container: HTMLElement = document.getElementById("app") as HTMLElement;
createRoot(container).render(<App />);
