export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

const WORD_BANK = [
  "apple", "bridge", "candle", "dancer", "engine", "forest", "garden",
  "harbor", "island", "jungle", "kettle", "lantern", "marble", "needle",
  "orange", "pillow", "quartz", "ribbon", "silver", "temple", "umbrella",
  "valley", "window", "yellow", "zipper", "anchor", "basket", "castle",
  "desert", "eagle", "falcon", "glacier", "hammer", "igloo", "jasmine",
];

export function getRandomWords(count: number): string[] {
  const shuffled = [...WORD_BANK].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
