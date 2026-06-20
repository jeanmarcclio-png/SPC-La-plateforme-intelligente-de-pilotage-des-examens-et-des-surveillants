import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Modal, SafeAreaView, Alert, TextInput, KeyboardAvoidingView, Platform, Linking, Share } from "react-native";
import { supabase } from "./lib/supabase";

type Prospect = {
  id: string; nom: string; email: string; segment: string;
  score_bant: number; statut: string; niveau: string;
  notes?: string; telephone?: string; contact_principal?: string;
  fonction_contact?: string; prochaine_relance?: string;
  valeur_potentielle?: string; derniere_interaction?: string;
};

function getRelanceStatus(dateStr: string): { color: string; label: string; bg: string; border: string } {
  if (!dateStr) return { color: "#a0aec0", label: "", bg: "#fffbeb", border: "#fde68a" };
  const p = dateStr.split("/");
  if (p.length !== 3) return { color: "#a0aec0", label: "", bg: "#fffbeb", border: "#fde68a" };
  const d = new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.floor((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { color: "#e53e3e", label: `⚠️ En retard de ${Math.abs(diff)}j`, bg: "#fff5f5", border: "#feb2b2" };
  if (diff === 0) return { color: "#f6ad55", label: "🔔 Aujourd'hui", bg: "#fffbeb", border: "#f6ad55" };
  if (diff === 1) return { color: "#f6ad55", label: "⏰ Demain", bg: "#fffbeb", border: "#f6ad55" };
  return { color: "#38a169", label: `✅ Dans ${diff} jours`, bg: "#f0fff4", border: "#9ae6b4" };
}
type Campagne = { id: string; nom: string; perimetre: string; statut: string; score: number; nombre_prospects: number; tres_chaudes: number; jours_restants: number };

const STATUT_COLORS: Record<string, string> = { "Non contacté": "#a0aec0", "En cours": "#4a90d9", "RDV fixé": "#38a169", "Converti": "#1a6b7e" };
const NIVEAU_COLORS: Record<string, string> = { "Très chaud": "#f6ad55", "Chaud": "#fc8181", "Tiède": "#4a90d9", "Froid": "#a0aec0" };
const CAMP_COLORS: Record<string, string> = { "En cours": "#4a90d9", "Planifiée": "#a0aec0", "Terminée": "#38a169", "Annulée": "#fc8181", "Actif": "#38a169", "Terminé": "#a0aec0" };
const CAMP_EMOJI: Record<string, string> = { "En cours": "🔵", "Planifiée": "⚪", "Terminée": "⚫", "Annulée": "🔴", "Actif": "🟢", "Terminé": "⚫" };
const PIPELINE = ["Non contacté", "En cours", "RDV fixé", "Converti"];
const PIPELINE_SHORT = ["Nouveau", "En cours", "RDV", "Converti"];
const FILTERS = ["Tous", "Non contacté", "En cours", "RDV fixé", "Converti", "Très chaud"];

const PipelineBar = ({ statut, onPress }: { statut: string; onPress: (s: string) => void }) => {
  const idx = Math.max(PIPELINE.indexOf(statut), 0);
  return (
    <View style={styles.pipelineWrap}>
      <Text style={styles.pipelineTitle}>PIPELINE</Text>
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        {PIPELINE.map((step, i) => (
          <View key={step} style={{ flex: 1, alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", width: "100%" }}>
              {i > 0 && <View style={{ flex: 1, height: 2, backgroundColor: i <= idx ? "#1a6b7e" : "#e2e8f0" }} />}
              <TouchableOpacity onPress={() => onPress(step)} style={[styles.pipelineDot, i < idx && styles.pipelineDotDone, i === idx && styles.pipelineDotActive]}>
                <Text style={{ color: i <= idx ? "#fff" : "#c0cfe0", fontSize: 11, fontWeight: "800" }}>{i < idx ? "✓" : (i + 1).toString()}</Text>
              </TouchableOpacity>
              {i < PIPELINE.length - 1 && <View style={{ flex: 1, height: 2, backgroundColor: i < idx ? "#1a6b7e" : "#e2e8f0" }} />}
            </View>
            <Text style={[styles.pipelineLabel, i === idx && styles.pipelineLabelActive]} numberOfLines={1}>{PIPELINE_SHORT[i]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

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
  const [showAddCampagne, setShowAddCampagne] = useState(false);
  const [newCampNom, setNewCampNom] = useState("");
  const [newCampPerim, setNewCampPerim] = useState("");
  const [newCampJours, setNewCampJours] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("Tous");
  const [editNotes, setEditNotes] = useState("");
  const [editTelephone, setEditTelephone] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editFonction, setEditFonction] = useState("");
  const [editRelance, setEditRelance] = useState("");
  const [editValeur, setEditValeur] = useState("");
  const [editInteraction, setEditInteraction] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadProspects() {
    let { data, error } = await supabase
      .from("prospects")
      .select("id, nom, email, segment, score_bant, statut, niveau, notes, telephone, contact_principal, fonction_contact, prochaine_relance, valeur_potentielle, derniere_interaction")
      .order("score_bant", { ascending: false }).limit(50);
    if (error) {
      const r = await supabase.from("prospects").select("id, nom, email, segment, score_bant, statut, niveau, notes, telephone, contact_principal, fonction_contact, prochaine_relance").order("score_bant", { ascending: false }).limit(50);
      data = r.data; if (r.error) { Alert.alert("Erreur", r.error.message); return; }
    }
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

  useEffect(() => {
    load().then(() => {
      // Alerte relances du jour au démarrage — vérifiée après chargement des données
    });
  }, []);

  useEffect(() => {
    if (prospects.length === 0) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dues = prospects.filter(p => {
      if (!p.prochaine_relance) return false;
      const parts = p.prochaine_relance.split("/");
      if (parts.length !== 3) return false;
      const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      return d <= today;
    });
    if (dues.length > 0) {
      const names = dues.slice(0, 3).map(p => `• ${p.nom}`).join("\n");
      const more = dues.length > 3 ? `\n+ ${dues.length - 3} autre(s)` : "";
      Alert.alert(
        `📅 ${dues.length} relance${dues.length > 1 ? "s" : ""} aujourd'hui`,
        names + more,
        [{ text: "Voir l'agenda", onPress: () => setTab("agenda") }, { text: "OK", style: "cancel" }]
      );
    }
  }, [prospects]);

  const filteredProspects = prospects.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || p.nom.toLowerCase().includes(q) || (p.segment ?? "").toLowerCase().includes(q);
    const matchFilter = activeFilter === "Tous" || p.statut === activeFilter || (activeFilter === "Très chaud" && p.niveau === "Très chaud");
    return matchSearch && matchFilter;
  });

  const agendaProspects = prospects.filter(p => p.statut === "Non contacté" || p.statut === "En cours").sort((a, b) => b.score_bant - a.score_bant);

  function openProspect(p: Prospect) {
    setSelected(p);
    setEditNotes(p.notes ?? "");
    setEditTelephone(p.telephone ?? "");
    setEditContact(p.contact_principal ?? "");
    setEditFonction(p.fonction_contact ?? "");
    setEditRelance(p.prochaine_relance ?? "");
    setEditValeur(p.valeur_potentielle ?? "");
    setEditInteraction(p.derniere_interaction ?? "");
  }

  async function createProspect() {
    if (!newNom.trim()) { Alert.alert("Erreur", "Le nom est obligatoire"); return; }
    const { error } = await supabase.from("prospects").insert({
      id: Date.now().toString(), nom: newNom.trim(), segment: newSegment.trim(),
      email: newEmail.trim(), statut: "Non contacté", niveau: "Froid", score_bant: 0,
    });
    if (error) { Alert.alert("Erreur", error.message); return; }
    setNewNom(""); setNewSegment(""); setNewEmail("");
    setShowAdd(false); await loadProspects();
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

  async function saveProspect() {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase.from("prospects").update({
      notes: editNotes, telephone: editTelephone,
      contact_principal: editContact, fonction_contact: editFonction,
      prochaine_relance: editRelance, valeur_potentielle: editValeur,
      derniere_interaction: editInteraction,
    }).eq("id", selected.id);
    if (error) { Alert.alert("Erreur", error.message); }
    else {
      setSelected(prev => prev ? { ...prev, notes: editNotes, telephone: editTelephone, contact_principal: editContact, fonction_contact: editFonction, prochaine_relance: editRelance, valeur_potentielle: editValeur, derniere_interaction: editInteraction } : null);
      await loadProspects();
      Alert.alert("✅ Sauvegardé", editRelance ? `Relance enregistrée pour le ${editRelance}` : "Fiche mise à jour.");
    }
    setSaving(false);
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

  function showNiveauPicker(p: Prospect) {
    Alert.alert("Niveau de chaleur — " + p.nom, undefined, [
      { text: "🔥 Très chaud", onPress: () => updateProspectNiveau(p.id, "Très chaud") },
      { text: "🌶 Chaud", onPress: () => updateProspectNiveau(p.id, "Chaud") },
      { text: "🌊 Tiède", onPress: () => updateProspectNiveau(p.id, "Tiède") },
      { text: "❄️ Froid", onPress: () => updateProspectNiveau(p.id, "Froid") },
      { text: "Annuler", style: "cancel" },
    ]);
  }

  function showStatutCampagnePicker(c: Campagne) {
    Alert.alert("Statut — " + c.nom, undefined, [
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

  async function createCampagne() {
    if (!newCampNom.trim()) { Alert.alert("Erreur", "Le nom est obligatoire"); return; }
    const { error } = await supabase.from("campagnes").insert({
      id: Date.now().toString(), nom: newCampNom.trim(), perimetre: newCampPerim.trim(),
      statut: "Planifiée", score: 0, nombre_prospects: 0, tres_chaudes: 0,
      jours_restants: parseInt(newCampJours) || 0,
    });
    if (error) { Alert.alert("Erreur", error.message); return; }
    setNewCampNom(""); setNewCampPerim(""); setNewCampJours("");
    setShowAddCampagne(false); await loadCampagnes();
  }

  function callProspect(p: Prospect) {
    const tel = p.telephone || editTelephone;
    if (tel) { Linking.openURL("tel:" + tel.replace(/\s/g, "")); return; }
    Alert.prompt("Appeler " + p.nom, "Numéro de téléphone :", (num) => {
      if (num) Linking.openURL("tel:" + num.replace(/\s/g, ""));
    }, "plain-text", "", "phone-pad");
  }

  function shareProspect(p: Prospect) {
    const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    const lines = [
      `📋 FICHE PROSPECT SPC — ${p.nom}`,
      `Généré le ${today}`,
      ``,
      `Segment : ${p.segment || "—"}`,
      `Score BANT : ${p.score_bant}/10`,
      `Niveau : ${p.niveau}`,
      `Statut pipeline : ${p.statut}`,
      editTelephone ? `📞 ${editTelephone}` : null,
      p.email ? `✉️ ${p.email}` : null,
      editContact ? `👤 ${editContact}${editFonction ? ` · ${editFonction}` : ""}` : null,
      editValeur ? `💰 Valeur estimée : ${editValeur}` : null,
      editInteraction ? `⏱ Dernière interaction : ${editInteraction}` : null,
      editRelance ? `📅 Prochaine relance : ${editRelance}` : null,
      editNotes ? `\nNotes :\n${editNotes}` : null,
    ].filter(Boolean).join("\n");
    Share.share({ message: lines, title: `Fiche ${p.nom}` });
  }

  function emailProspect(email: string, nom: string) {
    if (!email) { Alert.alert("Email manquant", "Aucun email enregistré pour " + nom); return; }
    Linking.openURL(`mailto:${email}?subject=SPC — Surveillance d'examens&body=Bonjour,\n\nJe me permets de vous contacter au sujet de la gestion de vos surveillances d'examens...\n\nCordialement,`);
  }

  const ScoreGauge = ({ score }: { score: number }) => {
    const pct = Math.min(score / 10, 1);
    const color = score >= 8 ? "#38a169" : score >= 5 ? "#f6ad55" : "#fc8181";
    return (
      <View style={styles.gaugeWrap}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <Text style={styles.gaugeLabel}>Score BANT</Text>
          <Text style={[styles.gaugeValue, { color }]}>{score}<Text style={styles.gaugeMax}>/10</Text></Text>
        </View>
        <View style={styles.gaugeTrack}><View style={[styles.gaugeFill, { width: `${pct * 100}%` as any, backgroundColor: color }]} /></View>
      </View>
    );
  };

  const ProspectCard = ({ p, showNiveau }: { p: Prospect; showNiveau?: boolean }) => (
    <TouchableOpacity style={styles.prospectCard} onPress={() => openProspect(p)}>
      <View style={styles.prospectInfo}>
        <Text style={styles.prospectNom}>{p.nom}</Text>
        <Text style={styles.prospectSeg}>{p.segment}</Text>
        {showNiveau && <View style={[styles.niveauBadge, { backgroundColor: (NIVEAU_COLORS[p.niveau] ?? "#a0aec0") + "20" }]}><Text style={[styles.niveauBadgeTxt, { color: NIVEAU_COLORS[p.niveau] ?? "#a0aec0" }]}>{p.niveau}</Text></View>}
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
          <View style={styles.header}>
            <Text style={styles.headerGreeting}>Bonjour Jean-Marc 👋</Text>
            <Text style={styles.headerSub}>{new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</Text>
          </View>

          {/* KPIs */}
          {(() => {
            const nonContactes = prospects.filter(p => p.statut === "Non contacté").length;
            const enCours = prospects.filter(p => p.statut === "En cours").length;
            const convertis = prospects.filter(p => p.statut === "Converti").length;
            const aRelancer = prospects.filter(p => p.statut === "Non contacté" || p.statut === "En cours").length;
            const tauxPct = stats.total > 0 ? Math.round((stats.rdvFixes / stats.total) * 100) : 0;
            const kpis = [
              { label: "Prospects", value: stats.total, color: "#1a202c", sub: `${nonContactes} à contacter` },
              { label: "Opportunités 🔥", value: stats.tresChaudes, color: "#f6ad55", sub: `${enCours} en cours` },
              { label: "Taux conv.", value: tauxPct + "%", color: "#38a169", sub: `${convertis} convertis` },
              { label: "RDV / Conv.", value: stats.rdvFixes, color: "#1a6b7e", sub: `${aRelancer} à relancer` },
            ];
            return (
          <View style={styles.kpiGrid}>
            {kpis.map(k => (
              <View key={k.label} style={styles.kpiCard}>
                <Text style={[styles.kpiValue, { color: k.color }]}>{k.value}</Text>
                <Text style={styles.kpiLabel}>{k.label}</Text>
                <Text style={styles.kpiSub}>{k.sub}</Text>
              </View>
            ))}
          </View>
            );
          })()}

          {/* Recommandation IA */}
          {prospects.length > 0 && (() => {
            const rec = [...prospects].filter(p => p.statut !== "Converti" && p.statut !== "RDV fixé").sort((a, b) => b.score_bant - a.score_bant)[0];
            if (!rec) return null;
            const proba = Math.min(Math.round(rec.score_bant * 8 + 15), 95);
            const whyReasons = [
              `Score BANT ${rec.score_bant}/10 — priorité haute`,
              rec.niveau === "Très chaud" || rec.niveau === "Chaud"
                ? `Niveau ${rec.niveau} — intérêt confirmé`
                : `Statut "${rec.statut}" — à activer maintenant`,
              rec.segment ? `Segment ${rec.segment} — cible prioritaire SPC` : "Établissement à fort potentiel",
            ];
            return (
              <View style={styles.iaRec}>
                <View style={styles.iaRecTop}>
                  <Text style={styles.iaRecLabel}>🤖 RECOMMANDATION IA</Text>
                  <View style={styles.iaRecPriority}><Text style={styles.iaRecPriorityTxt}>PRIORITÉ 1</Text></View>
                </View>
                <Text style={styles.iaRecNom}>{rec.nom}</Text>
                <Text style={styles.iaRecSub}>{rec.segment} · Score {rec.score_bant}/10 · {rec.statut}</Text>

                {/* Pourquoi ? */}
                <View style={styles.iaRecWhy}>
                  <Text style={styles.iaRecWhyTitle}>Pourquoi ?</Text>
                  {whyReasons.map((r, i) => (
                    <View key={i} style={styles.iaRecWhyRow}>
                      <Text style={styles.iaRecWhyCheck}>✓</Text>
                      <Text style={styles.iaRecWhyTxt}>{r}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.iaRecProba}>
                  <Text style={styles.iaRecProbaLabel}>Probabilité de conversion</Text>
                  <Text style={styles.iaRecProbaVal}>{proba}%</Text>
                </View>
                <View style={styles.iaRecProbaTrack}>
                  <View style={[styles.iaRecProbaFill, { width: `${proba}%` as any }]} />
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity style={[styles.iaRecBtn, { flex: 1, backgroundColor: "#68d391" }]} onPress={() => callProspect(rec)}>
                    <Text style={[styles.iaRecBtnTxt, { color: "#1a202c" }]}>📞 Appeler maintenant</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.iaRecBtn, { paddingHorizontal: 14 }]} onPress={() => openProspect(rec)}>
                    <Text style={styles.iaRecBtnTxt}>Fiche →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })()}

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
          <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)}><Text style={styles.fabTxt}>+</Text></TouchableOpacity>
        </View>
      )}

      {/* ── CAMPAGNES ── */}
      {tab === "campagnes" && (
        <View style={{ flex: 1 }}>
          <ScrollView style={[styles.container, { backgroundColor: "#f8fafc" }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a5c6e" />}>
            {/* Header enrichi */}
            <View style={[styles.header, { backgroundColor: "#1a5c6e", paddingBottom: 16 }]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View>
                  <Text style={styles.headerTitle}>Campagnes</Text>
                  <Text style={styles.headerSub}>{campagnes.length} campagnes • {campagnes.filter(c => c.statut === "En cours" || c.statut === "Actif").length} actives</Text>
                </View>
                <TouchableOpacity onPress={() => setShowAddCampagne(true)} style={styles.headerAddBtn}>
                  <Text style={styles.headerAddTxt}>+ Nouvelle</Text>
                </TouchableOpacity>
              </View>
              {(() => {
                const totalP = campagnes.reduce((s, c) => s + c.nombre_prospects, 0);
                const totalC = campagnes.reduce((s, c) => s + c.tres_chaudes, 0);
                const pctQ = totalP > 0 ? Math.round((totalC / totalP) * 100) : 0;
                const scoreMoy = campagnes.length > 0 ? (campagnes.reduce((s, c) => s + c.score, 0) / campagnes.length).toFixed(1) : "—";
                return (
                  <View style={styles.campKpiRow}>
                    <View style={styles.campKpi}><Text style={[styles.campKpiValue, { fontSize: 24 }]}>{totalP}</Text><Text style={styles.campKpiLabel}>Prospects</Text></View>
                    <View style={styles.campKpiDivider} />
                    <View style={styles.campKpi}><Text style={[styles.campKpiValue, { color: "#fbd38d", fontSize: 24 }]}>{pctQ}%</Text><Text style={styles.campKpiLabel}>Qualifiés</Text></View>
                    <View style={styles.campKpiDivider} />
                    <View style={styles.campKpi}><Text style={[styles.campKpiValue, { color: "#f6ad55", fontSize: 24 }]}>{totalC}</Text><Text style={styles.campKpiLabel}>Chauds</Text></View>
                    <View style={styles.campKpiDivider} />
                    <View style={styles.campKpi}><Text style={[styles.campKpiValue, { color: "#68d391", fontSize: 24 }]}>{scoreMoy}</Text><Text style={styles.campKpiLabel}>Score IA</Text></View>
                  </View>
                );
              })()}
            </View>

            {(() => {
              const topScore = Math.max(...campagnes.map(c => c.score), 0);
              return campagnes.map(c => {
              const pct = c.nombre_prospects > 0 ? Math.round((c.tres_chaudes / c.nombre_prospects) * 100) : 0;
              const badgeColor = CAMP_COLORS[c.statut] ?? "#a0aec0";
              const isTop = c.score === topScore && campagnes.length > 1;
              const barColor = pct >= 70 ? "#38a169" : pct >= 40 ? "#f6ad55" : "#fc8181";
              const scoreColor = c.score >= 9 ? "#38a169" : c.score >= 7 ? "#4a90d9" : "#f6ad55";
              const scoreLabel = c.score >= 9 ? "Excellent" : c.score >= 7 ? "Bon" : "Moyen";
              return (
                <TouchableOpacity key={c.id} style={[styles.campCard, isTop && { borderColor: "#f6ad55", borderWidth: 1.5 }]} activeOpacity={0.85}>
                  {isTop && (
                    <View style={styles.topBadge}><Text style={styles.topBadgeTxt}>🏆 Recommandée</Text></View>
                  )}
                  <View style={styles.campTop}>
                    <Text style={styles.campNom} numberOfLines={1}>{c.nom}</Text>
                    <TouchableOpacity onPress={() => showStatutCampagnePicker(c)} style={[styles.statutBadge, { backgroundColor: badgeColor + "20" }]}>
                      <Text style={[styles.statutText, { color: badgeColor }]}>{CAMP_EMOJI[c.statut] ?? ""} {c.statut} ✎</Text>
                    </TouchableOpacity>
                  </View>
                  {c.perimetre ? <Text style={styles.campPerim}>{c.perimetre}</Text> : null}

                  {/* Barre sémantique avec % grand */}
                  {c.nombre_prospects > 0 && (
                    <View style={{ marginBottom: 10 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <Text style={{ fontSize: 10, color: "#718096" }}>Indice d'intérêt</Text>
                        <Text style={{ fontSize: 22, fontWeight: "900", color: barColor }}>{pct}%</Text>
                      </View>
                      <View style={styles.campProgressTrack}>
                        <View style={[styles.campProgressFill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
                      </View>
                    </View>
                  )}

                  {/* Stats ligne */}
                  <View style={styles.campStatsLine}>
                    <Text style={styles.campStatItem}>👥 {c.nombre_prospects}</Text>
                    <Text style={styles.campStatSep}>·</Text>
                    <Text style={styles.campStatItem}>🔥 {c.tres_chaudes}</Text>
                    <Text style={styles.campStatSep}>·</Text>
                    <Text style={[styles.campStatItem, { color: barColor }]}>🎯 {pct}%</Text>
                  </View>

                  {/* Score IA badge + jours */}
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                    <View style={[styles.scoreIABadge, { backgroundColor: scoreColor + "15", borderColor: scoreColor + "40" }]}>
                      <Text style={[styles.scoreIATxt, { color: scoreColor }]}>🤖 {c.score}/10 · {scoreLabel}</Text>
                    </View>
                    {c.jours_restants > 0 && <Text style={styles.campJours}>⏳ {c.jours_restants}j</Text>}
                  </View>
                </TouchableOpacity>
              );
            });
            })()}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      )}

      {/* ── AGENDA ── */}
      {tab === "agenda" && (
        <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a6b7e" />}>
          <View style={[styles.header, { backgroundColor: "#744210" }]}>
            <Text style={styles.headerTitle}>Agenda</Text>
            <Text style={styles.headerSub}>{agendaProspects.length} prospect{agendaProspects.length !== 1 ? "s" : ""} à relancer</Text>
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
        {([["dashboard", "📊", "Dashboard", 0], ["prospects", "👥", "Prospects", 0], ["campagnes", "📋", "Campagnes", 0], ["agenda", "🗓", "Agenda", agendaProspects.length]] as const).map(([key, icon, label, badge]) => (
          <TouchableOpacity key={key} style={styles.tabItem} onPress={() => setTab(key as any)}>
            <View style={{ position: "relative" }}>
              <Text style={styles.tabIcon}>{icon}</Text>
              {badge > 0 && <View style={styles.badgeDot}><Text style={styles.badgeDotTxt}>{badge}</Text></View>}
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
                <Text style={styles.modalNom} numberOfLines={2}>{selected?.nom}</Text>
                <Text style={styles.modalSeg}>{selected?.segment}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeBtn}><Text style={styles.closeTxt}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>

              {/* Pipeline */}
              {selected && <PipelineBar statut={selected.statut} onPress={(s) => updateProspectStatut(selected.id, s)} />}

              {/* Niveau + Score */}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  style={[styles.niveauCard, { backgroundColor: (NIVEAU_COLORS[selected?.niveau ?? ""] ?? "#a0aec0") + "18", flex: 1 }]}
                  onPress={() => selected && showNiveauPicker(selected)}
                >
                  <Text style={styles.niveauCardLabel}>CHALEUR ✎</Text>
                  <Text style={[styles.niveauCardValue, { color: NIVEAU_COLORS[selected?.niveau ?? ""] ?? "#a0aec0" }]}>{selected?.niveau}</Text>
                </TouchableOpacity>
                <View style={[styles.niveauCard, { backgroundColor: "#f0f9ff", flex: 1 }]}>
                  <Text style={styles.niveauCardLabel}>SCORE BANT</Text>
                  {selected && (() => {
                    const color = selected.score_bant >= 8 ? "#38a169" : selected.score_bant >= 5 ? "#f6ad55" : "#fc8181";
                    return (
                      <View>
                        <Text style={[styles.niveauCardValue, { color }]}>{selected.score_bant}<Text style={{ fontSize: 14, color: "#a0aec0" }}>/10</Text></Text>
                        <View style={styles.gaugeTrack}><View style={[styles.gaugeFill, { width: `${(selected.score_bant / 10) * 100}%` as any, backgroundColor: color }]} /></View>
                      </View>
                    );
                  })()}
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actionsRow}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#ebf8ff" }]} onPress={() => selected && callProspect(selected)}>
                  <Text style={styles.actionIcon}>📞</Text>
                  <Text style={[styles.actionTxt, { color: "#2b6cb0" }]}>Appeler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#f0fff4" }]} onPress={() => selected && emailProspect(selected.email, selected.nom)}>
                  <Text style={styles.actionIcon}>✉️</Text>
                  <Text style={[styles.actionTxt, { color: "#276749" }]}>Email</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#fff5f5" }]} onPress={() => selected && showNiveauPicker(selected)}>
                  <Text style={styles.actionIcon}>🌡</Text>
                  <Text style={[styles.actionTxt, { color: "#c53030" }]}>Chaleur</Text>
                </TouchableOpacity>
              </View>

              {/* Téléphone actionnable */}
              {editTelephone ? (
                <TouchableOpacity style={styles.telBtn} onPress={() => selected && callProspect(selected)}>
                  <Text style={styles.telBtnIcon}>📞</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.telBtnNum}>{editTelephone}</Text>
                    <Text style={styles.telBtnSub}>Appuyer pour appeler</Text>
                  </View>
                  <Text style={{ color: "#fff", fontSize: 18 }}>›</Text>
                </TouchableOpacity>
              ) : null}

              {/* Dernière interaction */}
              {editInteraction ? (
                <View style={styles.interactionBlock}>
                  <Text style={styles.blockTitle}>DERNIÈRE INTERACTION</Text>
                  <Text style={styles.interactionTxt}>⏱ {editInteraction}</Text>
                </View>
              ) : null}

              {/* Coordonnées */}
              <View style={styles.coordBlock}>
                <Text style={styles.blockTitle}>COORDONNÉES</Text>
                {selected?.email ? (
                  <TouchableOpacity onPress={() => selected && emailProspect(selected.email, selected.nom)} style={styles.coordRow}>
                    <Text style={styles.coordLabel}>Email</Text>
                    <Text style={[styles.coordValue, { color: "#2b6cb0" }]}>{selected.email} →</Text>
                  </TouchableOpacity>
                ) : null}
                <View style={styles.coordRow}>
                  <Text style={styles.coordLabel}>Téléphone</Text>
                  <TextInput style={styles.coordInput} value={editTelephone} onChangeText={setEditTelephone} placeholder="+33 1 XX XX XX XX" placeholderTextColor="#c0cfe0" keyboardType="phone-pad" />
                </View>
                <View style={styles.coordRow}>
                  <Text style={styles.coordLabel}>Contact</Text>
                  <TextInput style={styles.coordInput} value={editContact} onChangeText={setEditContact} placeholder="Marie Dupont" placeholderTextColor="#c0cfe0" />
                </View>
                <View style={styles.coordRow}>
                  <Text style={styles.coordLabel}>Fonction</Text>
                  <TextInput style={styles.coordInput} value={editFonction} onChangeText={setEditFonction} placeholder="Resp. Admissions" placeholderTextColor="#c0cfe0" />
                </View>
                <View style={styles.coordRow}>
                  <Text style={styles.coordLabel}>Valeur €</Text>
                  <TextInput style={styles.coordInput} value={editValeur} onChangeText={setEditValeur} placeholder="ex : 45 000 €" placeholderTextColor="#c0cfe0" />
                </View>
                <View style={[styles.coordRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.coordLabel}>Dernier contact</Text>
                  <TextInput style={styles.coordInput} value={editInteraction} onChangeText={setEditInteraction} placeholder="ex : Hier à 15h" placeholderTextColor="#c0cfe0" />
                </View>
              </View>

              {/* Prochaine relance colorée */}
              {(() => {
                const rs = getRelanceStatus(editRelance);
                return (
                  <View style={[styles.relanceBlock, { backgroundColor: rs.bg, borderColor: rs.border }]}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={styles.blockTitle}>PROCHAINE RELANCE</Text>
                      {rs.label ? <Text style={{ fontSize: 11, color: rs.color, fontWeight: "700" }}>{rs.label}</Text> : null}
                    </View>
                    <TextInput style={[styles.relanceInput, editRelance ? { color: rs.color, fontWeight: "700" } : {}]} value={editRelance} onChangeText={setEditRelance} placeholder="ex : 24/06/2026" placeholderTextColor="#c0cfe0" />
                  </View>
                );
              })()}

              {/* Notes */}
              <View style={styles.notesWrap}>
                <Text style={styles.blockTitle}>NOTES DE PROSPECTION</Text>
                <TextInput style={styles.notesInput} value={editNotes} onChangeText={setEditNotes} placeholder={"Décideur identifié\nBudget\nObjections\nProchaine étape..."} placeholderTextColor="#c0cfe0" multiline numberOfLines={7} textAlignVertical="top" />
              </View>

              {/* Save */}
              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={saveProspect} disabled={saving}>
                <Text style={styles.saveTxt}>{saving ? "Sauvegarde..." : "💾  Enregistrer la fiche"}</Text>
              </TouchableOpacity>

              {/* Share */}
              <TouchableOpacity style={styles.shareBtn} onPress={() => selected && shareProspect(selected)}>
                <Text style={styles.shareTxt}>📤  Partager la fiche</Text>
              </TouchableOpacity>

              {/* Delete */}
              <TouchableOpacity style={styles.deleteBtn} onPress={() => selected && deleteProspect(selected.id)}>
                <Text style={styles.deleteTxt}>🗑  Supprimer ce prospect</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── NOUVELLE CAMPAGNE ── */}
      <Modal visible={showAddCampagne} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <SafeAreaView style={styles.modal}>
            <View style={[styles.modalHeader, { backgroundColor: "#1a5c6e" }]}>
              <Text style={styles.modalNom}>Nouvelle campagne</Text>
              <TouchableOpacity onPress={() => setShowAddCampagne(false)} style={styles.closeBtn}><Text style={styles.closeTxt}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
              <View><Text style={styles.inputLabel}>Nom de la campagne *</Text><TextInput style={styles.input} value={newCampNom} onChangeText={setNewCampNom} placeholder="Ex : IDF Printemps 2027" placeholderTextColor="#a0aec0" /></View>
              <View><Text style={styles.inputLabel}>Périmètre géographique</Text><TextInput style={styles.input} value={newCampPerim} onChangeText={setNewCampPerim} placeholder="Ex : Paris · Lyon · Bordeaux" placeholderTextColor="#a0aec0" /></View>
              <View><Text style={styles.inputLabel}>Jours restants</Text><TextInput style={styles.input} value={newCampJours} onChangeText={setNewCampJours} placeholder="Ex : 30" placeholderTextColor="#a0aec0" keyboardType="number-pad" /></View>
              <TouchableOpacity style={[styles.createBtn, { backgroundColor: "#1a5c6e" }]} onPress={createCampagne}><Text style={styles.createTxt}>Créer la campagne</Text></TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── NOUVEAU PROSPECT ── */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <SafeAreaView style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalNom}>Nouveau prospect</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)} style={styles.closeBtn}><Text style={styles.closeTxt}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
              <View><Text style={styles.inputLabel}>Nom de l'établissement *</Text><TextInput style={styles.input} value={newNom} onChangeText={setNewNom} placeholder="Ex : EM Lyon" placeholderTextColor="#a0aec0" /></View>
              <View><Text style={styles.inputLabel}>Segment</Text><TextInput style={styles.input} value={newSegment} onChangeText={setNewSegment} placeholder="Ex : Commerce, Santé..." placeholderTextColor="#a0aec0" /></View>
              <View><Text style={styles.inputLabel}>Email</Text><TextInput style={styles.input} value={newEmail} onChangeText={setNewEmail} placeholder="contact@ecole.fr" placeholderTextColor="#a0aec0" keyboardType="email-address" autoCapitalize="none" /></View>
              <TouchableOpacity style={styles.createBtn} onPress={createProspect}><Text style={styles.createTxt}>Créer le prospect</Text></TouchableOpacity>
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
  headerGreeting: { fontSize: 22, fontWeight: "800", color: "#fff" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "rgba(255,255,255,0.85)", marginTop: 2 },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", padding: 12, gap: 8 },
  kpiCard: { flex: 1, minWidth: "45%", backgroundColor: "#fff", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#e2e8f0" },
  kpiValue: { fontSize: 26, fontWeight: "800" },
  kpiLabel: { fontSize: 11, color: "#718096", marginTop: 2 },
  kpiSub: { fontSize: 10, color: "#a0aec0", marginTop: 4, fontWeight: "500" },
  iaRecWhy: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 10, padding: 12, marginBottom: 14, marginTop: 4 },
  iaRecWhyTitle: { fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: "700", letterSpacing: 0.6, marginBottom: 8 },
  iaRecWhyRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 5 },
  iaRecWhyCheck: { fontSize: 12, color: "#68d391", fontWeight: "800", lineHeight: 17 },
  iaRecWhyTxt: { fontSize: 12, color: "rgba(255,255,255,0.85)", flex: 1, lineHeight: 17 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#1a202c", marginHorizontal: 16, marginBottom: 8, marginTop: 4 },
  iaRec: { marginHorizontal: 12, marginTop: 4, marginBottom: 4, backgroundColor: "#0d4a5a", borderRadius: 14, padding: 16, shadowColor: "#1a6b7e", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  iaRecTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  iaRecLabel: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.6)", letterSpacing: 0.8 },
  iaRecPriority: { backgroundColor: "#f6ad55", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  iaRecPriorityTxt: { fontSize: 9, fontWeight: "800", color: "#744210" },
  iaRecNom: { fontSize: 20, fontWeight: "900", color: "#fff", marginBottom: 2 },
  iaRecSub: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 12 },
  iaRecProba: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  iaRecProbaLabel: { fontSize: 11, color: "rgba(255,255,255,0.7)" },
  iaRecProbaVal: { fontSize: 18, fontWeight: "900", color: "#68d391" },
  iaRecProbaTrack: { height: 6, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 3, overflow: "hidden", marginBottom: 14 },
  iaRecProbaFill: { height: "100%", backgroundColor: "#68d391", borderRadius: 3 },
  iaRecBtn: { backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  iaRecBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },
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
  niveauBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: "flex-start", marginTop: 4 },
  niveauBadgeTxt: { fontSize: 10, fontWeight: "700" },
  statutBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  statutText: { fontSize: 10, fontWeight: "700" },
  campCard: { backgroundColor: "#fff", marginHorizontal: 12, marginBottom: 10, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#edf2f7", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  campTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  campNom: { fontSize: 15, fontWeight: "800", color: "#1a202c", flex: 1, marginRight: 8 },
  campPerim: { fontSize: 11, color: "#718096", marginBottom: 8 },
  campProgressTrack: { height: 6, backgroundColor: "#edf2f7", borderRadius: 3, overflow: "hidden" },
  campProgressFill: { height: "100%", borderRadius: 3 },
  campStatsLine: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4, marginTop: 4 },
  campStatItem: { fontSize: 12, color: "#4a5568", fontWeight: "600" },
  campStatSep: { fontSize: 12, color: "#cbd5e0" },
  campJours: { fontSize: 11, color: "#b7791f", backgroundColor: "#fffbeb", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: "#fde68a" },
  scoreIABadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  scoreIATxt: { fontSize: 12, fontWeight: "800" },
  campStats: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  campStat: { fontSize: 11, color: "#4a5568", backgroundColor: "#f8fafc", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: "#edf2f7" },
  headerAddBtn: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 4 },
  headerAddTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },
  topBadge: { backgroundColor: "#fffbeb", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start", marginBottom: 8, borderWidth: 1, borderColor: "#f6ad55" },
  topBadgeTxt: { fontSize: 11, fontWeight: "700", color: "#b7791f" },
  campKpiRow: { flexDirection: "row", marginTop: 16, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 12, padding: 12 },
  campKpi: { flex: 1, alignItems: "center" },
  campKpiValue: { fontSize: 18, fontWeight: "800", color: "#fff" },
  campKpiLabel: { fontSize: 9, color: "rgba(255,255,255,0.65)", marginTop: 2 },
  campKpiDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)", marginHorizontal: 2 },
  emptyState: { alignItems: "center", paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTxt: { fontSize: 16, color: "#718096" },
  fab: { position: "absolute", bottom: 20, right: 20, backgroundColor: "#1a6b7e", width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.22, shadowRadius: 6, elevation: 5 },
  fabTxt: { color: "#fff", fontSize: 28, lineHeight: 32 },
  tabBar: { flexDirection: "row", backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 8, position: "relative" },
  tabIcon: { fontSize: 20 },
  tabLabel: { fontSize: 10, color: "#a0aec0", marginTop: 2 },
  tabLabelActive: { color: "#1a6b7e", fontWeight: "700" },
  tabIndicator: { position: "absolute", top: 0, left: "25%", right: "25%", height: 2, backgroundColor: "#1a6b7e", borderRadius: 1 },
  badgeDot: { position: "absolute", top: -4, right: -8, backgroundColor: "#e53e3e", borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  badgeDotTxt: { color: "#fff", fontSize: 9, fontWeight: "800" },
  modal: { flex: 1, backgroundColor: "#f7f8fa" },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#1a6b7e", padding: 20, paddingTop: 28, paddingBottom: 20 },
  modalNom: { fontSize: 18, fontWeight: "800", color: "#fff", flexShrink: 1, flexWrap: "wrap" },
  modalSeg: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 4 },
  closeBtn: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20, width: 32, height: 32, alignItems: "center", justifyContent: "center", marginLeft: 12 },
  closeTxt: { color: "#fff", fontSize: 14, fontWeight: "700" },
  pipelineWrap: { backgroundColor: "#fff", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#e2e8f0" },
  pipelineTitle: { fontSize: 10, color: "#a0aec0", fontWeight: "700", letterSpacing: 0.8, marginBottom: 14 },
  pipelineDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#f0f4f8", borderWidth: 2, borderColor: "#e2e8f0", alignItems: "center", justifyContent: "center" },
  pipelineDotDone: { backgroundColor: "#1a6b7e", borderColor: "#1a6b7e" },
  pipelineDotActive: { backgroundColor: "#1a6b7e", borderColor: "#fff", shadowColor: "#1a6b7e", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 4 },
  pipelineLabel: { fontSize: 9, color: "#a0aec0", textAlign: "center", marginTop: 5 },
  pipelineLabelActive: { color: "#1a6b7e", fontWeight: "700" },
  niveauCard: { borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#e2e8f0" },
  niveauCardLabel: { fontSize: 9, color: "#a0aec0", fontWeight: "700", letterSpacing: 0.6, marginBottom: 4 },
  niveauCardValue: { fontSize: 16, fontWeight: "800" },
  gaugeTrack: { height: 6, backgroundColor: "#e2e8f0", borderRadius: 3, overflow: "hidden", marginTop: 6 },
  gaugeFill: { height: "100%", borderRadius: 3 },
  actionsRow: { flexDirection: "row", gap: 8 },
  actionBtn: { flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 12, gap: 4 },
  actionIcon: { fontSize: 22 },
  actionTxt: { fontSize: 11, fontWeight: "700" },
  coordBlock: { backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4, borderWidth: 1, borderColor: "#e2e8f0" },
  blockTitle: { fontSize: 10, color: "#a0aec0", fontWeight: "700", letterSpacing: 0.8, marginBottom: 10 },
  coordRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f0f4f8" },
  coordLabel: { fontSize: 12, color: "#718096", width: 72, fontWeight: "600" },
  coordValue: { fontSize: 13, fontWeight: "600", flex: 1 },
  coordInput: { flex: 1, fontSize: 13, color: "#1a202c", padding: 0 },
  relanceBlock: { borderRadius: 12, padding: 14, borderWidth: 1 },
  relanceInput: { fontSize: 14, color: "#1a202c", marginTop: 6 },
  telBtn: { backgroundColor: "#38a169", borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  telBtnIcon: { fontSize: 22 },
  telBtnNum: { fontSize: 16, fontWeight: "800", color: "#fff" },
  telBtnSub: { fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  interactionBlock: { backgroundColor: "#ebf8ff", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#bee3f8" },
  interactionTxt: { fontSize: 13, color: "#2b6cb0", fontWeight: "600", marginTop: 6 },
  notesWrap: { backgroundColor: "#fff", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#e2e8f0" },
  notesInput: { fontSize: 14, color: "#1a202c", minHeight: 130, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, padding: 10, backgroundColor: "#f7f8fa", marginTop: 8, lineHeight: 20 },
  saveBtn: { backgroundColor: "#1a6b7e", borderRadius: 10, paddingVertical: 13, paddingHorizontal: 20, alignItems: "center" },
  saveTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },
  shareBtn: { backgroundColor: "#f0fff4", borderRadius: 10, padding: 13, borderWidth: 1, borderColor: "#9ae6b4", alignItems: "center" },
  shareTxt: { color: "#276749", fontWeight: "700", fontSize: 14 },
  deleteBtn: { backgroundColor: "#fff5f5", borderRadius: 10, padding: 13, borderWidth: 1, borderColor: "#feb2b2", alignItems: "center" },
  deleteTxt: { color: "#e53e3e", fontWeight: "700", fontSize: 14 },
  inputLabel: { fontSize: 12, color: "#718096", marginBottom: 6, fontWeight: "600" },
  input: { backgroundColor: "#fff", borderRadius: 10, padding: 14, borderWidth: 1, borderColor: "#e2e8f0", fontSize: 15, color: "#1a202c" },
  createBtn: { backgroundColor: "#1a6b7e", borderRadius: 10, padding: 16, alignItems: "center", marginTop: 8 },
  createTxt: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
