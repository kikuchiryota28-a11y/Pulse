import "../src/styles.css";
import "../src/styles-v3.css";
import "../src/styles-v4.css";

export const metadata = {
  title: "Pulse — Human Relay",
  description: "One small action moves through strangers. Nobody sees the end coming."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}