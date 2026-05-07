"use client"

import { useEffect, useState } from "react"
import { AdminDashboardLayout } from "@/components/admin/dashboard-layout"
import { UnauthorizedAccess } from "@/components/admin/unauthorized-access"
import { useAdminPermissions, clearPermissionsCache } from "@/hooks/use-admin-permissions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  Download,
  Printer,
  Copy,
  Check,
  Smartphone,
  ExternalLink,
  AlertTriangle,
} from "lucide-react"

/**
 * Smart redirect URL the QR encodes. When scanned:
 *   - iOS device   -> redirected to App Store
 *   - Android      -> redirected to Google Play
 *   - Desktop / unknown -> sees /get-app landing page with both store buttons
 *
 * The base host is taken from NEXT_PUBLIC_SITE_URL (set this in your
 * production / staging environment). On a developer machine without
 * NEXT_PUBLIC_SITE_URL set we fall back to the public production
 * domain so a QR copy/print never accidentally encodes "localhost"
 * (which a phone can't reach over the network).
 *
 * Store destinations are configured server-side at /get-app via
 * NEXT_PUBLIC_APP_STORE_URL and NEXT_PUBLIC_PLAY_STORE_URL.
 */
function getRedirectUrl(): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://www.legendholding.com"
  return `${baseUrl}/get-app`
}

function isLocalhostUrl(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/i.test(
    url,
  )
}

