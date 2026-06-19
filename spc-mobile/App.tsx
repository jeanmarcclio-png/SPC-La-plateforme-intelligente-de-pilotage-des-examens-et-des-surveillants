import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Modal, SafeAreaView, Alert, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { supabase } from "./lib/supabase";

type Prospect = { id: string; nom: string; email: string; segment: string; score_bant: number; statut: string; niveau: string };
type Campagne = { id: string; nom: string; perimetre: string; statut: string; score: number; nombre_prospects: number; tres_chaudes: number; jours_restants: number };

const STATUT_COLORS: Record<string, string> = { "Non contacté": "#a0aec0", "En cours": "#4a90d9", "RDV fixé": "#38a169", "Converti": "#1a6b7e" };
const NIVEAU_COLORS: Record<string, string> = { "Très chaud": "#f6ad55", "Chaud": "#fc8181", "Tiède": "#4a90d9", "Froid": "#a0aec0" };
const CAMP_COLORS: Record<string, string> = { "En cours": "#4a90d9", "Planifiée": "#a0aec0", "Terminée": "#38a169", "Annulée": "#fc8181", "Actif": "#38a169", "Terminé": "#a0aec0" };

export default function App() {
  const [tab, setTab] = useState<"dashboard" | "prospects" | "campagnes">("dashboard");
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [campagnes, setCampagnes] = useState<Campagne[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ total: 0, tresChaudes: 0, scoreMoyen: 0, rdvFixes: 0 });
  const [selected, setSelected] = useState<Prospect | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newNom, setNewNom] = useState("");
  const [newSegment, setNewSegment] = useState("");
  const [newEmail, setNewEmail] = useState("");

  async function loadProspects() {
    const { data, error } = await supabase.from("prospects").select("id, nom, email, segment, score_bant, statut, niveau").order("score_bant", { ascending: false }).limit(50);
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

  function showStatutPicker(c: Campagne) {
    Alert.alert("Statut de " + c.nom, "Choisissez le nouveau statut :", [
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

  const ProspectCard = ({ p }: { p: Prospect }) => (
    <TouchableOpacity style={styles.prospectCard} onPress={() => setSelected(p)}>
      <View style={styles.prospectInfo}><Text style={styles.prospectNom}>{p.nom}</Text><Text style={styles.prospectSeg}>{p.segment}</Text></View>
      <View style={styles.prospectRight}>
        <Text style={styles.prospectScore}>{p.score_bant}</Text>
        <View style={[styles.statutBadge, { backgroundColor: (STATUT_COLORS[p.statut] ?? "#a0aec0") + "20" }]}><Text style={[styles.statutText, { color: STATUT_COLORS[p.statut] ?? "#a0aec0" }]}>{p.statut}</Text></View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1 }}>
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

      {tab === "prospects" && (
        <View style={{ flex: 1 }}>
          <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a6b7e" />}>
            <View style={styles.header}><Text style={styles.headerTitle}>Prospects</Text><Text style={styles.headerSub}>{prospects.length} établissements</Text></View>
            {prospects.map(p => <ProspectCard key={p.id} p={p} />)}
            <View style={{ height: 80 }} />
          </ScrollView>
          <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)}>
            <Text style={styles.fabTxt}>+</Text>
          </TouchableOpacity>
        </View>
      )}

      {tab === "campagnes" && (
        <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a6b7e" />}>
          <View style={styles.header}><Text style={styles.headerTitle}>Campagnes</Text><Text style={styles.headerSub}>{campagnes.length} campagnes • Appuyez sur le statut pour modifier</Text></View>
          {campagnes.map(c => (
            <View key={c.id} style={styles.campCard}>
              <View style={styles.campTop}>
                <Text style={styles.campNom}>{c.nom}</Text>
                <TouchableOpacity onPress={() => showStatutPicker(c)} style={[styles.statutBadge, { backgroundColor: (CAMP_COLORS[c.statut] ?? "#a0aec0") + "20" }]}>
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

      <SafeAreaView style={styles.tabBar}>
        {([["dashboard", "📊", "Dashboard"], ["prospects", "👥", "Prospects"], ["campagnes", "📋", "Campagnes"]] as const).map(([key, icon, label]) => (
          <TouchableOpacity key={key} style={styles.tabItem} onPress={() => setTab(key)}>
            <Text style={styles.tabIcon}>{icon}</Text>
            <Text style={[styles.tabLabel, tab === key && styles.tabLabelActive]}>{label}</Text>
            {tab === key && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </SafeAreaView>

      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}><Text style={styles.modalNom}>{selected?.nom}</Text><Text style={styles.modalSeg}>{selected?.segment}</Text></View>
            <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeBtn}><Text style={styles.closeTxt}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
            <View style={styles.row}>
              <View style={[styles.badge, { backgroundColor: (NIVEAU_COLORS[selected?.niveau ?? ""] ?? "#a0aec0") + "20" }]}><Text style={[styles.badgeTxt, { color: NIVEAU_COLORS[selected?.niveau ?? ""] ?? "#a0aec0" }]}>{selected?.niveau}</Text></View>
              <View style={[styles.badge, { backgroundColor: (STATUT_COLORS[selected?.statut ?? ""] ?? "#a0aec0") + "20" }]}><Text style={[styles.badgeTxt, { color: STATUT_COLORS[selected?.statut ?? ""] ?? "#a0aec0" }]}>{selected?.statut}</Text></View>
            </View>
            <View style={styles.scoreCard}><Text style={styles.scoreLabel}>Score BANT</Text><Text style={styles.scoreBig}>{selected?.score_bant}<Text style={styles.scoreMax}>/10</Text></Text></View>
            {selected?.email ? <View style={styles.infoRow}><Text style={styles.infoLabel}>Email</Text><Text style={styles.infoValue}>{selected.email}</Text></View> : null}
            <TouchableOpacity style={styles.deleteBtn} onPress={() => selected && deleteProspect(selected.id)}>
              <Text style={styles.deleteTxt}>🗑 Supprimer ce prospect</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

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
  fab: { position: "absolute", bottom: 20, right: 20, backgroundColor: "#1a6b7e", width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  fabTxt: { color: "#fff", fontSize: 32, lineHeight: 36 },
  tabBar: { flexDirection: "row", backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 8, position: "relative" },
  tabIcon: { fontSize: 20 },
  tabLabel: { fontSize: 10, color: "#a0aec0", marginTop: 2 },
  tabLabelActive: { color: "#1a6b7e", fontWeight: "700" },
  tabIndicator: { position: "absolute", top: 0, left: "25%", right: "25%", height: 2, backgroundColor: "#1a6b7e", borderRadius: 1 },
  modal: { flex: 1, backgroundColor: "#f7f8fa" },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#1a6b7e", padding: 20, paddingTop: 24 },
  modalNom: { fontSize: 18, fontWeight: "800", color: "#fff", flex: 1 },
  modalSeg: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  closeBtn: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20, width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  closeTxt: { color: "#fff", fontSize: 14, fontWeight: "700" },
  row: { flexDirection: "row", gap: 8 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  badgeTxt: { fontSize: 12, fontWeight: "700" },
  scoreCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#e2e8f0", alignItems: "center" },
  scoreLabel: { fontSize: 12, color: "#718096", marginBottom: 4 },
  scoreBig: { fontSize: 48, fontWeight: "900", color: "#1a6b7e" },
  scoreMax: { fontSize: 20, fontWeight: "400", color: "#a0aec0" },
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
