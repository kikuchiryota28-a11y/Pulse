import "../src/app/globals.css";
import "../src/pulse-social.css";
import "../src/pulse-ui-v1.css";
import "../src/pulse-art-direction-v2.css";
import "../src/pulse-reveal-v2.css";
import "../src/pulse-playful-spatial.css";
import "../src/pulse-ui-v3.css";
import "../src/mobile-overflow-fix.css";
import "../src/pulse-content-focus.css";
import "../src/pulse-design-system.css";
import "../src/pulse-fluid-polish.css";
import "../src/pulse-fluid-components.css";
import "../src/pulse-fluid-screens.css";
import "../src/pulse-fluid-final.css";
import "../src/pulse-ui-reset.css";
import "../src/pulse-hard-dark.css";
import PulseMotion from "./PulseMotion";
import MoveExperienceBridge from "../components/MoveExperienceBridge";
import AuthGate from "../components/AuthGate";
import DeletePulseControl from "../components/DeletePulseControl";
import AccountLauncher from "../components/AccountLauncher";
import PulseShell from "../components/PulseShell.jsx";

export const metadata = {
  title: "Pulse — Change what happens next.",
  description: "A social experience where every contribution changes the next moment.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja" className="dark" style={{ backgroundColor: "#060608" }}>
      <body className="bg-[#060608] text-[#FAFAFA] antialiased min-h-screen" style={{ backgroundColor: "#060608", color: "#FAFAFA" }}>
        <AuthGate>
          <PulseShell>
            <PulseMotion>{children}</PulseMotion>
          </PulseShell>
          <MoveExperienceBridge />
          <DeletePulseControl />
          <AccountLauncher />
        </AuthGate>
      </body>
    </html>
  );
}
