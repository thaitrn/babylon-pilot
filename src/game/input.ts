import type { Lane } from "./types";

export function laneFromClientX(clientX: number, width: number): Lane {
  const t = width <= 0 ? 0.5 : clientX / width;
  if (t < 1 / 3) return 0;
  if (t < 2 / 3) return 1;
  return 2;
}

export function clampLane(n: number): Lane {
  if (n <= 0) return 0;
  if (n >= 2) return 2;
  return n as Lane;
}

export function stepLane(current: Lane, dir: -1 | 1): Lane {
  return clampLane(current + dir);
}
