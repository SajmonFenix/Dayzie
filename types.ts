export interface InspirationData {
  motto: string;
  thought: string;
  motivation: string;
}

export enum LoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface HistoryItem extends InspirationData {
  date: string;
  id: string;
}