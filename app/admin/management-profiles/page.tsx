"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminDashboardLayout } from "@/components/admin/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CloudinaryImageUpload } from "@/components/admin/CloudinaryImageUpload";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Edit2, Trash2, Plus, ExternalLink, QrCode, Download, Building2 } from "lucide-react";

interface ManagementProfile {
  id: string;
  slug: string;
  name: string;
  designation: string;
  company: string;
  photo: string;
  email: string;
  telephone?: string;
  whatsapp: string;
  linkedin: string;
  website: string;
  location?: string;
  location_link?: string;
  legacy_slug?: string | null;
  sort_order: number;
}

type ProfileVersionTab = "new" | "old";
const FALLBACK_PHOTO = "/placeholder.svg";

interface CompanyOption {
  name: string;
  telephone: string;
  website: string;
  address: string;
  locationLink: string;
}

const emptyForm = {
  slug: "",
  name: "",
  designation: "",
  company: "Legend Holding Group",
  photo: "",
  email: "",
  telephone: "",
  whatsapp: "",
  linkedin: "",
  website: "",
  address: "",
  locationLink: "",
};

const COMPANY_OPTIONS = [
  "Dealership - 212",
  "LEGEND Holding Group",
  "LEGEND Multi Motors",
  "Legend Motors - Trading",
  "LEGEND World Travel & Tourism",
  "LEGEND World Automobile Services",
  "LMM-D-Service",
  "Dealership - Kaiyi",
  "ZUL Energy",
  "LEGEND World Rent a Car",
  "LEGEND World Investments",
  "Legend Motors",
  "Legend Motors FZCO",
  "Dealership - Skywell",
  "Legend World Travel and Tourism",
  "Legend Multi Motors - Lifan Motorbyke",
];

const COMPANY_FIELD_DEFAULTS: Record<
  string,
  { telephone: string; website: string; address: string; locationLink: string }
