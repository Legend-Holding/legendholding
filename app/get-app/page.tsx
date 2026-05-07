import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get the App | Legend Holding Group",
  description:
    "Download the Legend Holding Group app on the App Store or Google Play.",
  robots: { index: false, follow: false },
};

const APP_STORE_URL =
  process.env.NEXT_PUBLIC_APP_STORE_URL ||
  "https://apps.apple.com/app/idXXXXXXXXX";

const PLAY_STORE_URL =
  process.env.NEXT_PUBLIC_PLAY_STORE_URL ||
  "https://play.google.com/store/apps/details?id=com.legendholding.app";

type Platform = "ios" | "android" | "other";

function detectPlatform(userAgent: string): Platform {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "other";
}

/**
 * Build an Android `market://` deep link from the configured
 * https://play.google.com/store/apps/details?id=... URL.
 *
 * Android intercepts the `market://` scheme via the Play Store
 * app and launches it directly — no browser confirmation, same
 * UX as iOS opening the App Store from `apps.apple.com` links.
 *
 * Falls back to the original https URL if the package id can't
 * be parsed (e.g. URL was set to something custom).
 */
function buildAndroidPlayDeepLink(playStoreUrl: string): string {
  try {
    const parsed = new URL(playStoreUrl);
    const id = parsed.searchParams.get("id");
    if (id) return `market://details?id=${id}`;
  } catch {
    // fall through to the configured URL
  }
  return playStoreUrl;
}

export default async function GetAppPage() {
  const headerList = await headers();
  const userAgent = headerList.get("user-agent") || "";
  const platform = detectPlatform(userAgent);

  if (platform === "ios") {
    redirect(APP_STORE_URL);
  }
  if (platform === "android") {
    redirect(buildAndroidPlayDeepLink(PLAY_STORE_URL));
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center p-4 bg-[#2B1C48]">
      <div className="relative w-full max-w-md bg-[#2B1C48] rounded-3xl overflow-hidden shadow-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/bg.svg"
          alt=""
          width={840}
          height={855}
          className="absolute bottom-0 right-0 z-0 pointer-events-none"
          style={{ opacity: 0.35 }}
        />

        <div className="relative z-10 px-6 py-10 flex flex-col items-center text-center">
          <Image
            src="/images/legend-logo.png"
            alt="Legend Holding Group"
            width={160}
            height={57}
            className="h-14 w-auto object-contain mb-8"
            priority
          />

          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Get the Legend Holding Group App
          </h1>
          <p className="text-white/70 text-base mb-8">
            Available on iOS and Android. Tap your platform below to install.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Download on the App Store"
              className="flex items-center justify-center gap-3 bg-black hover:bg-black/90 text-white rounded-2xl px-5 py-3 transition-colors flex-1 min-w-[180px]"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-7 h-7"
                fill="currentColor"
                aria-hidden
              >
                <path d="M17.05 12.04c-.03-3.05 2.49-4.51 2.6-4.58-1.42-2.07-3.62-2.36-4.4-2.39-1.87-.19-3.66 1.1-4.61 1.1-.96 0-2.42-1.07-3.99-1.04-2.05.03-3.95 1.19-5 3.02-2.13 3.69-.54 9.16 1.54 12.16 1.02 1.47 2.22 3.12 3.79 3.06 1.53-.06 2.11-.99 3.96-.99 1.84 0 2.36.99 3.97.96 1.64-.03 2.68-1.5 3.68-2.97 1.16-1.7 1.64-3.36 1.66-3.45-.04-.02-3.18-1.22-3.21-4.84zM14.34 4.45c.83-1.01 1.4-2.42 1.24-3.83-1.2.05-2.66.8-3.52 1.81-.77.89-1.45 2.32-1.27 3.71 1.34.1 2.71-.68 3.55-1.69z" />
              </svg>
              <div className="text-left leading-tight">
                <div className="text-[10px] uppercase tracking-wide text-white/70">
                  Download on the
                </div>
                <div className="text-lg font-semibold">App Store</div>
              </div>
            </a>

            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Get it on Google Play"
              className="flex items-center justify-center gap-3 bg-black hover:bg-black/90 text-white rounded-2xl px-5 py-3 transition-colors flex-1 min-w-[180px]"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-7 h-7"
                aria-hidden
              >
                <path
                  fill="#00C2FF"
                  d="M3.6 1.6c-.4.3-.6.8-.6 1.4v18c0 .6.2 1.1.6 1.4l10.5-10.4L3.6 1.6z"
                />
                <path
                  fill="#FFD400"
                  d="M17.6 8.6 14.1 6.6 3.6 1.6 14.1 12 17.6 8.6z"
                />
                <path
                  fill="#FF3D00"
                  d="M3.6 22.4 14.1 12 3.6 1.6c-.1.1 0 0 0 0L14.1 17.4 3.6 22.4z"
                />
                <path
                  fill="#00E676"
                  d="M20.5 10.4 17.6 8.6 14.1 12l3.5 3.4 2.9-1.7c.9-.5.9-1.8 0-2.3l-.1-.1.1.1z"
                />
              </svg>
              <div className="text-left leading-tight">
                <div className="text-[10px] uppercase tracking-wide text-white/70">
                  Get it on
                </div>
                <div className="text-lg font-semibold">Google Play</div>
              </div>
            </a>
          </div>

          <p className="mt-10 text-white/50 text-xs">
            Powered by Legend Holding Group
          </p>
        </div>
      </div>
    </div>
  );
}
