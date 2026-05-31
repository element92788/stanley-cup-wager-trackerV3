import { CONFIG, type TeamAbbr } from "@/lib/config";

export function TeamLogo({ team, size = 52 }: { team: TeamAbbr; size?: number }) {
  return (
    <img
      src={CONFIG.teams[team].logo}
      alt={`${CONFIG.teams[team].fullName} logo`}
      width={size}
      height={size}
      className="team-logo"
    />
  );
}
