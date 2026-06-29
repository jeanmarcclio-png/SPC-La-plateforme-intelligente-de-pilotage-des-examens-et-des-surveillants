export interface SectorKPI {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  subtext?: string;
}

export interface SectorAIAlert {
  level: "urgent" | "warning" | "info";
  icon: string;
  text: string;
}

export interface SectorPlanningItem {
  date: string;
  nom: string;
  tag: string;
  urgent?: boolean;
}

export interface SectorLivrable {
  nom: string;
  description: string;
  icon: string;
}

export interface SectorPack {
  id: string;
  dashboard: {
    headline: string;
    subline: string;
    kpis: SectorKPI[];
    aiAlerts: SectorAIAlert[];
  };
  planning: {
    aiHint: string;
    items: SectorPlanningItem[];
  };
  livrables: SectorLivrable[];
  cockpit: {
    headline: string;
    subline: string;
    forecast: string;
    actions: string[];
  };
}
