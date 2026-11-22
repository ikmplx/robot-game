import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export type XYZ = readonly [number, number, number];
type Point = readonly [number, number];

export type Arena = {
  x: number;
  halfWidth: number;
  front: number;
  back: number;
  top: number;
  checkpoint: Vector3;
  enemies: readonly Point[];
  exitMessage: string;
};

export type CrateCourse = {
  x: number;
  z: number;
  top: number;
  halfWidth: number;
  front: number;
  back: number;
  restart: Vector3;
  obstacles: readonly { x: number; z: number; width: number; depth: number }[];
  crates: readonly { home: Point; target: Point }[];
  exitMessage: string;
};

export const room = { halfWidth: 28, front: -13, back: 294, height: 30 };
export const spawn = new Vector3(0, 0, 0.25);
export const hazard = { front: 6, back: 25 };

export const arenas: Arena[] = [
  {
    x: 0, halfWidth: 27.65, front: 25, back: 45, top: 0,
    checkpoint: new Vector3(0, 0, 27.8),
    enemies: [[0, 33], [-5.2, 37.3]],
    exitMessage: "Проход к складу открыт",
  },
  {
    x: -7, halfWidth: 12, front: 81, back: 91, top: 10.8,
    checkpoint: new Vector3(-7, 10.8, 78.2),
    enemies: [[-6.3, 84.2], [-12.5, 86.2], [-2.4, 88.2]],
    exitMessage: "Первый трос доступен",
  },
  {
    x: 14, halfWidth: 11, front: 143.7, back: 157, top: 18,
    checkpoint: new Vector3(17.5, 18, 144.5),
    enemies: [[16.9, 148.4], [11.5, 151.7], [17.8, 154]],
    exitMessage: "Проход к верхнему складу открыт",
  },
];

export const crateCourses: CrateCourse[] = [
  {
    x: -7, z: 60, top: 0, halfWidth: 11, front: 51.5, back: 69,
    restart: new Vector3(-7, 0, 52.5),
    obstacles: [
      { x: 0, z: -0.05, width: 2.7, depth: 5.5 },
      { x: -7.3, z: 0.65, width: 7.4, depth: 1 },
      { x: 7.4, z: -0.7, width: 7.2, depth: 1 },
    ],
    crates: [
      { home: [-5.8, -4.65], target: [-6.6, 4.6] },
      { home: [5.8, -4.65], target: [7, 6.35] },
      { home: [-7, -2], target: [5.7, 4.3] },
      { home: [6.85, 1.55], target: [-6.7, 7] },
    ],
    exitMessage: "Путь к первому лифту открыт",
  },
  {
    x: 14, z: 171, top: 18, halfWidth: 11, front: 162.5, back: 183,
    restart: new Vector3(14, 18, 163.55),
    obstacles: [
      { x: 0, z: -0.2, width: 4.4, depth: 6 },
      { x: -7.8, z: -0.3, width: 6.4, depth: 1 },
      { x: 7.85, z: 1.3, width: 6.3, depth: 1 },
    ],
    crates: [
      { home: [-6.6, -5.65], target: [6.9, 6.3] },
      { home: [6.2, -5.5], target: [-6.9, 6.9] },
      { home: [0, -6.15], target: [0, 7.6] },
    ],
    exitMessage: "Второй трос доступен",
  },
];

export const lifts = [
  { x: -7, z: 75, lower: 0, upper: 10.8, width: 4, depth: 4, arrival: arenas[1].checkpoint },
  { x: 16, z: 117, lower: 8.8, upper: 18, width: 4, depth: 4, arrival: new Vector3(16, 18, 120.6) },
];

export const ziplines = [
  { start: new Vector3(-10, 10.8, 94), end: new Vector3(12, 8.8, 107) },
  { start: new Vector3(10, 18, 188), end: new Vector3(-13, 15.4, 207.5) },
];

export const decks = [
  { name: "Lower shelf", x: -7, width: 24, front: 77, back: 99, top: 10.8 },
  { name: "Transfer table", x: 16, width: 16, front: 103, back: 115, top: 8.8 },
  { name: "Upper lift landing", x: 16, width: 18, front: 119, back: 128, top: 18 },
  { name: "Upper gallery", x: 14, width: 22, front: 143.7, back: 193, top: 18 },
  { name: "Door gallery", x: -15, width: 18, front: 203, back: 223, top: 15.4 },
];

export const jumpBlocks: readonly (readonly [x: number, top: number, z: number, size: number])[] = [
  [0.45, 0.84, 8.45, 2.55], [-0.55, 1.1, 12.65, 2.45], [0.8, 0.95, 16.9, 2.45], [1.55, 0.72, 21, 2.5],
  [16.5, 18.72, 130.35, 1.68], [14.1, 19.15, 133.2, 1.46], [15.95, 18.68, 136.2, 1.45],
  [18.25, 19.45, 139.15, 1.38], [16.1, 19, 142.4, 1.38],
];

export const gate = new Vector3(-15, 15.4, 216.5);

const mazeRows = [
  "###.###",
  "#..A#.#",
  "#.###.#",
  "#...B.#",
  "###.#.#",
  "#...#.#",
  "#.###.#",
  "#C....#",
  "##.##.#",
  "#..D..#",
  "###.###",
];
const mazeCell = 3.4;
const mazeFront = 226;
const mazeHalfWidth = mazeRows[0].length * mazeCell / 2;
export const maze = {
  rows: mazeRows, cell: mazeCell, front: mazeFront, back: mazeFront + mazeRows.length * mazeCell,
  x: gate.x, top: gate.y, halfWidth: mazeHalfWidth,
  checkpoint: new Vector3(gate.x, gate.y, 220.5),
};

export const bossArena = {
  front: 269, back: 285, halfWidth: mazeHalfWidth, x: gate.x, top: gate.y,
  checkpoint: new Vector3(gate.x, gate.y, 267.1),
  home: new Vector3(gate.x, gate.y, 278.2),
};
export const goal = new Vector3(gate.x, gate.y, 289);

export const coinSpots: readonly XYZ[] = [
  [0, 0, 2.2], [0.3, 0, 4.9],
  ...jumpBlocks.map(([x, y, z]): XYZ => [x, y, z]),
  [0, 0, 27.8], [0, 0, 31.2], [-2.5, 0, 38.2], [-5.3, 0, 42], [-7, 0, 46.6], [-7, 0, 50],
  [-7, 0, 53.55], [-7, 0, 67.5], [-7, 0, 71.8], [-7, 0, 75],
  [-7, 10.8, 78.6], [-7, 10.8, 82.7], [-8.7, 10.8, 90], [-10, 10.8, 93.4],
  [12, 8.8, 107], [13.7, 8.8, 110.25], [16, 8.8, 113.5], [16, 8.8, 117],
  [16, 18, 121], [16.2, 18, 124.2], [16.45, 18, 127.2],
  [17.5, 18, 145.1], [16.4, 18, 148.5], [14, 18, 154.5], [14, 18, 159.4],
  [14, 18, 162.9], [14, 18, 181.6], [12, 18, 185.2], [10, 18, 187.35],
  [-13, 15.4, 207.5], [-14.2, 15.4, 211], [-15, 15.4, 214.8], [-15, 15.4, 222.2],
  [-15, 15.4, 266.5], [-15, 15.4, 287.1],
];
