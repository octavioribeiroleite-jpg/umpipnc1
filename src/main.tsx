import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import SocietyScreenEnhancer from "./components/auth/SocietyScreenEnhancer";
import IdentityConfirmationEnhancer from "./components/auth/IdentityConfirmationEnhancer";
import "./index.css";
import "./responsive-foundation.css";
import "./auth-readability.css";
import "./society-selector.css";
import "./identity-confirmation.css";
import { registerServiceWorker } from "./lib/registerSW";

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <SocietyScreenEnhancer />
    <IdentityConfirmationEnhancer />
  </>,
);

registerServiceWorker();
