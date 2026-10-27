import { quests } from "./quests";
import { spots, courses } from "./spots";
import { races } from "./races";
import { landmarks } from "./city-profile";
import { activities } from "./world";
export type DestinationKind = "quest" | "park" | "race" | "course" | "landmark" | "event";
export type Destination = { id: string; kind: DestinationKind; key: string; label: string; x: number; z: number };
export const destinations: Destination[] = [
  ...quests.map(q => ({ id: `quest:${q.id}`, kind: "quest" as const, key: q.id, label: `${q.title} · ${q.giver}`, ...q.anchor })),
  ...spots.map(s => ({ id: `park:${s.id}`, kind: "park" as const, key: s.id, label: s.name, x: courses.find(c => c.spot.id === s.id)!.start.x, z: courses.find(c => c.spot.id === s.id)!.start.z })),
  ...races.map(r => ({ id: `race:${r.id}`, kind: "race" as const, key: r.id, label: r.name, ...r.start })),
  ...courses.map(c => ({ id: `course:${c.id}`, kind: "course" as const, key: c.id, label: c.name, ...c.start })),
  ...landmarks.map(l => ({ id: `landmark:${l.id}`, kind: "landmark" as const, key: l.id, label: l.name, ...l.spawn })),
  ...activities.map((a, i) => ({ id: `event:${i}`, kind: "event" as const, key: String(i), label: `${a.district} · ${a.kind}`, x: a.x, z: a.z })),
];
export function destinationFor(button: HTMLElement): Destination | undefined {
  return destinations.find(d => button.dataset[d.kind] === d.key);
}
