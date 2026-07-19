export type CounterType = "number" | "toggle" | "calculated";

export interface BaseCounter {
  key: string;
  name: string;
  type: CounterType;
}

export interface NumberCounter extends BaseCounter {
  type: "number";
  value: number;
  step: number;
}

export interface ToggleState {
  label: string;
  color: string;
}

export interface ToggleCounter extends BaseCounter {
  type: "toggle";
  states: ToggleState[];
  index: number;
}

export interface CalculatedCounter extends BaseCounter {
  type: "calculated";
  expression: string;
}

export type Counter = NumberCounter | ToggleCounter | CalculatedCounter;
