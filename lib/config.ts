export const CONFIG = {
  appName: "Stanley Cup Wager Tracker",
  gameWinValue: 10,
  cupBonusValue: 100,
  // Official NHL schedule: Game 1 is Tuesday June 2, 2026 at 8 PM ET.
  firstGamePuckDrop: "2026-06-02T20:00:00-04:00",
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
  }
} as const;

export type TeamAbbr = keyof typeof CONFIG.teams;
