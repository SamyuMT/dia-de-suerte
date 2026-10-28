"use client";

import { useState } from "react";
import styles from "./Carnation.module.css";

// Generador pseudoaleatorio con semilla fija: el servidor y el cliente
// producen exactamente los mismos pétalos (sin errores de hidratación).
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Pétalo en forma de abanico con borde dentado, apuntando hacia arriba
 * y con la base en (0, 0).
 */
function petalPath(length: number, width: number, teeth: number, rand: () => number) {
  const shoulderY = -length * 0.7;
  const ry = length + shoulderY;
  let d = `M0 0 Q${r1(-width * 0.3)} ${r1(-length * 0.35)} ${r1(-width)} ${r1(shoulderY)}`;
  const steps = teeth * 2;
  for (let i = 1; i <= steps; i++) {
    const angle = Math.PI * (1 - i / steps);
    const isTip = i % 2 === 1;
    const reach = isTip ? 1 + (rand() - 0.3) * 0.12 : 0.86 + rand() * 0.05;
    const x = Math.cos(angle) * width * reach;
    const y = (shoulderY - Math.sin(angle) * ry) * reach;
    d += ` L${r1(x)} ${r1(y)}`;
  }
  d += ` Q${r1(width * 0.3)} ${r1(-length * 0.35)} 0 0Z`;
  return d;
}

interface Ring {
  count: number;
  length: number;
  width: number;
  offset: number;
  delay: number;
  colors: [string, string, string];
}

const RINGS: Ring[] = [
  { count: 12, length: 92, width: 30, offset: 0, delay: 1.6, colors: ["#9e1b3f", "#d94a6e", "#f59ab3"] },
  { count: 11, length: 80, width: 28, offset: 15, delay: 1.95, colors: ["#ae2147", "#e45a7c", "#f8a9bf"] },
  { count: 10, length: 66, width: 25, offset: 6, delay: 2.3, colors: ["#be2b52", "#ec6a8a", "#fbb8ca"] },
  { count: 9, length: 52, width: 21, offset: 20, delay: 2.65, colors: ["#c93460", "#f07c98", "#fcc6d4"] },
  { count: 8, length: 38, width: 17, offset: 10, delay: 3.0, colors: ["#d23d68", "#f38aa4", "#fdd2dd"] },
  { count: 7, length: 24, width: 12, offset: 30, delay: 3.3, colors: ["#c22e5a", "#ec6c8f", "#fbbccc"] },
  { count: 5, length: 12, width: 8, offset: 0, delay: 3.55, colors: ["#a81f4a", "#de4f76", "#f49ab2"] },
];

const rand = mulberry32(27102026);

const PETAL_RINGS = RINGS.map((ring) => ({
  ...ring,
  petals: Array.from({ length: ring.count }, (_, i) => ({
    angle: r1(ring.offset + (i * 360) / ring.count + (rand() - 0.5) * 10),
    d: petalPath(ring.length * (0.92 + rand() * 0.12), ring.width, 7, rand),
    delay: r1((ring.delay + i * 0.035) * 100) / 100,
  })),
}));

const LEAVES = [
  { x: 161, y: 392, flip: false, delay: 0.9 },
  { x: 161, y: 392, flip: true, delay: 1.0 },
  { x: 160, y: 326, flip: true, delay: 1.15 },
  { x: 160, y: 326, flip: false, delay: 1.25 },
];

const SPARKLES = [
  { x: 62, y: 86 },
  { x: 262, y: 64 },
  { x: 48, y: 214 },
  { x: 274, y: 196 },
  { x: 166, y: 30 },
];

interface CarnationProps {
  caption?: string;
}

/** Clavel virtual que florece al cargar la página. */
export default function Carnation({ caption = "Una flor para ti" }: CarnationProps) {
  const [bloomKey, setBloomKey] = useState(0);

  return (
    <div className={styles.wrapper}>
      <svg
        key={bloomKey}
        className={styles.svg}
        viewBox="0 0 320 470"
        role="img"
        aria-label="Un clavel rosado que florece"
      >
        <defs>
          {PETAL_RINGS.map((ring, r) => (
            <linearGradient key={r} id={`clavel-ring-${r}`} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor={ring.colors[0]} />
              <stop offset="0.62" stopColor={ring.colors[1]} />
              <stop offset="1" stopColor={ring.colors[2]} />
            </linearGradient>
          ))}
          <radialGradient id="clavel-glow">
            <stop offset="0" stopColor="#fff4d6" stopOpacity="0.9" />
            <stop offset="1" stopColor="#fff4d6" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse className={styles.glow} cx="160" cy="150" rx="140" ry="130" fill="url(#clavel-glow)" />
        <ellipse cx="160" cy="456" rx="58" ry="8" fill="rgba(70, 45, 20, 0.22)" />

        <g className={styles.sway}>
          <path
            className={styles.stem}
            d="M158 456 C 166 392 154 330 160 262"
            pathLength={1}
            fill="none"
            stroke="#5d8a46"
            strokeWidth="6"
            strokeLinecap="round"
          />

          {LEAVES.map((leaf, i) => (
            <g key={i} transform={`translate(${leaf.x} ${leaf.y}) scale(${leaf.flip ? -1 : 1} 1)`}>
              <path
                className={styles.leaf}
                style={{ animationDelay: `${leaf.delay}s` }}
                d="M0 0 C 14 -6 36 -20 58 -42 C 40 -14 20 -3 0 0 Z"
                fill="#7aa35c"
                stroke="#4d7536"
                strokeWidth="1.2"
              />
            </g>
          ))}

          <g transform="translate(160 264)">
            <path
              className={styles.calyx}
              d="M-7 0 C -9 -20 -13 -40 -14 -52 L -11 -68 L -6 -55 L 0 -72 L 6 -55 L 11 -68 L 14 -52 C 13 -40 9 -20 7 0 Z"
              fill="#6c9a50"
              stroke="#46703a"
              strokeWidth="1.2"
            />
          </g>

          <g transform="translate(160 150) scale(1 0.86)">
            {PETAL_RINGS.map((ring, r) =>
              ring.petals.map((petal, i) => (
                <g key={`${r}-${i}`} transform={`rotate(${petal.angle})`}>
                  <path
                    className={styles.petal}
                    style={{ animationDelay: `${petal.delay}s` }}
                    d={petal.d}
                    fill={`url(#clavel-ring-${r})`}
                    stroke="rgba(120, 10, 40, 0.35)"
                    strokeWidth="0.7"
                    strokeLinejoin="round"
                  />
                </g>
              )),
            )}
          </g>
        </g>

        {SPARKLES.map((s, i) => (
          <g key={i} transform={`translate(${s.x} ${s.y})`}>
            <path
              className={styles.sparkle}
              style={{ animationDelay: `${4.2 + i * 0.45}s` }}
              d="M0 -9 L2.2 -2.2 L9 0 L2.2 2.2 L0 9 L-2.2 2.2 L-9 0 L-2.2 -2.2 Z"
              fill="#f2c14e"
            />
          </g>
        ))}
      </svg>

      <p className={styles.caption}>{caption}</p>
      <button type="button" className={styles.replay} onClick={() => setBloomKey((k) => k + 1)}>
        Volver a florecer
      </button>
    </div>
  );
}
