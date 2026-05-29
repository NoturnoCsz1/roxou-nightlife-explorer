import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Shield, MapPin } from "lucide-react";

interface EditorRow {
  id: string;
  user_id: string;
  role: string;
  allowed_city: string | null;
  created_at: string;
  email?: string;
}

const CITIES = ["Presidente Prudente", "Assis"];

const Editores = () => {
  const { isCityEditor } = useAdminProfile();
  const [editors, setEditors] = useState<EditorRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState("city_editor");
  const [formCity, setFormCity] = useState(CITIES[0]);
  const [saving, setSaving] = useState(false);

  // City editors cannot manage other editors
  if (isCityEditor) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Acesso restrito a administradores.</p>
      </div>
    );
  }

  async function loadEditors() {
    setLoading(true);
    const { data, error } = await supabase
      .from("admin_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar editores");
      setLoading(false);
      return;
    }

    setEditors(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadEditors();
  }, []);

  function openNew() {
    setEditingId(null);
    setFormEmail("");
    setFormRole("city_editor");
    setFormCity(CITIES[0]);
    setShowForm(true);
  }

  function openEdit(editor: EditorRow) {
    setEditingId(editor.id);
    setFormEmail(editor.user_id);
    setFormRole(editor.role);
    setFormCity(editor.allowed_city || CITIES[0]);
    setShowForm(true);
  }

  async function handleSave() {
    if (!editingId && !formEmail.trim()) {
      toast.error("Informe o User ID do usuário");
      return;
    }

    setSaving(true);

    if (editingId) {
      const { error } = await supabase
        .from("admin_profiles")
        .update({
          role: formRole,
          allowed_city: formRole === "city_editor" ? formCity : null,
        })
        .eq("id", editingId);

      if (error) {
        toast.error("Erro ao atualizar: " + error.message);
      } else {
        toast.success("Editor atualizado!");
        setShowForm(false);
        loadEditors();
      }
    } else {
      const { error } = await supabase.from("admin_profiles").insert({
        user_id: formEmail.trim(),
        role: formRole,
        allowed_city: formRole === "city_editor" ? formCity : null,
      });

      if (error) {
        toast.error("Erro ao criar: " + error.message);
      } else {
        toast.success("Editor criado!");
        setShowForm(false);
        loadEditors();
      }
    }

    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este editor?")) return;

    const { error } = await supabase.from("admin_profiles").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover: " + error.message);
    } else {
      toast.success("Editor removido");
      loadEditors();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Editores de Cidade</h1>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition"
        >
          <Plus className="h-3.5 w-3.5" />
          Novo editor
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold">
            {editingId ? "Editar editor" : "Novo editor"}
          </h2>

          {!editingId && (
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">
                User ID (UUID do usuário)
              </label>
              <input
                type="text"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="ex: a1b2c3d4-..."
                className="w-full mt-1 rounded-lg border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 transition"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                O usuário já deve ter uma conta criada no sistema.
              </p>
            </div>
          )}

          <div>
            <label className="text-[11px] font-medium text-muted-foreground">Papel</label>
            <select
              value={formRole}
              onChange={(e) => setFormRole(e.target.value)}
              className="w-full mt-1 rounded-lg border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 transition"
            >
              <option value="admin">Admin (acesso total)</option>
              <option value="city_editor">Editor de cidade</option>
            </select>
          </div>

          {formRole === "city_editor" && (
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Cidade</label>
              <select
                value={formCity}
                onChange={(e) => setFormCity(e.target.value)}
                className="w-full mt-1 rounded-lg border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 transition"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
      ) : editors.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Nenhum editor cadastrado. Clique em "Novo editor" para criar.
        </p>
      ) : (
        <div className="space-y-2">
          {editors.map((editor) => (
            <div
              key={editor.id}
              className="flex items-center justify-between rounded-xl border border-border/40 bg-card p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-mono text-muted-foreground truncate">
                  {editor.user_id}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      editor.role === "admin"
                        ? "bg-primary/10 text-primary"
                        : "bg-accent text-accent-foreground"
                    }`}
                  >
                    <Shield className="h-3 w-3" />
                    {editor.role === "admin" ? "Admin" : "Editor"}
                  </span>
                  {editor.allowed_city && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                      <MapPin className="h-3 w-3" />
                      {editor.allowed_city}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={() => openEdit(editor)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition"
                  title="Editar"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(editor.id)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                  title="Remover"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Editores;
