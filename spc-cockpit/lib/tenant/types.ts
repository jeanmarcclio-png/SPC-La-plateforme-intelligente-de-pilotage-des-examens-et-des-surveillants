export interface TenantConfig {
  secteur:   string;
  nom:       string;
  emoji:     string;
  couleur:   string;

  vocabulaire: {
    mission:    string; // "Campagne" | "Mission" | "Chantier" | "Dossier"
    ressource:  string; // "Prospect" | "Client" | "Contact"
    pipeline:   string; // "Pipeline" | "Affaires" | "Leads"
    livrable:   string; // "Livrable" | "Rapport" | "Devis"
  };

  segments:   string[];
  clusters:   string[];
  segment_ca: Record<string, number>;

  scoring: {
    labels:     [string, string, string, string]; // chaud → froid
    dimensions: [string, string, string, string]; // BANT ou autre
  };

  interlocuteurs: string[];
  risques:        string[];
  points_forts:   string[];

  email: {
    expediteur: string;
    j0_sujet:   string;
    j7_sujet:   string;
    j15_sujet:  string;
  };
}
