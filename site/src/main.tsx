import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { App } from "./App";
import { toAppPath } from "./routes";
import "./index.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("#root não existe no index.html");
}

// O prerender já escreveu a marcação estática deste caminho; o cliente a hidrata no
// lugar, em vez de jogá-la fora e renderizar de novo.
const path = toAppPath(window.location.pathname);

hydrateRoot(
  root,
  <StrictMode>
    <App path={path} />
  </StrictMode>,
);
