export interface OHLC {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Portfolio {
  cash: number;
  shares: number;
  equity: number;
  totalValue: number;
  avgCost: number;
}

export interface SimulationConfig {
  symbol: string;
  startDate: string;
  initialCash: number;
}

export enum SimulationStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  FINISHED = 'FINISHED',
}

export enum Speed {
  X1 = 1,
  X3 = 3,
  X5 = 5,
  X10 = 10,
}