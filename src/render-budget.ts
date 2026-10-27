export function crowdDetailBudget(mobile: boolean, quality: string) {
  const low = quality === "0.5", high = quality === "1";
  return { count: mobile ? low ? 2 : high ? 6 : 4 : low ? 4 : high ? 12 : 8, radius: low ? 16 : high ? 30 : 24 };
}
