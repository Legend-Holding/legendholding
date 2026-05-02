"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit2, Trash2, Plus, Eye, EyeOff, ArrowUp, ArrowDown, Star } from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  company: string;
  image: string;
  category: "board" | "ksa" | "china";
  sort_order: number;
  is_visible: boolean;
  is_spotlight: boolean;
  seo_description: string;
  linkedin: string;
}

const emptyForm = {
  name: "",
  role: "",
  company: "Legend Holding Group",
  image: "",
  category: "board" as "board" | "ksa" | "china",
  seo_description: "",
  is_spotlight: false,
  linkedin: "",
};

const categoryLabels: Record<string, string> = {
  board: "Board / Leadership (UAE)",
  ksa: "KSA Team",
  china: "China Team",
};

export default function TeamMembersPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const router = useRouter();

  const fetchMembers = async () => {
    try {
      const res = await fetch("/api/admin/team-members", { credentials: "include" });
      if (res.status === 401 || res.status === 403) {
        router.push("/admin/login");
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) setMembers(data);
      else setMembers([]);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleSignOut = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.refresh();
    router.push("/admin/login");
  };

  const requiredFieldsFilled = () =>
    [form.name, form.role, form.company, form.image].every(
      (v) => typeof v === "string" && v.trim() !== ""
    );

  const handleAdd = async () => {
    if (!requiredFieldsFilled()) {
      toast.error("Name, role, company, and image are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/team-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add");
      toast.success("Team member added");
      setIsAddOpen(false);
      setForm(emptyForm);
      fetchMembers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    if (!requiredFieldsFilled()) {
      toast.error("Name, role, company, and image are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/team-members/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      toast.success("Team member updated");
      setEditing(null);
      setForm(emptyForm);
      fetchMembers();
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
      const res = await fetch(`/api/admin/team-members/${deleteId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete");
      }
      toast.success("Team member deleted");
      setDeleteId(null);
      fetchMembers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = async (member: TeamMember) => {
    try {
      const res = await fetch(`/api/admin/team-members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_visible: !member.is_visible }),
      });
      if (!res.ok) throw new Error("Failed to toggle visibility");
      toast.success(member.is_visible ? "Member hidden" : "Member visible");
      fetchMembers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    }
  };

  const moveOrder = async (member: TeamMember, direction: "up" | "down") => {
    const sameCat = members
      .filter((m) => m.category === member.category)
      .sort((a, b) => a.sort_order - b.sort_order);
    const idx = sameCat.findIndex((m) => m.id === member.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sameCat.length) return;

    const other = sameCat[swapIdx];
    try {
      await Promise.all([
        fetch(`/api/admin/team-members/${member.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ sort_order: other.sort_order }),
        }),
        fetch(`/api/admin/team-members/${other.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ sort_order: member.sort_order }),
        }),
      ]);
      fetchMembers();
    } catch {
      toast.error("Failed to reorder");
    }
  };

  const openEdit = (m: TeamMember) => {
    setEditing(m);
    setForm({
      name: m.name,
      role: m.role,
      company: m.company,
      image: m.image,
      category: m.category,
      seo_description: m.seo_description ?? "",
      is_spotlight: m.is_spotlight ?? false,
      linkedin: m.linkedin ?? "",
    });
  };

  const filteredMembers =
    filterCategory === "all"
      ? members
      : members.filter((m) => m.category === filterCategory);

  return (
    <AdminDashboardLayout onSignOut={handleSignOut}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Team Members</h1>
          <Button
            onClick={() => {
              setForm(emptyForm);
              setIsAddOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        </div>
        <p className="text-muted-foreground text-sm mb-4">
          Manage leadership team members displayed on the &ldquo;The Team&rdquo; page.
        </p>

        <div className="flex items-center gap-3 mb-4">
          <Label className="text-sm">Filter:</Label>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="board">Board / Leadership (UAE)</SelectItem>
              <SelectItem value="ksa">KSA Team</SelectItem>
              <SelectItem value="china">China Team</SelectItem>
            </SelectContent>
          </Select>
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
                  <TableHead>Role</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Visible</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground py-8"
                    >
                      No team members found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((m) => (
                    <TableRow key={m.id} className={!m.is_visible ? "opacity-50" : ""}>
                      <TableCell>
                        <img
                          src={m.image}
                          alt=""
                          className="h-12 w-12 object-cover rounded"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <span className="flex items-center gap-1.5">
                          {m.name}
                          {m.is_spotlight && (
                            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                          )}
                        </span>
                      </TableCell>
                      <TableCell>{m.role}</TableCell>
                      <TableCell>{m.company}</TableCell>
                      <TableCell>
                        <span className="text-xs px-2 py-1 rounded-full bg-muted">
                          {categoryLabels[m.category] || m.category}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleVisibility(m)}
                          title={m.is_visible ? "Hide" : "Show"}
                        >
                          {m.is_visible ? (
                            <Eye className="h-4 w-4 text-green-600" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveOrder(m, "up")}
                          title="Move up"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveOrder(m, "down")}
                          title="Move down"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(m)}
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(m.id)}
                          title="Delete"
                        >
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
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Add a new member to the leadership team page.
            </DialogDescription>
          </DialogHeader>
          <MemberForm form={form} setForm={setForm} />
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
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>Update team member details.</DialogDescription>
          </DialogHeader>
          <MemberForm form={form} setForm={setForm} />
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
            <AlertDialogTitle>Delete team member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this person from the team page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              {saving ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminDashboardLayout>
  );
}

function MemberForm({
  form,
  setForm,
}: {
  form: typeof emptyForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
}) {
  return (
    <div className="grid gap-4 py-4">
      <div>
        <Label>
          Photo <span className="text-red-500">*</span>
        </Label>
        <CloudinaryImageUpload
          value={form.image}
          onChange={(url) => setForm((f) => ({ ...f, image: url }))}
          maxSize={2}
          placeholder="Upload image — max size 2 MB"
          allowPasteUrl={true}
        />
      </div>
      <div>
        <Label>
          Name <span className="text-red-500">*</span>
        </Label>
        <Input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Kai Zheng"
        />
      </div>
      <div>
        <Label>
          Role / Designation <span className="text-red-500">*</span>
        </Label>
        <Input
          value={form.role}
          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          placeholder="e.g. Founder & Chairman"
        />
      </div>
      <div>
        <Label>
          Company <span className="text-red-500">*</span>
        </Label>
        <Input
          value={form.company}
          onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
        />
      </div>
      <div>
        <Label>Category</Label>
        <Select
          value={form.category}
          onValueChange={(val) =>
            setForm((f) => ({ ...f, category: val as "board" | "ksa" | "china" }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[9999]">
            <SelectItem value="board">Board / Leadership (UAE)</SelectItem>
            <SelectItem value="ksa">KSA Team</SelectItem>
            <SelectItem value="china">China Team</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border-t pt-4 mt-2">
        <h4 className="text-sm font-semibold text-muted-foreground mb-3">SEO Settings</h4>

        <div className="space-y-4">
          <div>
            <Label>LinkedIn URL</Label>
            <Input
              value={form.linkedin}
              onChange={(e) => setForm((f) => ({ ...f, linkedin: e.target.value }))}
              placeholder="https://www.linkedin.com/in/..."
            />
          </div>

          <div>
            <Label>SEO Description</Label>
            <Textarea
              value={form.seo_description}
              onChange={(e) => setForm((f) => ({ ...f, seo_description: e.target.value }))}
              placeholder="A short biography for search engines (Google). E.g. 'Kai Zheng, Founder and Chairman of Legend Holding Group, is an expert entrepreneur...'"
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Appears in hidden SEO text and structured data. Leave blank to use a default description.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="is_spotlight"
              checked={form.is_spotlight}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, is_spotlight: checked === true }))
              }
            />
            <Label htmlFor="is_spotlight" className="cursor-pointer">
              Spotlight on Google (featured Person schema)
            </Label>
            <p className="text-xs text-muted-foreground ml-1">
              Adds a dedicated JSON-LD Person entry for stronger Google visibility.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
