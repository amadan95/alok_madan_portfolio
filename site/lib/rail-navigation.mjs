/** Resolve one photograph step, including a partial scroll and a clamped final stop. */
export function nextRailOffset(offsets, maximum, current, direction) {
  const positions = offsets.map((offset) => Math.max(0, Math.min(offset, maximum)));
  return direction > 0
    ? positions.find((offset) => offset > current + 2) ?? positions.at(-1) ?? 0
    : [...positions].reverse().find((offset) => offset < current - 2) ?? 0;
}