> = {
  "LEGEND Holding Group": {
    telephone: "+971 4 234 0738",
    website: "https://www.legendholding.com",
    address: "Plot No- S30502 - opposite Redington, Gate5 - JAFZA - Dubai - UAE",
    locationLink:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3927.7844377633974!2d55.117593199999995!3d24.967728099999995!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f134e58a88347%3A0x9ee7ae329a203863!2sLegend%20Holding%20Group%20-%20Global%20HQ%20Space!5e1!3m2!1sen!2sae!4v1745214584825!5m2!1sen!2sae",
  },
  "Legend Holding Group": {
    telephone: "+971 4 234 0738",
    website: "https://www.legendholding.com",
    address: "Plot No- S30502 - opposite Redington, Gate5 - JAFZA - Dubai - UAE",
    locationLink:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3927.7844377633974!2d55.117593199999995!3d24.967728099999995!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f134e58a88347%3A0x9ee7ae329a203863!2sLegend%20Holding%20Group%20-%20Global%20HQ%20Space!5e1!3m2!1sen!2sae!4v1745214584825!5m2!1sen!2sae",
  },
  "Dealership - 212": {
    telephone: "+971 4 386 1700",
    website: "https://212uae.com/",
    address: "Dealership - 212, Plot 128-246, Al Khabeesi Building, Dubai - UAE",
    locationLink:
      "https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d3608.230334145366!2d55.33505100000001!3d25.262836000000004!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMjXCsDE1JzQ2LjIiTiA1NcKwMjAnMDYuMiJF!5e0!3m2!1sar!2sae!4v1728038365894!5m2!1sar!2sae",
  },
  "LEGEND Multi Motors": {
    telephone: "+971 4 221 9958",
    website: "https://legendmotorsuae.com/",
    address: "Showroom # S02, Al Khoory, Sky Garden,Port Saeed Deira, Dubai-UAE",
    locationLink:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3608.3992864126753!2d55.335217199999995!3d25.257150300000003!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f5d07cce90e77%3A0x7efb9efd52256b5d!2sSkywell%20Electric%20Vehicles%20-%20Legend%20Motors!5e0!3m2!1sar!2sae!4v1716876906372!5m2!1sar!2sae",
  },
  "Legend Motors - Trading": {
    telephone: "+971 4 258 0046",
    website: "https://legendmotorsuae.com/",
    address: "Showroom No -46, New Automarket, Al Aweer ,Ras Al Khor , Dubai-UAE",
    locationLink:
      "https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d14443.99698501397!2d55.3681825!3d25.1695033!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f67b797eb5a31%3A0xc0f1a9fbb4f88db5!2sLegend%20Motors%2046%2C%20Dubai%201!5e0!3m2!1sen!2sae!4v1710409320109!5m2!1sen!2sae",
  },
  "LEGEND World Travel & Tourism": {
    telephone: "+971 4 548 9489",
    website: "https://www.legendtravels.com",
    address: "Room 1904 Block D, Aspect Tower Business Bay, Dubai UAE",
    locationLink:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d125459.05103709637!2d55.183954688402046!3d25.192010332149927!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f615ac4a1c607%3A0xade3d2df27e4d9ab!2sLegend%20World%20Travel%20%26%20Tourism!5e1!3m2!1sen!2sae!4v1745485165402!5m2!1sen!2sae",
  },
  "LEGEND World Automobile Services": {
    telephone: "+971 4 234 0738",
    website: "https://www.legendautoservices.com/",
    address: "Yard No:59, 22nd Street,Industrial Area -2 , Al Quoz,Dubai-UAE",
    locationLink:
      "https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d14448.772422712113!2d55.2264637!3d25.1291615!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f696fe56cf769%3A0xf798a999ce6259d2!2sLegend%20Auto%20Services!5e0!3m2!1sen!2sae!4v1774443229325!5m2!1sen!2sae",
  },
  "LMM-D-Service": {
    telephone: "+971 4 265 8047",
    website: "https://legendmotorsuae.com/",
    address: "PLOT S1-2 RAS AL KHOR IND 2 DUBAI. Plot S1-2",
    locationLink:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3921.2836209610464!2d55.348091800000006!3d25.1706187!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f670068ad1c43%3A0x9b216b2ac4eb584!2sLegend%20Multi%20Motors%20-%20Service%20center!5e1!3m2!1sen!2sae!4v1746268030518!5m2!1sen!2sae",
  },
  "Dealership - Kaiyi": {
    telephone: "+971 800 52494",
    website: "https://www.kaiyi.ae/",
    address:
      "Kaiyi Showroom, Plot 128-246 Al Khabaisi Building, Al Ittihad Road, Deira Dubai, United Arab Emirates",
    locationLink:
      "https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d3608.230334145366!2d55.33505100000001!3d25.262836000000004!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMjXCsDE1JzQ2LjIiTiA1NcKwMjAnMDYuMiJF!5e0!3m2!1sar!2sae!4v1728038365894!5m2!1sar!2sae",
  },
  "ZUL Energy": {
    telephone: "+971 4 272 7603",
    website: "https://www.zulenergy.com",
    address: "1903 - 19th Floor,  JBC4, Cluster N, JLT,  Dubai – UAE",
    locationLink:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3614.1575466931536!2d55.13583907570722!3d25.062648777797758!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f69587889e31d%3A0xe99198d629887eb4!2sZul%20Energy!5e0!3m2!1sen!2sae!4v1730707953773!5m2!1sen!2sae",
  },
  "LEGEND World Rent a Car": {
    telephone: "+971 4 250 7867",
    website: "https://www.legendrentacar.com/",
    address: "Yard No:59, 22nd Street,Industrial Area -2 , Al Quoz,Dubai-UAE",
    locationLink:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3612.19155022003!2d55.24574!3d25.129214100000002!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f69c714664d71%3A0xcc04169981c4f1b2!2sLegend%20World%20Rent%20a%20Car!5e0!3m2!1sen!2sae!4v1710409659926!5m2!1sen!2sae",
  },
  "LEGEND World Investments": {
    telephone: "+971 4 250 7867",
    website: "https://www.legendrentacar.com",
    address: "Yard No:59, 22nd Street,Industrial Area -2 , Al Quoz,Dubai-UAE",
    locationLink:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3612.19155022003!2d55.24574!3d25.129214100000002!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f69c714664d71%3A0xcc04169981c4f1b2!2sLegend%20World%20Rent%20a%20Car!5e0!3m2!1sen!2sae!4v1710409659926!5m2!1sen!2sae",
  },
  "Legend Motors": {
    telephone: "+971 4 258 0046",
    website: "https://www.legendmotorsuae.com",
    address: "Showroom No -46, New Automarket, Al Aweer ,Ras Al Khor , Dubai-UAE",
    locationLink:
      "https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d14443.99698501397!2d55.3681825!3d25.1695033!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f67b797eb5a31%3A0xc0f1a9fbb4f88db5!2sLegend%20Motors%2046%2C%20Dubai%201!5e0!3m2!1sen!2sae!4v1710409320109!5m2!1sen!2sae",
  },
  "Legend Motors FZCO": {
    telephone: "+971 4 548 8872",
    website: "https://legendmotorsuae.com/",
    address: "Showroom No-26, DUCAMZ, Ras Al Khor, Al Awir, Dubai-UAE",
    locationLink:
      "https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d14443.608864137535!2d55.3766311!3d25.1727794!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f678650c58d69%3A0xaa6cd74d7688f092!2sLegend%20Motors%2026%2C%20Dubai%204!5e0!3m2!1sen!2sae!4v1710409536184!5m2!1sen!2sae",
  },
  "Dealership - Skywell": {
    telephone: "+971 800 759 9355",
    website: "https://legendmotorsuae.com/",
    address: "Showroom # S02, Al Khoory Sky Garden, Port Saeed, Deira, Dubai, UAE",
    locationLink:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3608.3992864126753!2d55.335217199999995!3d25.257150300000003!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f5d07cce90e77%3A0x7efb9efd52256b5d!2sSkywell%20Electric%20Vehicles%20-%20Legend%20Motors!5e0!3m2!1sar!2sae!4v1716876906372!5m2!1sar!2sae",
  },
  "Legend World Travel and Tourism": {
    telephone: "+971 4 548 9489",
    website: "https://www.legendtravels.com",
    address: "Room 1904 Block D, Aspect Tower Business Bay, Dubai UAE",
    locationLink:
      "https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d14439.38262656364!2d55.276428!3d25.208427!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f437dde012255%3A0x40969e56c2aad502!2sEmirates%20Financial%20Towers!5e0!3m2!1sen!2sae!4v1710409761077!5m2!1sen!2sae",
  },
  "Legend Multi Motors - Lifan Motorbyke": {
    telephone: "+971 4 548 4087",
    website: "https://legendlifan.com/",
    address: "Yard No:59, 22nd Street,Industrial Area -2 , Al Quoz,Dubai-UAE",
    locationLink:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3612.19155022003!2d55.24574!3d25.129214100000002!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f69c714664d71%3A0xcc04169981c4f1b2!2sLegend%20World%20Rent%20a%20Car!5e0!3m2!1sen!2sae!4v1710409659926!5m2!1sen!2sae",
  },
};

