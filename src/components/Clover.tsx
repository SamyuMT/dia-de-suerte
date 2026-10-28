interface CloverProps {
  size?: number;
  className?: string;
}

/** Trébol de cuatro hojas: el emblema de Día de Suerte. */
export default function Clover({ size = 28, className }: CloverProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="-50 -50 100 100"
      aria-hidden="true"
    >
      <path
        d="M4 6 C 10 22 18 34 30 44"
        fill="none"
        stroke="#3f5f2c"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {[45, 135, 225, 315].map((angle) => (
        <path
          key={angle}
          transform={`rotate(${angle})`}
          d="M0 0 C -4 -10 -24 -16 -22 -30 C -20 -40 -6 -40 0 -30 C 6 -40 20 -40 22 -30 C 24 -16 4 -10 0 0 Z"
          fill="#6f9a52"
          stroke="#3f5f2c"
          strokeWidth="2.5"
        />
      ))}
      <circle r="4" fill="#3f5f2c" />
    </svg>
  );
}
