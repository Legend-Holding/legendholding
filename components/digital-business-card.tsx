"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Globe,
  QrCode,
  Download,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** New LinkedIn logo (2021+) - rounded square with "in" */
function LinkedInIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function WhatsAppIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function LocationIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
    </svg>
  );
}

/** Download icon: only the arrow bounces (horizontal line stays static) */
function DownloadIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {/* Base line - static */}
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      {/* Arrow - animated */}
      <g className="animate-download-icon">
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </g>
    </svg>
  );
}
import { Button } from "@/components/ui/button";

export interface TeamMember {
  name: string;
  designation: string;
  company: string;
  email?: string;
  phone?: string;
  photo: string;
  linkedin?: string;
  whatsapp?: string;
  location?: string;
  location_link?: string;
  website?: string;
}

interface DigitalBusinessCardProps {
  member: TeamMember;
}

function getMapsLink(member: TeamMember): string {
  let raw = (member.location_link || "").trim();
  if (raw) {
    // If someone pasted an entire iframe snippet, extract the src URL first.
    const srcMatch = raw.match(/src=["']([^"']+)["']/i);
    if (srcMatch?.[1]) {
      raw = srcMatch[1].trim();
    }

    // Some records store Google Maps "embed" URLs, which only work in iframes.
    // Convert them to a regular maps URL so clicking opens correctly.
    if (raw.includes("google.com/maps/embed")) {
      try {
        const url = new URL(raw);
        const pb = url.searchParams.get("pb");
        // Prefer saved address text so Google shows place/address label
        // instead of raw coordinates.
        if (member.location) {
          return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(member.location)}`;
        }
        // Best effort: extract coordinates from embed payload and open
        // a direct map query, which is reliable across mobile/desktop.
        if (pb) {
          const coordMatch = pb.match(/!2d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)/);
          if (coordMatch) {
            const lng = coordMatch[1];
            const lat = coordMatch[2];
            return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
          }
          return `https://www.google.com/maps?pb=${pb}`;
        }

        // Some embed URLs use q/query in place of pb
        const q = url.searchParams.get("q") || url.searchParams.get("query");
        if (q) {
          return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
        }
        if (member.location) {
          return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(member.location)}`;
        }
        return "https://www.google.com/maps";
      } catch {
        if (member.location) {
          return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(member.location)}`;
        }
        return "https://www.google.com/maps";
      }
    }
    return raw;
  }

  if (member.location) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(member.location)}`;
  }

  return "https://www.google.com/maps";
}

// Escape vCard 3.0 special characters: \ → \\ , ; → \;
function escapeVCardValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

export function DigitalBusinessCard({ member }: DigitalBusinessCardProps) {
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [photoSrc, setPhotoSrc] = useState(member.photo || "/placeholder.svg");

  useEffect(() => {
    setPhotoSrc(member.photo || "/placeholder.svg");
  }, [member.photo]);

  // Generate QR with logo for production profile URL when dialog opens (so scan always opens live site)
  useEffect(() => {
    if (!qrOpen || typeof window === "undefined") {
      setQrDataUrl(null);
      return;
    }
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://www.legendholding.com";
    const profileUrl = baseUrl + window.location.pathname;
    let cancelled = false;
    import("@/lib/qr-with-logo").then(({ generateQRWithLogo }) => {
      generateQRWithLogo(profileUrl, { width: 320, margin: 2 }).then((url: string) => {
        if (!cancelled) setQrDataUrl(url);
      }).catch(() => { if (!cancelled) setQrDataUrl(null); });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [qrOpen]);

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `qr-${member.name.replace(/\s+/g, "-")}.png`;
    link.click();
  };

  const handleDownloadVCard = async () => {
    const name = escapeVCardValue(member.name);
    const company = escapeVCardValue(member.company);
    const designation = escapeVCardValue(member.designation);
    const email = member.email || "info@legendholding.com";
    const whatsappDigits = member.whatsapp?.replace(/\D/g, "") ?? "";
    const phone = member.phone || (whatsappDigits ? `+${whatsappDigits}` : "+971 4 XXX XXXX");
    const location = "";

    // N: Family name;Given name;;; (for better contact app compatibility)
    const nameParts = member.name.trim().split(/\s+/);
    const givenName = nameParts[0] || member.name;
    const familyName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

    // Fetch photo and convert to base64 for vCard
    let photoLine = "";
    if (member.photo) {
      try {
        const response = await fetch(member.photo);
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            // Remove data URL prefix (e.g. "data:image/png;base64,")
            const base64Data = result.split(",")[1] || "";
            resolve(base64Data);
          };
          reader.readAsDataURL(blob);
        });
        // Determine image type from blob
        const imageType = blob.type.includes("png") ? "PNG" : "JPEG";
        if (base64) {
          photoLine = `PHOTO;ENCODING=b;TYPE=${imageType}:${base64}`;
        }
      } catch {
        // If photo fetch fails, continue without photo
        console.warn("Could not fetch photo for vCard");
      }
    }

    const vCard = `BEGIN:VCARD
