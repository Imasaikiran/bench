export const metadata = {
  title: "bench: score your Claude Code setup",
  description:
    "A one-page honest portrait of your Claude Code setup. Open-source rubric, local scan, no AI in scoring.",
};

// Spec §11 NFR: mobile 320-380px and 381-768px viewports must render the
// portrait on one scroll without horizontal overflow. The viewport meta tag
// makes mobile browsers respect CSS pixel widths instead of the 980px desktop
// emulation default.
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <script
          defer
          data-domain="bench.dev"
          src="https://plausible.io/js/script.js"
        />
      </body>
    </html>
  );
}
