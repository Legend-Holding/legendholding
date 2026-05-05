"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Edit2, Trash2, Plus, ExternalLink, Building2, ArrowLeft } from "lucide-react";

interface Company {
  id: string;
  name: string;
  logo: string;
  telephone: string;
  website: string;
  address: string;
  location_link: string;
  is_active: boolean;
  sort_order: number;
}

const FALLBACK_LOGO = "/placeholder-logo.png";

const emptyForm = {
  name: "",
  logo: "",
  telephone: "",
  website: "",
  address: "",
  location_link: "",
  is_active: true,
};

type CompanyForm = typeof emptyForm;

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<CompanyForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const fetchCompanies = async (query?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (query?.trim()) params.set("q", query.trim());
      const res = await fetch(`/api/admin/companies?${params.toString()}`, { credentials: "include" });
      if (res.status === 401 || res.status === 403) {
        router.push("/admin/login");
        return;
      }
      const data = await res.json();
      if (Array.isArray(data?.items)) {
        setCompanies(data.items);
      } else {
        setCompanies([]);
      }
    } catch {
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies(appliedSearch);
  }, [appliedSearch]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const normalized = search.trim();
      if (normalized !== appliedSearch) {
        setAppliedSearch(normalized);
      }
    }, 300);
    return () => window.clearTimeout(handle);
  }, [search, appliedSearch]);

  const handleSignOut = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.refresh();
    router.push("/admin/login");
  };

  const handleAdd = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add");
      toast.success("Company added");
      setIsAddOpen(false);
      setForm(emptyForm);
      fetchCompanies(appliedSearch);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/companies/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      toast.success("Company updated");
      setEditing(null);
      setForm(emptyForm);
      fetchCompanies(appliedSearch);
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
      const res = await fetch(`/api/admin/companies/${deleteId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete");
      }
      toast.success("Company deleted");
      setDeleteId(null);
      fetchCompanies(appliedSearch);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (c: Company) => {
    setEditing(c);
    setForm({
      name: c.name,
      logo: c.logo ?? "",
      telephone: c.telephone ?? "",
      website: c.website ?? "",
      address: c.address ?? "",
      location_link: c.location_link ?? "",
      is_active: c.is_active,
    });
  };

  return (
    <AdminDashboardLayout onSignOut={handleSignOut}>
      <div className="p-6">
        <div className="mb-4">
          <Button variant="ghost" size="sm" className="-ml-2 h-8 px-2 text-muted-foreground hover:text-foreground" asChild>
            <Link href="/admin/management-profiles">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Digital Business Cards
            </Link>
          </Button>
        </div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Management
          </h1>
          <Button
            onClick={() => {
              setForm(emptyForm);
              setIsAddOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add company
          </Button>
        </div>
        <p className="text-muted-foreground text-sm mb-4">
          Manage company name, logo and the default Telephone, Website, Address and
          Location Link that auto-fill in the Digital Business Cards form.
        </p>

        <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center md:justify-between">
          <div className="flex w-full max-w-xl gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, website, address, telephone..."
            />
            <Button
              variant="ghost"
              onClick={() => {
                setSearch("");
                setAppliedSearch("");
              }}
            >
              Clear
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {companies.length} compan{companies.length === 1 ? "y" : "ies"}
          </p>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Logo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Telephone</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="text-right w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No companies found.
                    </TableCell>
                  </TableRow>
                ) : (
                  companies.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <img
                          src={c.logo || FALLBACK_LOGO}
                          alt={c.name}
                          className="h-12 w-12 object-contain rounded bg-muted/30 p-1"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (target.src.endsWith(FALLBACK_LOGO)) return;
                            target.src = FALLBACK_LOGO;
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>{c.name}</div>
                        {c.address ? (
                          <div className="text-xs text-muted-foreground line-clamp-1">{c.address}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm">{c.telephone || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {c.website ? (
                          <a
                            href={c.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            {c.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {c.is_active ? (
                          <span className="inline-flex items-center rounded-full bg-green-500/10 text-green-700 dark:text-green-400 px-2 py-0.5 text-xs font-medium">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-xs font-medium">
                            Hidden
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)} title="Edit">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)} title="Delete">
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
      </div>

      {/* Add dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add company</DialogTitle>
            <DialogDescription>
              These defaults auto-fill in the Digital Business Cards form.
            </DialogDescription>
          </DialogHeader>
          <CompanyFormFields form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving ? "Saving..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit company</DialogTitle>
            <DialogDescription>Update the company details and defaults.</DialogDescription>
          </DialogHeader>
          <CompanyFormFields form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete company?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the company from the dropdown. Existing business card profiles
              that reference this company name will not be changed, but new entries will no
              longer be able to select it.
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

function CompanyFormFields({
  form,
  setForm,
}: {
  form: CompanyForm;
  setForm: React.Dispatch<React.SetStateAction<CompanyForm>>;
}) {
  return (
    <div className="grid gap-4 py-4">
      <div>
        <Label>
          Company name <span className="text-red-500">*</span>
        </Label>
        <Input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. LEGEND Holding Group"
        />
      </div>

      <div>
        <Label>Logo</Label>
        <CloudinaryImageUpload
          value={form.logo}
          onChange={(url) => setForm((f) => ({ ...f, logo: url }))}
          maxSize={2}
          placeholder="Upload company logo — max size 2 MB"
          allowPasteUrl
        />
      </div>

      <div>
        <Label>Telephone</Label>
        <Input
          value={form.telephone}
          onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))}
          placeholder="e.g. +971 4 234 0738"
        />
      </div>

      <div>
        <Label>Website</Label>
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
          placeholder="Office address"
        />
      </div>

      <div>
        <Label>Location link (Google Maps)</Label>
        <Input
          value={form.location_link}
          onChange={(e) => setForm((f) => ({ ...f, location_link: e.target.value }))}
          placeholder="https://maps.google.com/... or full embed iframe link"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Either a regular Google Maps URL or the embed link works — it will be normalised
          when saved on a profile.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <Label className="mb-1 block">Active</Label>
          <p className="text-xs text-muted-foreground">
            Inactive companies are hidden from the Digital Business Cards dropdown.
          </p>
        </div>
        <Switch
          checked={form.is_active}
          onCheckedChange={(checked) => setForm((f) => ({ ...f, is_active: checked }))}
        />
      </div>
    </div>
  );
}
