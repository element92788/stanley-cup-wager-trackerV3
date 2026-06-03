export type TeamAbbr = "VGK" | "CAR";

export const CONFIG = {
  teams: {
    VGK: {
      abbr: "VGK",
      fullName: "Vegas Golden Knights",
      shortName: "Golden Knights",
      owner: "Brett",
      logo: "https://assets.nhle.com/logos/nhl/svg/VGK_light.svg"
    },
    CAR: {
      abbr: "CAR",
      fullName: "Carolina Hurricanes",
      shortName: "Hurricanes",
      owner: "Dad",
      logo: "https://assets.nhle.com/logos/nhl/svg/CAR_light.svg"
    }
  },
  gameWinValue: 10,
  cupBonusValue: 100,
  firstGamePuckDrop: "2026-06-02T20:00:00-04:00"
} as const;
