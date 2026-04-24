export const metadata = {
  title: "bench — score your Claude Code setup",
  description:
    "A one-page honest portrait of your Claude Code setup. Open-source rubric, local scan, no AI in scoring.",
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
