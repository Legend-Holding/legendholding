/**
 * Minimal layout for /get-app landing page.
 * No site header/footer so the page renders cleanly when reached
 * from a QR code scan. On mobile the route redirects to the
 * App Store / Play Store before this layout renders.
 */
export default function GetAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#2B1C48]">
      {children}
    </div>
  );
}
