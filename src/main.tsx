import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import SocietyScreenEnhancer from "./components/auth/SocietyScreenEnhancer";
import "./index.css";
import "./auth-readability.css";
import "./society-selector.css";
import { registerServiceWorker } from "./lib/registerSW";

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <SocietyScreenEnhancer />
  </>,
);

registerServiceWorker();
