import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from "react-native";
import { supabase } from "@/lib/supabase";

type Prospect = { id: string; nom: string; segment: string; score_bant: number; statut: string; niveau: string };

const STATUT_COLORS: Record<string, string> = {
  "Non contacté": "#a0aec0",
  "En cours": "#4a90d9",
  "RDV fixé": "#38a169",
  "Converti": "#1a6b7e",
};

export default function DashboardScreen() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ total: 0, tresChaudes: 0, scoreMoyen: 0, rdvFixes: 0 });

  async function load() {
    const { data } = await supabase
      .from("prospects")
      .select("id, nom, segment, score_bant, statut, niveau")
      .order("score_bant", { ascending: false })
      .limit(20);
    if (data) {
      setProspects(data);
      setStats({
        total: data.length,
        tresChaudes: data.filter((p) => p.niveau === "Très chaud").length,
        scoreMoyen: data.length > 0 ? Math.round((data.reduce((s, p) => s + p.score_bant, 0) / data.length) * 10) / 10 : 0,
        rdvFixes: data.filter((p) => p.statut === "RDV fixé" || p.statut === "Converti").length,
      });
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a6b7e" />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SPC Cockpit</Text>
        <Text style={styles.headerSub}>Tableau de bord</Text>
      </View>

      {/* KPIs */}
      <View style={styles.kpiGrid}>
        {[
          { label: "Prospects", value: stats.total, color: "#1a202c" },
          { label: "Très chaud", value: stats.tresChaudes, color: "#f6ad55" },
          { label: "Score BANT", value: stats.scoreMoyen, color: "#1a6b7e" },
          { label: "RDV / Conv.", value: stats.rdvFixes, color: "#38a169" },
        ].map((k) => (
          <View key={k.label} style={styles.kpiCard}>
            <Text style={[styles.kpiValue, { color: k.color }]}>{k.value}</Text>
            <Text style={styles.kpiLabel}>{k.label}</Text>
          </View>
        ))}
      </View>

      {/* Prospects list */}
      <Text style={styles.sectionTitle}>Top prospects</Text>
      {prospects.map((p) => (
        <View key={p.id} style={styles.prospectCard}>
          <View style={styles.prospectInfo}>
            <Text style={styles.prospectNom}>{p.nom}</Text>
            <Text style={styles.prospectSeg}>{p.segment}</Text>
          </View>
          <View style={styles.prospectRight}>
            <Text style={styles.prospectScore}>{p.score_bant}</Text>
            <View style={[styles.statutBadge, { backgroundColor: STATUT_COLORS[p.statut] + "20" }]}>
              <Text style={[styles.statutText, { color: STATUT_COLORS[p.statut] }]}>{p.statut}</Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
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
});
