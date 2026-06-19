import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Modal, SafeAreaView, Alert, TextInput, KeyboardAvoidingView, Platform, Linking } from "react-native";
import { supabase } from "./lib/supabase";

type Prospect = { id: string; nom: string; email: string; segment: string; score_bant: number; statut: string; niveau: string; notes?: string };
type Campagne = { id: string; nom: string; perimetre: string; statut: string; score: number; nombre_prospects: number; tres_chaudes: number; jours_restants: number };

const STATUT_COLORS: Record<string, string> = { "Non contacté": "#a0aec0", "En cours": "#4a90d9", "RDV fixé": "#38a169", "Converti": "#1a6b7e" };
const NIVEAU_COLORS: Record<string, string> = { "Très chaud": "#f6ad55", "Chaud": "#fc8181", "Tiède": "#4a90d9", "Froid": "#a0aec0" };
const CAMP_COLORS: Record<string, string> = { "En cours": "#4a90d9", "Planifiée": "#a0aec0", "Terminée": "#38a169", "Annulée": "#fc8181", "Actif": "#38a169", "Terminé": "#a0aec0" };

const FILTERS = ["Tous", "Non contacté", "En cours", "RDV fixé", "Converti", "Très chaud"];

export default function App() {
  const [tab, setTab] = useState<"dashboard" | "prospects" | "campagnes" | "agenda">("dashboard");
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [campagnes, setCampagnes] = useState<Campagne[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ total: 0, tresChaudes: 0, scoreMoyen: 0, rdvFixes: 0 });
  const [selected, setSelected] = useState<Prospect | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newNom, setNewNom] = useState("");
  const [newSegment, setNewSegment] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("Tous");
  const [editNotes, setEditNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  async function loadProspects() {
    const { data, error } = await supabase.from("prospects").select("id, nom, email, segment, score_bant, statut, niveau, notes").order("score_bant", { ascending: false }).limit(50);
    if (error) { Alert.alert("Erreur", error.message); return; }
    if (data) {
      setProspects(data);
      setStats({
        total: data.length,
        tresChaudes: data.filter(p => p.niveau === "Très chaud").length,
        scoreMoyen: data.length > 0 ? Math.round(data.reduce((s, p) => s + p.score_bant, 0) / data.length * 10) / 10 : 0,
        rdvFixes: data.filter(p => p.statut === "RDV fixé" || p.statut === "Converti").length,
      });
    }
  }

  async function loadCampagnes() {
    const { data, error } = await supabase.from("campagnes").select("id, nom, perimetre, statut, score, nombre_prospects, tres_chaudes, jours_restants").order("score", { ascending: false });
    if (error) { Alert.alert("Erreur", error.message); return; }
    if (data) setCampagnes(data);
  }

  async function load() { await Promise.all([loadProspects(), loadCampagnes()]); }
  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }
  useEffect(() => { load(); }, []);

  const filteredProspects = prospects.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || p.nom.toLowerCase().includes(q) || (p.segment ?? "").toLowerCase().includes(q);
    const matchFilter = activeFilter === "Tous" || p.statut === activeFilter || (activeFilter === "Très chaud" && p.niveau === "Très chaud");
    return matchSearch && matchFilter;
  });

  const agendaProspects = prospects.filter(p => p.statut === "Non contacté" || p.statut === "En cours").sort((a, b) => b.score_bant - a.score_bant);
  const agendaBadge = agendaProspects.length;

  function openProspect(p: Prospect) { setSelected(p); setEditNotes(p.notes ?? ""); }

  async function createProspect() {
    if (!newNom.trim()) { Alert.alert("Erreur", "Le nom est obligatoire"); return; }
    const { error } = await supabase.from("prospects").insert({
      id: Date.now().toString(), nom: newNom.trim(), segment: newSegment.trim(),
      email: newEmail.trim(), statut: "Non contacté", niveau: "Froid", score_bant: 0,
    });
    if (error) { Alert.alert("Erreur", error.message); return; }
    setNewNom(""); setNewSegment(""); setNewEmail("");
    setShowAdd(false);
    await loadProspects();
  }

  async function deleteProspect(id: string) {
    Alert.alert("Supprimer", "Confirmer la suppression ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: async () => {
        const { error } = await supabase.from("prospects").delete().eq("id", id);
        if (error) { Alert.alert("Erreur", error.message); return; }
        setSelected(null); await loadProspects();
      }},
    ]);
  }

  async function saveNotes() {
    if (!selected) return;
    setSavingNotes(true);
    const { error } = await supabase.from("prospects").update({ notes: editNotes }).eq("id", selected.id);
    if (error) { Alert.alert("Erreur", error.message); }
    else { setSelected(prev => prev ? { ...prev, notes: editNotes } : null); await loadProspects(); Alert.alert("Sauvegardé", "Notes mises à jour."); }
    setSavingNotes(false);
  }

  async function updateProspectStatut(id: string, statut: string) {
    const { error } = await supabase.from("prospects").update({ statut }).eq("id", id);
    if (error) { Alert.alert("Erreur", error.message); return; }
    setSelected(prev => prev ? { ...prev, statut } : null);
    await loadProspects();
  }

  async function updateProspectNiveau(id: string, niveau: string) {
    const { error } = await supabase.from("prospects").update({ niveau }).eq("id", id);
    if (error) { Alert.alert("Erreur", error.message); return; }
    setSelected(prev => prev ? { ...prev, niveau } : null);
    await loadProspects();
  }

  function showStatutProspectPicker(p: Prospect) {
    Alert.alert("Statut — " + p.nom, "Choisissez le nouveau statut :", [
      { text: "Non contacté", onPress: () => updateProspectStatut(p.id, "Non contacté") },
      { text: "En cours", onPress: () => updateProspectStatut(p.id, "En cours") },
      { text: "RDV fixé", onPress: () => updateProspectStatut(p.id, "RDV fixé") },
      { text: "Converti", onPress: () => updateProspectStatut(p.id, "Converti") },
      { text: "Annuler", style: "cancel" },
    ]);
  }

  function showNiveauPicker(p: Prospect) {
    Alert.alert("Chaleur — " + p.nom, "Choisissez le niveau :", [
      { text: "Très chaud 🔥", onPress: () => updateProspectNiveau(p.id, "Très chaud") },
      { text: "Chaud", onPress: () => updateProspectNiveau(p.id, "Chaud") },
      { text: "Tiède", onPress: () => updateProspectNiveau(p.id, "Tiède") },
      { text: "Froid", onPress: () => updateProspectNiveau(p.id, "Froid") },
      { text: "Annuler", style: "cancel" },
    ]);
  }

  function showStatutCampagnePicker(c: Campagne) {
    Alert.alert("Statut — " + c.nom, "Choisissez le nouveau statut :", [
      { text: "En cours", onPress: () => updateCampagneStatut(c.id, "En cours") },
      { text: "Planifiée", onPress: () => updateCampagneStatut(c.id, "Planifiée") },
      { text: "Terminée", onPress: () => updateCampagneStatut(c.id, "Terminée") },
      { text: "Annulée", style: "destructive", onPress: () => updateCampagneStatut(c.id, "Annulée") },
      { text: "Annuler", style: "cancel" },
    ]);
  }

  async function updateCampagneStatut(id: string, statut: string) {
    const { error } = await supabase.from("campagnes").update({ statut }).eq("id", id);
    if (error) { Alert.alert("Erreur", error.message); return; }
    await loadCampagnes();
  }

  function emailProspect(email: string, nom: string) {
    if (!email) { Alert.alert("Email manquant", "Aucun email enregistré pour " + nom); return; }
    Linking.openURL(`mailto:${email}?subject=SPC — Surveillance d'examens&body=Bonjour,\n\nJe me permets de vous contacter au sujet de la gestion de vos surveillances d'examens...\n\nCordialement,`);
  }

  function callProspect(nom: string) {
    Alert.prompt("Appeler " + nom, "Numéro de téléphone :", (num) => {
      if (num) Linking.openURL("tel:" + num.replace(/\s/g, ""));
    }, "plain-text", "", "phone-pad");
  }

  const ScoreGauge = ({ score }: { score: number }) => {
    const pct = Math.min(score / 10, 1);
    const color = score >= 8 ? "#38a169" : score >= 5 ? "#f6ad55" : "#fc8181";
    return (
      <View style={styles.gaugeWrap}>
        <Text style={styles.gaugeLabel}>Score BANT</Text>
        <View style={styles.gaugeTrack}><View style={[styles.gaugeFill, { width: `${pct * 100}%` as any, backgroundColor: color }]} /></View>
        <Text style={[styles.gaugeValue, { color }]}>{score}<Text style={styles.gaugeMax}>/10</Text></Text>
      </View>
    );
  };

  const ProspectCard = ({ p, showNiveau }: { p: Prospect; showNiveau?: boolean }) => (
    <TouchableOpacity style={styles.prospectCard} onPress={() => openProspect(p)}>
      <View style={styles.prospectInfo}>
        <Text style={styles.prospectNom}>{p.nom}</Text>
        <Text style={styles.prospectSeg}>{p.segment}</Text>
        {showNiveau && <View style={[styles.statutBadge, { backgroundColor: (NIVEAU_COLORS[p.niveau] ?? "#a0aec0") + "20", alignSelf: "flex-start", marginTop: 4 }]}><Text style={[styles.statutText, { color: NIVEAU_COLORS[p.niveau] ?? "#a0aec0" }]}>{p.niveau}</Text></View>}
      </View>
      <View style={styles.prospectRight}>
        <Text style={styles.prospectScore}>{p.score_bant}</Text>
        <View style={[styles.statutBadge, { backgroundColor: (STATUT_COLORS[p.statut] ?? "#a0aec0") + "20" }]}><Text style={[styles.statutText, { color: STATUT_COLORS[p.statut] ?? "#a0aec0" }]}>{p.statut}</Text></View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1 }}>
      {/* ── DASHBOARD ── */}
      {tab === "dashboard" && (
        <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a6b7e" />}>
          <View style={styles.header}><Text style={styles.headerTitle}>SPC Cockpit</Text><Text style={styles.headerSub}>Tableau de bord</Text></View>
          <View style={styles.kpiGrid}>
            {[{ label: "Prospects", value: stats.total, color: "#1a202c" }, { label: "Très chaud", value: stats.tresChaudes, color: "#f6ad55" }, { label: "Score BANT", value: stats.scoreMoyen, color: "#1a6b7e" }, { label: "RDV / Conv.", value: stats.rdvFixes, color: "#38a169" }].map(k => (
              <View key={k.label} style={styles.kpiCard}><Text style={[styles.kpiValue, { color: k.color }]}>{k.value}</Text><Text style={styles.kpiLabel}>{k.label}</Text></View>
            ))}
          </View>
          <Text style={styles.sectionTitle}>Top prospects</Text>
          {prospects.slice(0, 5).map(p => <ProspectCard key={p.id} p={p} />)}
          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      {/* ── PROSPECTS ── */}
      {tab === "prospects" && (
        <View style={{ flex: 1 }}>
          <View style={styles.searchHeader}>
            <TextInput style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} placeholder="Rechercher un établissement..." placeholderTextColor="#a0aec0" clearButtonMode="while-editing" />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 12, gap: 8, alignItems: "center" }}>
            {FILTERS.map(f => (
              <TouchableOpacity key={f} onPress={() => setActiveFilter(f)} style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}>
                <Text style={[styles.filterChipTxt, activeFilter === f && styles.filterChipTxtActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a6b7e" />}>
            <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 }}><Text style={styles.resultsCount}>{filteredProspects.length} résultat{filteredProspects.length !== 1 ? "s" : ""}</Text></View>
            {filteredProspects.map(p => <ProspectCard key={p.id} p={p} />)}
            <View style={{ height: 80 }} />
          </ScrollView>
          <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)}>
            <Text style={styles.fabTxt}>+</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── CAMPAGNES ── */}
      {tab === "campagnes" && (
        <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a6b7e" />}>
          <View style={styles.header}><Text style={styles.headerTitle}>Campagnes</Text><Text style={styles.headerSub}>{campagnes.length} campagnes • Appuyez sur le statut pour modifier</Text></View>
          {campagnes.map(c => (
            <View key={c.id} style={styles.campCard}>
              <View style={styles.campTop}>
                <Text style={styles.campNom}>{c.nom}</Text>
                <TouchableOpacity onPress={() => showStatutCampagnePicker(c)} style={[styles.statutBadge, { backgroundColor: (CAMP_COLORS[c.statut] ?? "#a0aec0") + "20" }]}>
                  <Text style={[styles.statutText, { color: CAMP_COLORS[c.statut] ?? "#a0aec0" }]}>{c.statut} ✎</Text>
                </TouchableOpacity>
              </View>
              {c.perimetre ? <Text style={styles.campPerim}>{c.perimetre}</Text> : null}
              <View style={styles.campStats}>
                <Text style={styles.campStat}>📊 Score {c.score}</Text>
                <Text style={styles.campStat}>👥 {c.nombre_prospects} prospects</Text>
                <Text style={styles.campStat}>🔥 {c.tres_chaudes} chauds</Text>
                {c.jours_restants > 0 && <Text style={styles.campStat}>⏳ {c.jours_restants}j</Text>}
              </View>
            </View>
          ))}
          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      {/* ── AGENDA ── */}
      {tab === "agenda" && (
        <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a6b7e" />}>
          <View style={[styles.header, { backgroundColor: "#744210" }]}>
            <Text style={styles.headerTitle}>Agenda</Text>
            <Text style={styles.headerSub}>{agendaBadge} prospect{agendaBadge !== 1 ? "s" : ""} à relancer</Text>
          </View>
          {agendaProspects.length === 0 ? (
            <View style={styles.emptyState}><Text style={styles.emptyIcon}>🎉</Text><Text style={styles.emptyTxt}>Aucun prospect en attente</Text></View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>À contacter / relancer</Text>
              {agendaProspects.map(p => <ProspectCard key={p.id} p={p} showNiveau />)}
            </>
          )}
          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      {/* ── TAB BAR ── */}
      <SafeAreaView style={styles.tabBar}>
        {([
          ["dashboard", "📊", "Dashboard", 0],
          ["prospects", "👥", "Prospects", 0],
          ["campagnes", "📋", "Campagnes", 0],
          ["agenda", "🗓", "Agenda", agendaBadge],
        ] as const).map(([key, icon, label, badge]) => (
          <TouchableOpacity key={key} style={styles.tabItem} onPress={() => setTab(key as any)}>
            <View style={{ position: "relative" }}>
              <Text style={styles.tabIcon}>{icon}</Text>
              {badge > 0 && (
                <View style={styles.badgeDot}><Text style={styles.badgeDotTxt}>{badge}</Text></View>
              )}
            </View>
            <Text style={[styles.tabLabel, tab === key && styles.tabLabelActive]}>{label}</Text>
            {tab === key && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </SafeAreaView>

      {/* ── FICHE PROSPECT ── */}
      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <SafeAreaView style={styles.modal}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalNom}>{selected?.nom}</Text>
                <Text style={styles.modalSeg}>{selected?.segment}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeBtn}><Text style={styles.closeTxt}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
              <View style={styles.row}>
                <TouchableOpacity style={[styles.badge, { backgroundColor: (STATUT_COLORS[selected?.statut ?? ""] ?? "#a0aec0") + "20", flex: 1 }]} onPress={() => selected && showStatutProspectPicker(selected)}>
                  <Text style={[styles.badgeTxt, { color: STATUT_COLORS[selected?.statut ?? ""] ?? "#a0aec0" }]}>{selected?.statut} ✎</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.badge, { backgroundColor: (NIVEAU_COLORS[selected?.niveau ?? ""] ?? "#a0aec0") + "20", flex: 1 }]} onPress={() => selected && showNiveauPicker(selected)}>
                  <Text style={[styles.badgeTxt, { color: NIVEAU_COLORS[selected?.niveau ?? ""] ?? "#a0aec0" }]}>{selected?.niveau} ✎</Text>
                </TouchableOpacity>
              </View>

              {selected && <ScoreGauge score={selected.score_bant} />}

              <Text style={styles.sectionTitle}>Actions rapides</Text>
              <View style={styles.actionsRow}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#ebf8ff" }]} onPress={() => selected && callProspect(selected.nom)}>
                  <Text style={styles.actionIcon}>📞</Text>
                  <Text style={[styles.actionTxt, { color: "#2b6cb0" }]}>Appeler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#f0fff4" }]} onPress={() => selected && emailProspect(selected.email, selected.nom)}>
                  <Text style={styles.actionIcon}>✉️</Text>
                  <Text style={[styles.actionTxt, { color: "#276749" }]}>Email</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#fffaf0" }]} onPress={() => selected && showStatutProspectPicker(selected)}>
                  <Text style={styles.actionIcon}>🔄</Text>
                  <Text style={[styles.actionTxt, { color: "#b7791f" }]}>Statut</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#fff5f5" }]} onPress={() => selected && showNiveauPicker(selected)}>
                  <Text style={styles.actionIcon}>🌡</Text>
                  <Text style={[styles.actionTxt, { color: "#c53030" }]}>Chaleur</Text>
                </TouchableOpacity>
              </View>

              {selected?.email ? (
                <TouchableOpacity style={styles.infoRow} onPress={() => selected && emailProspect(selected.email, selected.nom)}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={[styles.infoValue, { color: "#2b6cb0" }]}>{selected.email} →</Text>
                </TouchableOpacity>
              ) : null}

              <View style={styles.notesWrap}>
                <Text style={styles.notesLabel}>Notes de prospection</Text>
                <TextInput
                  style={styles.notesInput}
                  value={editNotes}
                  onChangeText={setEditNotes}
                  placeholder="Compte-rendu d'appel, remarques, prochaine étape..."
                  placeholderTextColor="#a0aec0"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <TouchableOpacity style={[styles.saveNotesBtn, savingNotes && { opacity: 0.6 }]} onPress={saveNotes} disabled={savingNotes}>
                  <Text style={styles.saveNotesTxt}>{savingNotes ? "Sauvegarde..." : "💾 Sauvegarder les notes"}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.deleteBtn} onPress={() => selected && deleteProspect(selected.id)}>
                <Text style={styles.deleteTxt}>🗑 Supprimer ce prospect</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── FORMULAIRE NOUVEAU PROSPECT ── */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <SafeAreaView style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalNom}>Nouveau prospect</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)} style={styles.closeBtn}><Text style={styles.closeTxt}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
              <View>
                <Text style={styles.inputLabel}>Nom de l'établissement *</Text>
                <TextInput style={styles.input} value={newNom} onChangeText={setNewNom} placeholder="Ex : EM Lyon" placeholderTextColor="#a0aec0" />
              </View>
              <View>
                <Text style={styles.inputLabel}>Segment</Text>
                <TextInput style={styles.input} value={newSegment} onChangeText={setNewSegment} placeholder="Ex : Commerce, Santé..." placeholderTextColor="#a0aec0" />
              </View>
              <View>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput style={styles.input} value={newEmail} onChangeText={setNewEmail} placeholder="contact@ecole.fr" placeholderTextColor="#a0aec0" keyboardType="email-address" autoCapitalize="none" />
              </View>
              <TouchableOpacity style={styles.createBtn} onPress={createProspect}>
                <Text style={styles.createTxt}>Créer le prospect</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f8fa" },
  header: { backgroundColor: "#1a6b7e", paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", padding: 12, gap: 8 },
  kpiCard: { flex: 1, minWidth: "45%", backgroundColor: "#fff", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#e2e8f0" },
  kpiValue: { fontSize: 26, fontWeight: "800" },
  kpiLabel: { fontSize: 11, color: "#718096", marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#1a202c", marginHorizontal: 16, marginBottom: 8, marginTop: 4 },
  searchHeader: { backgroundColor: "#fff", paddingHorizontal: 12, paddingTop: 56, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  searchInput: { backgroundColor: "#f7f8fa", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: "#1a202c", borderWidth: 1, borderColor: "#e2e8f0" },
  filterRow: { backgroundColor: "#fff", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", flexGrow: 0 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: "#f7f8fa", borderWidth: 1, borderColor: "#e2e8f0" },
  filterChipActive: { backgroundColor: "#1a6b7e", borderColor: "#1a6b7e" },
  filterChipTxt: { fontSize: 12, color: "#718096", fontWeight: "600" },
  filterChipTxtActive: { color: "#fff" },
  resultsCount: { fontSize: 12, color: "#a0aec0" },
  prospectCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", marginHorizontal: 12, marginBottom: 6, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#e2e8f0" },
  prospectInfo: { flex: 1 },
  prospectNom: { fontSize: 13, fontWeight: "700", color: "#1a202c" },
  prospectSeg: { fontSize: 11, color: "#718096", marginTop: 1 },
  prospectRight: { alignItems: "flex-end", gap: 4 },
  prospectScore: { fontSize: 16, fontWeight: "800", color: "#1a6b7e" },
  statutBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  statutText: { fontSize: 10, fontWeight: "700" },
  campCard: { backgroundColor: "#fff", marginHorizontal: 12, marginBottom: 8, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: "#e2e8f0" },
  campTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  campNom: { fontSize: 14, fontWeight: "700", color: "#1a202c", flex: 1, marginRight: 8 },
  campPerim: { fontSize: 11, color: "#718096", marginBottom: 8 },
  campStats: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  campStat: { fontSize: 11, color: "#4a5568", backgroundColor: "#f7f8fa", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  emptyState: { alignItems: "center", paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTxt: { fontSize: 16, color: "#718096" },
  fab: { position: "absolute", bottom: 20, right: 20, backgroundColor: "#1a6b7e", width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  fabTxt: { color: "#fff", fontSize: 32, lineHeight: 36 },
  tabBar: { flexDirection: "row", backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 8, position: "relative" },
  tabIcon: { fontSize: 20 },
  tabLabel: { fontSize: 10, color: "#a0aec0", marginTop: 2 },
  tabLabelActive: { color: "#1a6b7e", fontWeight: "700" },
  tabIndicator: { position: "absolute", top: 0, left: "25%", right: "25%", height: 2, backgroundColor: "#1a6b7e", borderRadius: 1 },
  badgeDot: { position: "absolute", top: -4, right: -8, backgroundColor: "#e53e3e", borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  badgeDotTxt: { color: "#fff", fontSize: 9, fontWeight: "800" },
  modal: { flex: 1, backgroundColor: "#f7f8fa" },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#1a6b7e", padding: 20, paddingTop: 24 },
  modalNom: { fontSize: 18, fontWeight: "800", color: "#fff", flex: 1 },
  modalSeg: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  closeBtn: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20, width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  closeTxt: { color: "#fff", fontSize: 14, fontWeight: "700" },
  row: { flexDirection: "row", gap: 8 },
  badge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  badgeTxt: { fontSize: 12, fontWeight: "700" },
  actionsRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  actionBtn: { flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 12, gap: 4 },
  actionIcon: { fontSize: 22 },
  actionTxt: { fontSize: 11, fontWeight: "700" },
  gaugeWrap: { backgroundColor: "#fff", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#e2e8f0" },
  gaugeLabel: { fontSize: 12, color: "#718096", marginBottom: 8 },
  gaugeTrack: { height: 10, backgroundColor: "#e2e8f0", borderRadius: 5, overflow: "hidden", marginBottom: 6 },
  gaugeFill: { height: "100%", borderRadius: 5 },
  gaugeValue: { fontSize: 32, fontWeight: "900", textAlign: "right" },
  gaugeMax: { fontSize: 16, fontWeight: "400", color: "#a0aec0" },
  notesWrap: { backgroundColor: "#fff", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#e2e8f0" },
  notesLabel: { fontSize: 12, color: "#718096", marginBottom: 8, fontWeight: "600" },
  notesInput: { fontSize: 14, color: "#1a202c", minHeight: 100, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, padding: 10, backgroundColor: "#f7f8fa" },
  saveNotesBtn: { backgroundColor: "#1a6b7e", borderRadius: 8, padding: 12, alignItems: "center", marginTop: 10 },
  saveNotesTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },
  infoRow: { backgroundColor: "#fff", borderRadius: 10, padding: 14, borderWidth: 1, borderColor: "#e2e8f0" },
  infoLabel: { fontSize: 11, color: "#718096", marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: "600", color: "#1a202c" },
  deleteBtn: { backgroundColor: "#fff5f5", borderRadius: 10, padding: 14, borderWidth: 1, borderColor: "#feb2b2", alignItems: "center", marginTop: 8 },
  deleteTxt: { color: "#e53e3e", fontWeight: "700", fontSize: 14 },
  inputLabel: { fontSize: 12, color: "#718096", marginBottom: 6, fontWeight: "600" },
  input: { backgroundColor: "#fff", borderRadius: 10, padding: 14, borderWidth: 1, borderColor: "#e2e8f0", fontSize: 15, color: "#1a202c" },
  createBtn: { backgroundColor: "#1a6b7e", borderRadius: 10, padding: 16, alignItems: "center", marginTop: 8 },
  createTxt: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
