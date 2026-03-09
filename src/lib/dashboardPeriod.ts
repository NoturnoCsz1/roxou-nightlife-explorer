export type DashboardPeriod = "hoje" | "7d" | "30d" | "mes";

export function getPeriodRange(period: DashboardPeriod): Date {
  const now = new Date();
  switch (period) {
    case "hoje": {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "7d": {
      const d = new Date();
      d.setDate(now.getDate() - 7);
      return d;
    }
    case "30d": {
      const d = new Date();
      d.setDate(now.getDate() - 30);
      return d;
    }
    case "mes": {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }
}

export function getPeriodLabel(period: DashboardPeriod): string {
  switch (period) {
    case "hoje": return "Hoje";
    case "7d": return "7 dias";
    case "30d": return "30 dias";
    case "mes": return "Este mês";
  }
}

export function getPeriodDayCount(period: DashboardPeriod): number {
  const now = new Date();
  switch (period) {
    case "hoje": return 1;
    case "7d": return 7;
    case "30d": return 30;
    case "mes": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
  }
}
