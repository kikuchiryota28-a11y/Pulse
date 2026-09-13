import "../src/app/globals.css";
import "../src/pulse-cinematic.css";
import PulseMotion from "./PulseMotion";
import MoveExperienceBridge from "../components/MoveExperienceBridge";
import AuthGate from "../components/AuthGate";
import DeletePulseControl from "../components/DeletePulseControl";
import AccountLauncher from "../components/AccountLauncher";
import PulseShell from "../components/PulseShell.jsx";

export const metadata = {
  title: "Pulse — Discover what catches your attention.",
  description: "A cinematic discovery platform built around curiosity and serendipity.",
};

export default function RootLayout({ children }) {
  return <html lang="ja"><body className="min-h-screen antialiased"><AuthGate><PulseShell><PulseMotion>{children}</PulseMotion></PulseShell><MoveExperienceBridge /><DeletePulseControl /><AccountLauncher /></AuthGate></body></html>;
}