function toEmbedMapsLink(value: string): string {
  const raw = (value || "").trim();
  if (!raw) return "";

  // Already an embed link
  if (raw.includes("google.com/maps/embed")) return raw;

  // Try to convert supported Google Maps links to embed format
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    const isGoogleMaps = host.includes("google.") && (url.pathname.includes("/maps") || host.includes("maps."));
    if (!isGoogleMaps) return raw;

    const pb = url.searchParams.get("pb");
    if (pb) return `https://www.google.com/maps/embed?pb=${pb}`;

    // If there is no `pb` payload, keep the original link as-is.
    // (Embed v1 endpoints require an API key.)
  } catch {
    return raw;
  }

  return raw;
}

export default function ManagementProfilesPage() {
  const [profiles, setProfiles] = useState<ManagementProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<ManagementProfile | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [qrProfile, setQrProfile] = useState<ManagementProfile | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileVersionTab>("new");
  const [companyOptionsList, setCompanyOptionsList] = useState<CompanyOption[]>([]);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/admin/companies?active=1`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data?.items)) {
          setCompanyOptionsList(
            data.items.map((c: { name: string; telephone?: string; website?: string; address?: string; location_link?: string }) => ({
              name: c.name,
              telephone: c.telephone ?? "",
              website: c.website ?? "",
              address: c.address ?? "",
              locationLink: c.location_link ?? "",
            })),
          );
        }
      } catch {
        // Silently fall back to the hardcoded defaults already defined in this file.
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchProfiles = async (opts?: { page?: number; query?: string; version?: ProfileVersionTab }) => {
    const nextPage = opts?.page ?? page;
    const nextQuery = opts?.query ?? appliedSearch;
    const nextVersion = opts?.version ?? activeTab;
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: String(pageSize),
        version: nextVersion,
      });
      if (nextQuery.trim()) params.set("q", nextQuery.trim());
      const res = await fetch(`/api/admin/management-profiles?${params.toString()}`, { credentials: "include" });
      if (res.status === 401 || res.status === 403) {
        router.push("/admin/login");
        return;
      }
      const data = await res.json();
      if (Array.isArray(data?.items)) {
        setProfiles(data.items);
        setTotal(Number(data.total) || 0);
        setPage(Number(data.page) || nextPage);
      } else {
        setProfiles([]);
        setTotal(0);
      }
    } catch {
      setProfiles([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles({ page, query: appliedSearch, version: activeTab });
  }, [page, appliedSearch, activeTab]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const normalized = search.trim();
      if (normalized !== appliedSearch) {
        setPage(1);
        setAppliedSearch(normalized);
      }
    }, 300);
    return () => window.clearTimeout(handle);
  }, [search, appliedSearch]);

  // Generate QR code with logo when dialog opens (use public site URL so scan opens live profile)
  useEffect(() => {
    if (!qrProfile || typeof window === "undefined") {
      setQrDataUrl(null);
      return;
    }
    const baseUrl = (
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      "https://www.legendholding.com"
    );
    const profileUrl = `${baseUrl}/profile/${qrProfile.slug}`;
    let cancelled = false;
    import("@/lib/qr-with-logo").then(({ generateQRWithLogo }) => {
      generateQRWithLogo(profileUrl, { width: 320, margin: 2 }).then((url: string) => {
        if (!cancelled) setQrDataUrl(url);
      }).catch(() => {
        if (!cancelled) {
          setQrDataUrl(null);
          toast.error("Failed to generate QR code");
        }
      });
    }).catch(() => {
      if (!cancelled) toast.error("QR code library failed to load");
    });
    return () => { cancelled = true; };
  }, [qrProfile]);

  const handleSignOut = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.refresh();
    router.push("/admin/login");
  };

  const allFieldsFilled = () =>
    [form.name, form.designation, form.company, form.photo, form.email, form.whatsapp, form.linkedin, form.website]
      .every((v) => typeof v === "string" && v.trim() !== "");

  const handleAdd = async () => {
    if (!allFieldsFilled()) {
      toast.error("All fields are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/management-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          location: form.address,
          location_link: toEmbedMapsLink(form.locationLink),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add");
      toast.success("Profile added");
      setIsAddOpen(false);
      setForm(emptyForm);
      fetchProfiles({ page, query: appliedSearch });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    if (!allFieldsFilled()) {
      toast.error("All fields are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/management-profiles/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          location: form.address,
          location_link: toEmbedMapsLink(form.locationLink),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      toast.success("Profile updated");
      setEditing(null);
      setForm(emptyForm);
      fetchProfiles({ page, query: appliedSearch });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/management-profiles/${deleteId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete");
      }
      toast.success("Profile deleted");
      setDeleteId(null);
      fetchProfiles({ page, query: appliedSearch });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl || !qrProfile) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `qr-${qrProfile.slug}.png`;
    link.click();
    toast.success("QR code downloaded");
  };

  const openEdit = (p: ManagementProfile) => {
    setEditing(p);
    setForm({
      slug: p.slug,
      name: p.name,
      designation: p.designation,
      company: p.company,
      photo: p.photo,
      email: p.email ?? "",
      telephone: p.telephone ?? "",
      whatsapp: p.whatsapp ?? "",
      linkedin: p.linkedin ?? "",
      website: p.website ?? "",
      address: p.location ?? "",
      locationLink: p.location_link ?? "",
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AdminDashboardLayout onSignOut={handleSignOut}>
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold">Digital Business Cards</h1>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Button variant="outline" asChild>
              <Link href="/admin/companies">
                <Building2 className="h-4 w-4 mr-2" />
                Management
              </Link>
            </Button>
            {activeTab === "new" ? (
              <Button onClick={() => { setForm(emptyForm); setIsAddOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add person
              </Button>
            ) : null}
          </div>
        </div>
        <p className="text-muted-foreground text-sm mb-4">
          Manage profiles for QR-code business cards. Profile pages: /profile/[slug]
        </p>
        <div className="mb-4 flex items-center gap-2">
          <Button
            variant={activeTab === "new" ? "default" : "outline"}
            onClick={() => {
              setActiveTab("new");
              setPage(1);
            }}
          >
            New Version
          </Button>
          <Button
            variant={activeTab === "old" ? "default" : "outline"}
            onClick={() => {
              setActiveTab("old");
              setPage(1);
            }}
          >
            Old Version
          </Button>
        </div>
        <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center md:justify-between">
          <div className="flex w-full max-w-xl gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, slug, legacy slug, email, company..."
            />
            <Button
              variant="ghost"
              onClick={() => {
                setSearch("");
                setAppliedSearch("");
                setPage(1);
              }}
            >
              Clear
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Showing {profiles.length} of {total} {activeTab === "new" ? "new" : "old"} profiles
          </p>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Photo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No {activeTab === "new" ? "new" : "old"} profiles found.
                    </TableCell>
                  </TableRow>
                ) : (
                  profiles.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <img
                          src={p.photo || FALLBACK_PHOTO}
                          alt={p.name}
                          className="h-12 w-12 object-cover rounded"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (target.src.endsWith(FALLBACK_PHOTO)) return;
                            target.src = FALLBACK_PHOTO;
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.designation}</TableCell>
                      <TableCell>
                        <Link
                          href={`/profile/${p.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          /profile/{p.slug}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setQrProfile(p)} title="Generate QR code">
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)} title="Edit">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(p.id)} title="Delete">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
        {!loading && total > 0 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add person</DialogTitle>
            <DialogDescription>New profile for digital business card.</DialogDescription>
          </DialogHeader>
          <ProfileForm form={form} setForm={setForm} companies={companyOptionsList} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving}>{saving ? "Saving..." : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit person</DialogTitle>
            <DialogDescription>Update profile.</DialogDescription>
          </DialogHeader>
          <ProfileForm form={form} setForm={setForm} companies={companyOptionsList} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR code dialog */}
      <Dialog open={!!qrProfile} onOpenChange={(open) => !open && setQrProfile(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code</DialogTitle>
            <DialogDescription>
              {qrProfile && (
                <>Scan to open {qrProfile.name}&apos;s digital business card: /profile/{qrProfile.slug}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {qrDataUrl ? (
              <>
                <img src={qrDataUrl} alt="QR Code" className="w-64 h-64 border rounded-lg bg-white p-2" />
                <Button onClick={handleDownloadQr} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download as PNG
                </Button>
              </>
            ) : (
              <div className="w-64 h-64 flex items-center justify-center border rounded-lg bg-muted/50 text-muted-foreground">
                Generating…
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete profile?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the person from digital business cards. The profile page will no longer work.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {saving ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminDashboardLayout>
  );
}

function ProfileForm({
  form,
  setForm,
  companies,
}: {
  form: typeof emptyForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  companies: CompanyOption[];
}) {
  // Prefer companies coming from the Management page; fall back to the hardcoded
  // list so the dropdown still works if the migration hasn't been run yet.
  const dynamicNames = companies.map((c) => c.name);
  const baseNames = dynamicNames.length > 0 ? dynamicNames : COMPANY_OPTIONS;
  const companyOptions = baseNames.includes(form.company)
    ? baseNames
    : [form.company, ...baseNames].filter(Boolean);

  // Build a defaults map from the dynamic list, falling back to the hardcoded one.
  const dynamicDefaults: Record<string, { telephone: string; website: string; address: string; locationLink: string }> = {};
  for (const c of companies) {
    dynamicDefaults[c.name] = {
      telephone: c.telephone,
      website: c.website,
      address: c.address,
      locationLink: c.locationLink,
    };
  }

  const getDefaultsForCompany = (value: string) => {
    return (
      dynamicDefaults[value] ??
      COMPANY_FIELD_DEFAULTS[value] ??
      { telephone: "", website: "", address: "", locationLink: "" }
    );
  };

  return (
    <div className="grid gap-4 py-4">
      <div>
        <Label>Slug</Label>
        <Input
          value={form.slug}
          onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
          placeholder="e.g. kai-zheng"
        />
      </div>
      <div>
        <Label>Photo <span className="text-red-500">*</span></Label>
        <CloudinaryImageUpload
          value={form.photo}
          onChange={(url) => setForm((f) => ({ ...f, photo: url }))}
          maxSize={2}
          placeholder="Upload image — max size 2 MB"
          allowPasteUrl={false}
        />
      </div>
      <div>
        <Label>Name <span className="text-red-500">*</span></Label>
        <Input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Kai Zheng"
        />
      </div>
      <div>
        <Label>Designation <span className="text-red-500">*</span></Label>
        <Input
          value={form.designation}
          onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
          placeholder="e.g. Founder & Chairman"
        />
      </div>
      <div>
        <Label>Email <span className="text-red-500">*</span></Label>
        <Input
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="Used in Save Contact vCard"
        />
      </div>
      <div>
        <Label>WhatsApp (with country code) <span className="text-red-500">*</span></Label>
        <Input
          value={form.whatsapp}
          onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
          placeholder="e.g. 971501234567"
        />
      </div>
      <div>
        <Label>LinkedIn URL <span className="text-red-500">*</span></Label>
        <Input
          value={form.linkedin}
          onChange={(e) => setForm((f) => ({ ...f, linkedin: e.target.value }))}
          placeholder="https://www.linkedin.com/in/..."
        />
      </div>
      <div>
        <Label>Company <span className="text-red-500">*</span></Label>
        <Select
          value={form.company}
          onValueChange={(value) =>
            setForm((f) => {
              const defaults = getDefaultsForCompany(value);
              return {
                ...f,
                company: value,
                telephone: defaults.telephone,
                website: defaults.website,
                address: defaults.address,
                locationLink: defaults.locationLink,
              };
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select company" />
          </SelectTrigger>
          <SelectContent className="z-[100]">
            {companyOptions.map((company) => (
              <SelectItem key={company} value={company}>
                {company}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Telephone</Label>
        <Input
          value={form.telephone}
          onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))}
          placeholder="e.g. +971 4 123 4567"
        />
      </div>
      <div>
        <Label>Website URL <span className="text-red-500">*</span></Label>
        <Input
          value={form.website}
          onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
          placeholder="https://..."
        />
      </div>
      <div>
        <Label>Address</Label>
        <Input
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          placeholder="e.g. Business Bay, Dubai, UAE"
        />
      </div>
      <div>
        <Label>Location Link</Label>
        <Input
          value={form.locationLink}
          onChange={(e) => setForm((f) => ({ ...f, locationLink: e.target.value }))}
          placeholder="https://maps.google.com/..."
        />
      </div>
    </div>
  );
}
