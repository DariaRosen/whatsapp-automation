export const metadata = {
  title: "WhatsApp Automation",
  description: "WhatsApp Cloud API webhook",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
