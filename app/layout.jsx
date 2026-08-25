import "../src/styles.css";

export const metadata = {
  title: "Pulse — Discover the unknown",
  description: "One tap. One piece of the world you probably didn't know existed."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}