VERSION:3.0
N:${escapeVCardValue(familyName)};${escapeVCardValue(givenName)};;;
FN:${name}
ORG:${company}
TITLE:${designation}
TEL;TYPE=WORK,VOICE:${phone}
EMAIL:${email}
${photoLine}
${member.whatsapp ? `URL:https://wa.me/${member.whatsapp.replace(/\D/g, "")}` : ""}
${member.website ? `URL:${member.website}` : ""}
${location ? `ADR;TYPE=WORK:;;${location}` : ""}
NOTE:${escapeVCardValue(member.company)} - ${designation}
END:VCARD`;

    const fileName = `${member.name.replace(/\s+/g, "_")}.vcf`;
    
    // Create vCard blob with proper MIME type
    const vcardBlob = new Blob([vCard], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(vcardBlob);
    
    // Create and trigger download
    // iOS Safari automatically intercepts .vcf downloads and shows "Add to Contacts"
    // Android downloads the file; user can tap the notification to open in Contacts
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Cleanup after a delay to ensure download starts
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center p-0 md:p-4 bg-transparent">
      <div className="w-full max-w-md min-h-screen min-h-[100dvh] md:min-h-0 flex flex-col">
        {/* Card Container - full viewport on mobile, rounded card on desktop */}
        <div className="relative bg-[#2B1C48] flex-1 min-h-screen min-h-[100dvh] md:min-h-0 w-full rounded-none md:rounded-3xl overflow-hidden shadow-2xl flex flex-col">
          {/* Logo - top right corner (same as header) */}
          <div className="absolute top-0 right-0 z-30 p-5 pointer-events-none">
            <Image
              src="/images/legend-logo.png"
              alt="Legend Holding Group"
              width={120}
              height={43}
              className="h-12 w-auto object-contain"
            />
          </div>

          {/* Scrollable middle: image + content - fills space so Powered by stays at bottom */}
          <div className="relative z-10 flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Profile Photo - slightly taller than square */}
          <div className="relative aspect-[4/5] w-full block overflow-hidden leading-[0] shrink-0 [contain:strict]">
            <Image
              src={photoSrc}
              alt={member.name}
              fill
              className="object-cover object-[50%_40%] block outline-none align-bottom"
              sizes="(max-width: 448px) 100vw, 448px"
              priority
              style={{ outline: 'none', verticalAlign: 'bottom' }}
              onError={() => setPhotoSrc("/placeholder.svg")}
            />
            {/* Bottom gradient: smooth blend from image into card color, no hard edge */}
            <div
              className="absolute inset-x-0 bottom-0 top-1/2 pointer-events-none"
              style={{
                background: 'linear-gradient(to top, #2B1C48 0%, rgba(43,28,72,0.97) 8%, rgba(43,28,72,0.85) 18%, rgba(43,28,72,0.5) 35%, rgba(43,28,72,0.2) 55%, transparent 100%)',
              }}
            />
          </div>

          {/* Content - overlap to remove seam; SVG only in this section, bottom-right */}
          <div className="relative px-6 pt-4 pb-4 -mt-2 bg-[#2B1C48] flex-1 min-h-0 overflow-hidden">
            {/* Background SVG - bottom-right of content section only (does not go into footer) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/bg.svg"
              alt=""
              width={840}
              height={855}
              className="absolute bottom-0 right-0 z-0 pointer-events-none"
              style={{ opacity: 0.35 }}
            />
            {/* Content */}
            <div className="relative z-10">
            {/* Name & Title */}
            <div className="text-center mb-4">
              <h1 className="text-2xl font-bold text-white mb-1">
                {member.name}
              </h1>
              <p className="text-[#EE8900] font-medium mb-1 text-lg">
                {member.designation}
              </p>
              {member.company && (
                <p className="text-white/70 text-lg">{member.company}</p>
              )}
            </div>

            {/* Divider with logo */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 h-px bg-white" />
              <div className="relative w-6 h-6 shrink-0 flex items-center justify-center">
                <Image
                  src="/icon-white.svg"
                  alt=""
                  width={24}
                  height={24}
                  className="object-contain"
                />
              </div>
              <div className="flex-1 h-px bg-white" />
            </div>

            {/* WhatsApp, LinkedIn, Web (globe) and Location icons */}
            <div className="flex justify-center gap-6 mb-8">
              <a
                href={member.whatsapp ? `https://wa.me/${member.whatsapp.replace(/\D/g, "")}` : "https://wa.me/9714XXXXXXX"}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 rounded-full border-[3px] border-white flex items-center justify-center transition-opacity hover:opacity-90"
              >
                <WhatsAppIcon className="w-6 h-6 text-white" />
              </a>
              <a
                href={member.linkedin ?? "https://www.linkedin.com/company/legend-holding-group/"}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 rounded-full border-[3px] border-white flex items-center justify-center transition-opacity hover:opacity-90"
              >
                <LinkedInIcon className="w-6 h-6 text-white" />
              </a>
              <a
                href={member.website ? (member.website.startsWith("http") ? member.website : `https://${member.website}`) : "https://www.legendholding.com"}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 rounded-full border-[3px] border-white flex items-center justify-center transition-opacity hover:opacity-90"
              >
                <Globe className="w-6 h-6 text-white" />
              </a>
              <a
                href={getMapsLink(member)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 rounded-full border-[3px] border-white flex items-center justify-center transition-opacity hover:opacity-90"
              >
                <LocationIcon className="w-6 h-6 text-white" />
              </a>
            </div>

            {/* QR (share) + Save Contact */}
            <div className="flex justify-center items-center gap-3 pt-4">
              <Button
                type="button"
                onClick={() => setQrOpen(true)}
                className="h-12 w-12 rounded-2xl bg-white hover:bg-white/90 text-black shrink-0 p-0 flex items-center justify-center border-0"
                title="Show QR code to refer someone"
                aria-label="Show QR code"
              >
                <QrCode className="h-9 w-9" />
              </Button>
              <Button
                onClick={handleDownloadVCard}
                className="w-44 bg-[#EE8900] hover:bg-[#EE8900]/90 text-white font-semibold h-12 rounded-2xl"
              >
                <DownloadIcon className="w-4 h-4 mr-2" />
                Save Contact
              </Button>
            </div>

            {/* QR code dialog - for referring someone */}
            <Dialog open={qrOpen} onOpenChange={setQrOpen}>
              <DialogContent className="sm:max-w-sm bg-[#2B1C48] border-[#5D376E] text-white">
                <DialogHeader>
                  <DialogTitle className="text-white">Share this card</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-2">
                  {qrDataUrl ? (
                    <>
                      <img src={qrDataUrl} alt="QR code" className="w-64 h-64 rounded-lg bg-white p-2" />
                      <p className="text-white/70 text-sm text-center">
                        Someone can scan this to open {member.name}&apos;s card
                      </p>
                      <Button
                        type="button"
                        onClick={handleDownloadQr}
                        variant="secondary"
                        className="bg-white text-[#2B1C48] hover:bg-white/90"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download QR
                      </Button>
                    </>
                  ) : (
                    <div className="w-64 h-64 flex items-center justify-center rounded-lg bg-white/10 text-white/70">
                      Loading…
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>
          </div>

          <p className="relative z-10 text-center text-white/70 text-xs py-2 pb-3 flex-shrink-0">
            Powered by Legend Holding Group
          </p>
        </div>
      </div>
    </div>
  );
}
