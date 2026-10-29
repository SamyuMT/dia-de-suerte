"use client";

import { useEffect, useRef, useState } from "react";
import type { MemoryBlock } from "@/types/memory";
import { paragraphs } from "./TextBlock";
import blockStyles from "./Blocks.module.css";
import styles from "./MusicDisc.module.css";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Disco de vinilo que gira mientras suena la canción. */
export default function MusicDisc({ block }: { block: MemoryBlock }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(block.media[0]?.media.durationSeconds ?? 0);
  const track = block.media[0]?.media;

  useEffect(() => {
    // Si cambia la canción (en el editor), se detiene la anterior.
    setPlaying(false);
    setTime(0);
  }, [track?.url]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  };

  return (
    <div className={blockStyles.music}>
      {block.heading && <p className={blockStyles.heading}>{block.heading}</p>}

      <div className={styles.player}>
        <button
          type="button"
          className={`${styles.disc} ${playing ? styles.spinning : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            toggle();
          }}
          aria-label={playing ? "Pausar canción" : "Reproducir canción"}
          disabled={!track}
        >
          <span className={styles.label}>
            <span className={styles.labelTitle}>{block.trackTitle || "Sin título"}</span>
            {block.trackArtist && <span className={styles.labelArtist}>{block.trackArtist}</span>}
          </span>
          <span className={styles.hole} />
        </button>

        <div className={styles.controls} onClick={(e) => e.stopPropagation()}>
          <button type="button" className={styles.play} onClick={toggle} disabled={!track}>
            {playing ? "❚❚ Pausar" : "▶ Escuchar"}
          </button>
          <input
            type="range"
            className={styles.progress}
            min={0}
            max={duration || 0}
            step={0.1}
            value={time}
            onChange={(e) => {
              const audio = audioRef.current;
              if (audio) audio.currentTime = Number(e.target.value);
            }}
            aria-label="Avance de la canción"
            disabled={!track}
          />
          <span className={styles.time}>
            {formatTime(time)} / {formatTime(duration)}
          </span>
        </div>

        {track && (
          <audio
            ref={audioRef}
            src={track.url}
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          />
        )}
      </div>

      {paragraphs(block.body).map((p, i) => (
        <p key={i} className={blockStyles.paragraph}>
          {p}
        </p>
      ))}
      {block.caption && <p className={blockStyles.signature}>{block.caption}</p>}
    </div>
  );
}
