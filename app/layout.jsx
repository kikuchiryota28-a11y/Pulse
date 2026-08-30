import "../src/pulse-ui.css";
import PulseMotion from "./PulseMotion";

export const metadata = {
  title: "Pulse — Human Relay",
  description: "A small thing moves through strangers. Each person changes it once.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <PulseMotion>{children}</PulseMotion>
      </body>
    </html>
  );
}
