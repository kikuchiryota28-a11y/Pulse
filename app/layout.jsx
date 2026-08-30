import "../src/styles.css";
import "../src/styles-v3.css";
import "../src/styles-v4.css";
import "../src/styles-v5.css";
import "../src/styles-v6.css";
import PulseMotion from "./PulseMotion";

export const metadata = { title: "Pulse — Human Relay", description: "One small spark moves through strangers." };
export default function RootLayout({ children }) { return <html lang="en"><body><PulseMotion>{children}</PulseMotion></body></html>; }
