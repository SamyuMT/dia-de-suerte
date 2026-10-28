import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container" style={{ textAlign: "center", padding: "80px 16px" }}>
      <h1 className="hand" style={{ fontSize: "2.6rem" }}>
        Esta página todavía está en blanco
      </h1>
      <p>Quizás es una aventura que aún no se ha escrito.</p>
      <Link href="/" className="hand" style={{ fontSize: "1.4rem" }}>
        ← Volver al libro
      </Link>
    </div>
  );
}
