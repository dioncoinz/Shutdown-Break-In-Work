import { createSupabaseDb } from "@/lib/supabase/db";
import styles from "./DailyReportSummary.module.css";

type RequestRow = {
  id: string;
  status: string | null;
};

type ResourceRow = {
  request_id: string;
  hours: number | string | null;
};

type Metric = {
  count: number;
  hours: number;
};

const COLOURS = {
  completed: "#1a9a62",
  inProgress: "#3478c6",
  ready: "#e1a43a",
  review: "#8a97a0",
  removed: "#e66628",
};

export async function DailyReportSummary({
  shutdownId,
  shutdownStartDate,
}: {
  shutdownId: string;
  shutdownStartDate: string | null;
}) {
  const data = await loadSummaryData(shutdownId, shutdownStartDate);
  const emergentHours = hoursByRequest(data.emergentResources);
  const removalHours = hoursByRequest(data.removalResources);
  const includedEmergent = data.emergent.filter((row) => row.status !== "REJECTED");
  const completedRows = includedEmergent.filter((row) => row.status === "COMPLETED");
  const inProgressRows = includedEmergent.filter((row) => row.status === "IN_PROGRESS");
  const readyRows = includedEmergent.filter((row) => row.status === "APPROVED");
  const reviewRows = includedEmergent.filter(
    (row) =>
      row.status !== "COMPLETED" &&
      row.status !== "IN_PROGRESS" &&
      row.status !== "APPROVED",
  );
  const removedRows = data.removals.filter((row) => row.status === "APPROVED");

  const total = metricFor(includedEmergent, emergentHours);
  const completed = metricFor(completedRows, emergentHours);
  const inProgress = metricFor(inProgressRows, emergentHours);
  const ready = metricFor(readyRows, emergentHours);
  const review = metricFor(reviewRows, emergentHours);
  const removed = metricFor(removedRows, removalHours);
  const completionRate = total.count ? Math.round((completed.count / total.count) * 100) : 0;
  const updatedTime = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Perth",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date());

  return (
    <section className={styles.body} aria-labelledby="daily-summary-title">
      <div className={styles.summaryHeader}>
        <div>
          <p className={styles.eyebrow}>Shutdown performance</p>
          <h2 id="daily-summary-title" className={styles.summaryTitle}>Daily executive snapshot</h2>
        </div>
        <div className={styles.summaryUpdated}>Data current at {updatedTime} AWST</div>
      </div>

      <div className={styles.kpiGrid} aria-label="Scope change headline metrics">
        <Kpi label="Total emergent requests" metric={total} accent="#17272b" hint="Rejected requests excluded" />
        <Kpi label="Completed" metric={completed} accent={COLOURS.completed} hint={`${completionRate}% of emergent requests`} />
        <Kpi
          label="Removed"
          metric={removed}
          accent={COLOURS.removed}
          hint={shutdownStartDate ? "Approved since shutdown start" : "Approved scope removals"}
        />
        <Kpi label="In progress" metric={inProgress} accent={COLOURS.inProgress} hint="Currently being executed" />
      </div>

      <div className={styles.visualGrid}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h3 className={styles.panelTitle}>Emergent work delivery</h3>
              <p className={styles.panelSubtitle}>Request count by current workflow position</p>
            </div>
            <span className={styles.percentBadge}>{completionRate}% complete</span>
          </div>

          <div className={styles.delivery}>
            <div className={styles.deliveryTrack} aria-label="Emergent request status distribution">
              <StatusSegment value={completed.count} total={total.count} colour={COLOURS.completed} />
              <StatusSegment value={inProgress.count} total={total.count} colour={COLOURS.inProgress} />
              <StatusSegment value={ready.count} total={total.count} colour={COLOURS.ready} />
              <StatusSegment value={review.count} total={total.count} colour={COLOURS.review} />
            </div>
            <div className={styles.legend}>
              <LegendItem label="Completed" value={completed.count} colour={COLOURS.completed} />
              <LegendItem label="In progress" value={inProgress.count} colour={COLOURS.inProgress} />
              <LegendItem label="Approved / ready" value={ready.count} colour={COLOURS.ready} />
              <LegendItem label="Under review" value={review.count} colour={COLOURS.review} />
            </div>
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h3 className={styles.panelTitle}>Hours by delivery status</h3>
              <p className={styles.panelSubtitle}>Planned emergent labour hours</p>
            </div>
          </div>
          <div className={styles.hoursSummary}>
            <HoursBar label="Completed" value={completed.hours} max={total.hours} colour={COLOURS.completed} />
            <HoursBar label="In progress" value={inProgress.hours} max={total.hours} colour={COLOURS.inProgress} />
            <HoursBar label="Ready" value={ready.hours} max={total.hours} colour={COLOURS.ready} />
            <HoursBar label="In review" value={review.hours} max={total.hours} colour={COLOURS.review} />
          </div>
        </div>
      </div>

    </section>
  );
}

