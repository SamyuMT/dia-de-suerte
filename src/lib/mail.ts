import "server-only";
import nodemailer from "nodemailer";

// Correos que envía la app (no los de Supabase Auth): por ahora, la bienvenida a un miembro nuevo.
// Usa el mismo Gmail que Supabase (SMTP con contraseña de aplicación).

function transport() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!user || !pass) throw new Error("Faltan SMTP_USER o SMTP_PASSWORD en las variables de entorno.");
  return {
    from: `"Día de Suerte" <${user}>`,
    transporter: nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: false,
      auth: { user, pass },
    }),
  };
}

const escape = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function sendWelcomeEmail(to: { email: string; nickname: string; password: string; loginUrl: string }) {
  const { from, transporter } = transport();
  const nick = escape(to.nickname);
  const email = escape(to.email);
  const password = escape(to.password);
  const url = escape(to.loginUrl);

  await transporter.sendMail({
    from,
    to: to.email,
    subject: "¡Ya tienes tu página en Día de Suerte! 🍀",
    text: [
      `¡Hola, ${to.nickname}!`,
      "",
      "Te abrimos las puertas del libro de aventuras Día de Suerte.",
      "",
      `Entra en: ${to.loginUrl}`,
      `Correo: ${to.email}`,
      `Contraseña: ${to.password}`,
      "",
      "Por tu privacidad, cámbiala apenas entres en Mi cuenta.",
      "",
      "Con cariño, Día de Suerte",
    ].join("\n"),
    html: `
<div style="background:#f0e0bf;padding:28px 12px;font-family:Georgia,serif;color:#3a2816">
  <div style="max-width:480px;margin:0 auto;background:#f7ecd4;border-radius:6px;padding:28px 26px;box-shadow:0 8px 22px rgba(50,28,10,.25)">
    <p style="margin:0;text-align:center;font-size:34px">🍀</p>
    <h1 style="margin:8px 0 4px;text-align:center;font-size:26px">¡Hola, ${nick}!</h1>
    <p style="margin:0 0 20px;text-align:center;color:#6b5236">Te abrimos las puertas del libro de aventuras <strong>Día de Suerte</strong>.</p>
    <div style="background:#fbf6ea;border:1.5px dashed #a9814d;border-radius:4px;padding:14px 16px;margin:0 0 20px">
      <p style="margin:0 0 6px"><strong>Correo:</strong> ${email}</p>
      <p style="margin:0"><strong>Contraseña:</strong> <span style="font-family:monospace;font-size:16px">${password}</span></p>
    </div>
    <p style="text-align:center;margin:0 0 20px">
      <a href="${url}" style="display:inline-block;background:#e2574c;color:#f7ecd4;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:4px">Abrir el libro</a>
    </p>
    <p style="margin:0;font-size:14px;color:#6b5236">Por tu privacidad, cambia la contraseña apenas entres, en <strong>Mi cuenta</strong>. Si no pediste entrar al libro, ignora este correo.</p>
  </div>
</div>`,
  });
}
