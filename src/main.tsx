import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import AppShell from "./components/layout/AppShell";
import SocietyScreenEnhancer from "./components/auth/SocietyScreenEnhancer";
import IdentityConfirmationEnhancer from "./components/auth/IdentityConfirmationEnhancer";
import "./index.css";
import "./responsive-foundation.css";
import "./auth-readability.css";
import "./society-selector.css";
import "./identity-confirmation.css";
import "./interface-system.css";
import "./mobile-app-shell.css";
import "./opening.css";
import { registerServiceWorker } from "./lib/registerSW";
import { startAppResumeHome } from "./lib/app-resume-navigation";
import { startAppOpening } from "./lib/app-opening";

// registerSW restores any update route during module initialization. The PWA
// launch policy takes precedence before the app can render a private route.
const resumeHome = startAppResumeHome(window, navigator);
const root = document.getElementById("root")!;
const splash = document.getElementById("ipnc-opening");
const opening = splash ? startAppOpening({ root, splash }) : null;

createRoot(root).render(
  <AppShell>
    <App />
    <SocietyScreenEnhancer />
    <IdentityConfirmationEnhancer />
  </AppShell>,
);
resumeHome.markMounted();
if (import.meta.hot) import.meta.hot.dispose(() => { resumeHome.stop(); opening?.stop(); });

registerServiceWorker();
