import { CONFIG, type TeamAbbr } from "@/lib/config";

export function TeamLogo({ team, size = 56 }: { team: TeamAbbr; size?: number }) {
  return (
    <img
      className="team-logo"
      src={CONFIG.teams[team].logo}
      alt={`${CONFIG.teams[team].fullName} logo`}
      width={size}
      height={size}
    />
  );
}
