import { CONFIG } from "@/lib/config";
import type { TrackerData } from "@/lib/types";
import { TeamLogo } from "./TeamLogo";

export function SeriesTracker({ data }: { data: TrackerData }) {
  return (
    <section className="card">
      <div className="label">Stanley Cup Final series</div>
      <h2>
        <span className="gold">VGK {data.series.VGK}</span> - <span className="red">CAR {data.series.CAR}</span>
      </h2>

      <div className="series-logos">
        <TeamLogo team="VGK" size={64} />
        <span>vs</span>
        <TeamLogo team="CAR" size={64} />
      </div>

      {data.cupWinner ? (
        <p className="badge">{CONFIG.teams[data.cupWinner].fullName} win the Cup</p>
      ) : (
        <p className="small">First team to 4 Stanley Cup Final wins claims the $100 Cup bonus.</p>
      )}
    </section>
  );
}
