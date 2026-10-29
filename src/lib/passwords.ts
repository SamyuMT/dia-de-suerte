export const MIN_PASSWORD_LENGTH = 8;

/** Revisa la contraseña nueva; devuelve el error a mostrar o null si está bien. */
export function checkNewPassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (password !== confirm) return "Las contraseñas no coinciden.";
  return null;
}

/** Traduce los errores de Supabase Auth más comunes al cambiar la contraseña. */
export function passwordUpdateError(code?: string): string {
  if (code === "same_password") return "La nueva contraseña debe ser distinta a la anterior.";
  if (code === "weak_password") return "Esa contraseña es muy débil o ya apareció en filtraciones. Elige otra.";
  return "No se pudo cambiar la contraseña. Inténtalo de nuevo.";
}