export function AppQrClient() {
  const { userRole, isLoading: permissionsLoading, hasPermission } = useAdminPermissions()
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [redirectUrl, setRedirectUrl] = useState("")

  useEffect(() => {
    setRedirectUrl(getRedirectUrl())
  }, [])

  useEffect(() => {
    if (!redirectUrl) return
    let cancelled = false
    setGenerating(true)
    import("@/lib/qr-with-logo")
      .then(({ generateQRWithLogo }) =>
        generateQRWithLogo(redirectUrl, { width: 512, margin: 2 })
      )
      .then((url) => {
        if (!cancelled) setQrDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null)
      })
      .finally(() => {
        if (!cancelled) setGenerating(false)
      })
    return () => {
      cancelled = true
    }
  }, [redirectUrl])

  const handleDownload = () => {
    if (!qrDataUrl) return
    const link = document.createElement("a")
    link.href = qrDataUrl
    link.download = "legend-holding-app-qr.png"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("QR code downloaded")
  }

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(redirectUrl)
      setCopied(true)
      toast.success("URL copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Could not copy to clipboard")
    }
  }

  const handlePrint = () => {
    if (!qrDataUrl) return
    const printWindow = window.open("", "_blank", "width=600,height=700")
    if (!printWindow) {
      toast.error("Pop-up blocked. Please allow pop-ups to print.")
      return
    }
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Legend Holding Group - App QR Code</title>
          <style>
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              background: #fff;
              color: #2B1C48;
              padding: 32px;
            }
            .sheet {
              text-align: center;
              max-width: 480px;
            }
            .title {
              font-size: 22px;
              font-weight: 700;
              margin: 0 0 6px 0;
            }
            .subtitle {
              font-size: 14px;
              color: #555;
              margin: 0 0 24px 0;
            }
            img {
              width: 360px;
              height: 360px;
              display: block;
              margin: 0 auto 16px auto;
            }
            .scan-hint {
              font-size: 13px;
              color: #555;
              margin-top: 8px;
            }
            .footer {
              font-size: 11px;
              color: #888;
              margin-top: 24px;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <p class="title">Get the Legend Holding Group App</p>
            <p class="subtitle">Scan to download on iOS or Android</p>
            <img src="${qrDataUrl}" alt="App QR code" />
            <p class="scan-hint">iPhone &rarr; App Store &nbsp; | &nbsp; Android &rarr; Google Play</p>
            <p class="footer">Powered by Legend Holding Group</p>
          </div>
          <script>
            window.onload = function () {
              setTimeout(function () { window.print(); }, 200);
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const handleSignOut = async () => {
    try {
      clearPermissionsCache()
      await fetch("/api/admin/auth/logout", { method: "POST" })
      window.location.href = "/admin/login"
    } catch {
      window.location.href = "/admin/login"
    }
  }

  const appStoreUrl =
    process.env.NEXT_PUBLIC_APP_STORE_URL ||
    "https://apps.apple.com/app/idXXXXXXXXX"
  const playStoreUrl =
    process.env.NEXT_PUBLIC_PLAY_STORE_URL ||
    "https://play.google.com/store/apps/details?id=com.legendholding.app"

  const content = (
    <div className="min-h-[calc(100vh-4rem)] p-6 md:p-8 lg:p-10 max-w-[1400px] mx-auto">
      {permissionsLoading ? (
        <PageSkeleton />
      ) : !hasPermission("dashboard") ? (
        <UnauthorizedAccess
          requiredPermission="dashboard"
          currentUserRole={userRole?.role}
        />
      ) : (
        <>
          <header className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Smartphone className="h-5 w-5" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                App QR Code
              </h1>
            </div>
            <p className="text-muted-foreground max-w-2xl">
              A single QR code that automatically routes scans to the right
              store: iPhone scans open the App Store, Android scans open Google
              Play, and desktop scans land on a page with both download
              buttons.
            </p>
          </header>

          {isLocalhostUrl(redirectUrl) && (
            <div className="mb-6 flex gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-700/60 dark:bg-amber-900/20 p-4">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="text-sm text-amber-900 dark:text-amber-200 space-y-1.5">
                <p className="font-medium">
                  This QR points to a local/private address.
                </p>
                <p>
                  Your phone is not on the same network as this dev server, so
                  scanning won&apos;t open the page. Set{" "}
                  <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100">
                    NEXT_PUBLIC_SITE_URL
                  </code>{" "}
                  in your environment to your public domain (e.g.{" "}
                  <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100">
                    https://www.legendholding.com
                  </code>
                  ) and restart the server.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>QR Code</CardTitle>
                <CardDescription>
                  Download or print this QR for posters, packaging, brochures
                  or digital signage.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-6">
                  <div className="rounded-2xl bg-white border border-border p-4 shadow-sm">
                    {generating || !qrDataUrl ? (
                      <Skeleton className="w-72 h-72 rounded-lg" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={qrDataUrl}
                        alt="App download QR code"
                        className="w-72 h-72"
                      />
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                    <Button
                      onClick={handleDownload}
                      disabled={!qrDataUrl}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download PNG
                    </Button>
                    <Button
                      onClick={handlePrint}
                      disabled={!qrDataUrl}
                      variant="outline"
                      className="gap-2"
                    >
                      <Printer className="h-4 w-4" />
                      Print
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Where it sends people</CardTitle>
                <CardDescription>
                  The QR encodes a single redirect URL. The destination is
                  decided when the link is opened.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                    Redirect URL (encoded in QR)
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 rounded-lg bg-muted text-sm break-all">
                      {redirectUrl || "—"}
                    </code>
                    <Button
                      onClick={handleCopyUrl}
                      size="icon"
                      variant="outline"
                      title="Copy URL"
                      aria-label="Copy URL"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <DestinationRow
                    label="iPhone / iPad"
                    url={appStoreUrl}
                    storeName="App Store"
                  />
                  <DestinationRow
                    label="Android"
                    url={playStoreUrl}
                    storeName="Google Play"
                  />
                  <DestinationRow
                    label="Desktop / other"
                    url={redirectUrl}
                    storeName="Landing page with both buttons"
                  />
                </div>

                <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 leading-relaxed">
                  <strong className="text-foreground">Tip:</strong> To change
                  the App Store / Play Store destinations, update{" "}
                  <code className="text-foreground">
                    NEXT_PUBLIC_APP_STORE_URL
                  </code>{" "}
                  and{" "}
                  <code className="text-foreground">
                    NEXT_PUBLIC_PLAY_STORE_URL
                  </code>{" "}
                  in your environment configuration. The QR itself does not
                  need to be regenerated.
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )

  return (
    <AdminDashboardLayout onSignOut={handleSignOut}>
      {content}
    </AdminDashboardLayout>
  )
}

function DestinationRow({
  label,
  url,
  storeName,
}: {
  label: string
  url: string
  storeName: string
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground truncate">{storeName}</p>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-primary hover:underline inline-flex items-center gap-1 shrink-0 mt-0.5"
      >
        Open
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  )
}

function PageSkeleton() {
  return (
    <>
      <header className="mb-8">
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-5 w-full max-w-2xl" />
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Skeleton className="lg:col-span-3 h-[480px] rounded-xl" />
        <Skeleton className="lg:col-span-2 h-[480px] rounded-xl" />
      </div>
    </>
  )
}
