"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminDashboardLayout } from "@/components/admin/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Edit2, Trash2, Plus, ExternalLink, QrCode, Download } from "lucide-react";

interface ManagementProfile {
  id: string;
  slug: string;
  name: string;
  designation: string;
  company: string;
  photo: string;
  email: string;
  whatsapp: string;
  linkedin: string;
  website: string;
  location?: string;
  sort_order: number;
}

const emptyForm = {
  name: "",
  designation: "",
  company: "Legend Holding Group",
  photo: "",
  email: "",
  whatsapp: "",
  linkedin: "",
  website: "",
};

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
  const router = useRouter();
  const supabase = createClientComponentClient();

  const fetchProfiles = async (opts?: { page?: number; query?: string }) => {
    const nextPage = opts?.page ?? page;
    const nextQuery = opts?.query ?? appliedSearch;
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: String(pageSize),
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
    fetchProfiles({ page, query: appliedSearch });
  }, [page, appliedSearch]);

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
    await supabase.auth.signOut();
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
        body: JSON.stringify(form),
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
        body: JSON.stringify(form),
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
      name: p.name,
      designation: p.designation,
      company: p.company,
      photo: p.photo,
      email: p.email ?? "",
      whatsapp: p.whatsapp ?? "",
      linkedin: p.linkedin ?? "",
      website: p.website ?? "",
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AdminDashboardLayout onSignOut={handleSignOut}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Digital Business Cards</h1>
          <Button onClick={() => { setForm(emptyForm); setIsAddOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add person
          </Button>
        </div>
        <p className="text-muted-foreground text-sm mb-4">
          Manage profiles for QR-code business cards. Profile pages: /profile/[slug]
        </p>
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
            Showing {profiles.length} of {total} profiles
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
                      No profiles yet. Add one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  profiles.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <img src={p.photo} alt="" className="h-12 w-12 object-cover rounded" />
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
          <ProfileForm form={form} setForm={setForm} />
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
          <ProfileForm form={form} setForm={setForm} />
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
}: {
  form: typeof emptyForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
}) {
  return (
    <div className="grid gap-4 py-4">
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
        <Label>Company <span className="text-red-500">*</span></Label>
        <Input
          value={form.company}
          onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
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
        <Label>Website URL <span className="text-red-500">*</span></Label>
        <Input
          value={form.website}
          onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
          placeholder="https://..."
        />
      </div>
    </div>
  );
}
