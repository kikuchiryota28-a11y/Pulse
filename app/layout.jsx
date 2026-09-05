import "../src/pulse-social.css";
import PulseMotion from "./PulseMotion";
import MoveExperienceBridge from "../components/MoveExperienceBridge";
import AuthGate from "../components/AuthGate";

export const metadata = {
  title: "Pulse — Post. Let people change it.",
  description: "A social network where people do not just react to posts — they change them.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthGate>
          <PulseMotion>{children}</PulseMotion>
          <MoveExperienceBridge />
        </AuthGate>
      </body>
    </html>
  );
}
