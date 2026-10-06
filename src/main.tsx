import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import SocietyScreenEnhancer from "./components/auth/SocietyScreenEnhancer";
import IdentityConfirmationEnhancer from "./components/auth/IdentityConfirmationEnhancer";
import "./index.css";
import "./responsive-foundation.css";
import "./auth-readability.css";
import "./society-selector.css";
import "./identity-confirmation.css";
import "./interface-system.css";
import { registerServiceWorker } from "./lib/registerSW";
import { startAppResumeHome } from "./lib/app-resume-navigation";

// registerSW restores any update route during module initialization. Returning
// after a long absence must take precedence before the app renders that route.
const resumeHome = startAppResumeHome(window, navigator);

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <SocietyScreenEnhancer />
    <IdentityConfirmationEnhancer />
  </>,
);
resumeHome.markMounted();
if (import.meta.hot) import.meta.hot.dispose(() => resumeHome.stop());

registerServiceWorker();
