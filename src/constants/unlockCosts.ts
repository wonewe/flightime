export const INITIALLY_UNLOCKED_AIRPORTS = ['ICN', 'HND', 'BKK', 'SIN', 'HKG']
export const INITIALLY_UNLOCKED_AIRCRAFT = ['b737', 'a320']
export const MILEAGE_PER_MINUTE = 10
export const DAILY_CHECKIN_MILEAGE = 100

export const AIRPORT_UNLOCK_COST: Record<string, number> = {
  // 근거리 (Korea + Japan)
  GMP: 500, PUS: 500, CJU: 500, CJJ: 500,
  NRT: 500, KIX: 500, FUK: 500, CTS: 500, NGO: 500, OKA: 500,
  // 아시아
  TPE: 1000, PVG: 1000, PEK: 1000,
  KUL: 1000, MNL: 1000, SGN: 1000, HAN: 1000, DPS: 1000, DEL: 1000,
  // 장거리 (Middle East + Europe + Americas + Oceania)
  DXB: 2500, DOH: 2500, IST: 2500,
  LAX: 2500, JFK: 2500, SFO: 2500, ORD: 2500, SEA: 2500, HNL: 2500, YVR: 2500, GRU: 2500,
  CDG: 2500, LHR: 2500, FRA: 2500, FCO: 2500, BCN: 2500, AMS: 2500,
  SYD: 2500, MEL: 2500, AKL: 2500,
}

export const AIRCRAFT_UNLOCK_COST: Record<string, number> = {
  b787: 1500, a350: 2500, b777: 3500, a380: 5000,
}
