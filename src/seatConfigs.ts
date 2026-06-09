export interface SeatConfig {
  rows: number
  columns: string[]
  aisleAfter: number[]   // aisle gap after column index
  exitRows: number[]
  occupancyRate: number
}

export const SEAT_CONFIGS: Record<string, SeatConfig> = {
  // Narrow-body 3-3
  b737: {
    rows: 30,
    columns: ['A', 'B', 'C', 'D', 'E', 'F'],
    aisleAfter: [2],
    exitRows: [10, 25],
    occupancyRate: 0.55,
  },
  a320: {
    rows: 30,
    columns: ['A', 'B', 'C', 'D', 'E', 'F'],
    aisleAfter: [2],
    exitRows: [11, 26],
    occupancyRate: 0.55,
  },
  // Wide-body 3-4-3
  b777: {
    rows: 40,
    columns: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K'],
    aisleAfter: [2, 6],
    exitRows: [14, 30],
    occupancyRate: 0.6,
  },
  // Wide-body 3-3-3
  a350: {
    rows: 35,
    columns: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J'],
    aisleAfter: [2, 5],
    exitRows: [12, 28],
    occupancyRate: 0.55,
  },
  b787: {
    rows: 35,
    columns: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J'],
    aisleAfter: [2, 5],
    exitRows: [13, 27],
    occupancyRate: 0.55,
  },
  // Super 3-4-3
  a380: {
    rows: 45,
    columns: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K'],
    aisleAfter: [2, 6],
    exitRows: [16, 33],
    occupancyRate: 0.65,
  },
}