async function loadSummaryData(shutdownId: string, shutdownStartDate: string | null) {
  const supabase = createSupabaseDb();
  let removalQuery = supabase
    .from("work_removal_requests")
    .select("id, status")
    .eq("shutdown_id", shutdownId);

  if (shutdownStartDate) {
    removalQuery = removalQuery.gte("created_at", `${shutdownStartDate}T00:00:00+08:00`);
  }

  const [emergent, emergentResources, removals, removalResources] = await Promise.all([
    supabase.from("break_in_requests").select("id, status").eq("shutdown_id", shutdownId),
    supabase.from("break_in_resources").select("request_id, hours"),
    removalQuery,
    supabase.from("work_removal_resources").select("request_id, hours"),
  ]);
  const error = emergent.error || emergentResources.error || removals.error || removalResources.error;
  if (error) throw new Error(error.message);

  return {
    emergent: (emergent.data ?? []) as RequestRow[],
    emergentResources: (emergentResources.data ?? []) as ResourceRow[],
    removals: (removals.data ?? []) as RequestRow[],
    removalResources: (removalResources.data ?? []) as ResourceRow[],
  };
}

function Kpi({ label, metric, accent, hint }: { label: string; metric: Metric; accent: string; hint: string }) {
  return (
    <article className={styles.kpi} style={{ "--accent": accent } as React.CSSProperties}>
      <div className={styles.kpiLabel}>{label}</div>
      <div className={styles.kpiValues}>
        <span className={styles.kpiCount}>{metric.count}</span>
        <span className={styles.kpiUnit}>requests</span>
        <span className={styles.kpiHours}>{formatHours(metric.hours)}h</span>
      </div>
      <div className={styles.kpiHint}>{hint}</div>
    </article>
  );
}

function StatusSegment({ value, total, colour }: { value: number; total: number; colour: string }) {
  if (!value || !total) return null;
  return <span className={styles.segment} style={{ width: `${(value / total) * 100}%`, background: colour }} />;
}

function LegendItem({ label, value, colour }: { label: string; value: number; colour: string }) {
  return (
    <div className={styles.legendItem}>
      <span className={styles.legendDot} style={{ background: colour }} />
      <span>{label}</span>
      <span className={styles.legendValue}>{value}</span>
    </div>
  );
}

function HoursBar({ label, value, max, colour }: { label: string; value: number; max: number; colour: string }) {
  return (
    <div className={styles.hoursRow}>
      <span>{label}</span>
      <span className={styles.hoursTrack}>
        <span
          className={styles.hoursFill}
          style={{ width: `${max ? Math.min(100, (value / max) * 100) : 0}%`, background: colour }}
        />
      </span>
      <span className={styles.hoursValue}>{formatHours(value)}h</span>
    </div>
  );
}

function hoursByRequest(rows: ResourceRow[]) {
  const result = new Map<string, number>();
  for (const row of rows) {
    result.set(row.request_id, (result.get(row.request_id) ?? 0) + (Number(row.hours) || 0));
  }
  return result;
}

function metricFor(rows: RequestRow[], hours: Map<string, number>): Metric {
  return {
    count: rows.length,
    hours: rows.reduce((sum, row) => sum + (hours.get(row.id) ?? 0), 0),
  };
}

function formatHours(value: number) {
  return new Intl.NumberFormat("en-AU", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(value);
}
