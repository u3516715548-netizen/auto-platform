export type TeamActionState = {
  error: string | null;
  success: boolean;
  rateLimited?: boolean;
};

export const TEAM_NEUTRAL_ERROR =
  "Nu am putut finaliza acțiunea. Verifică datele și încearcă din nou.";
export const TEAM_NEUTRAL_RATE = "Prea multe solicitări. Încearcă din nou mai târziu.";
export const TEAM_NEUTRAL_EXISTS =
  "Această adresă are deja acces sau o invitație activă.";
export const TEAM_LAST_OWNER_ERROR =
  "Nu poți modifica sau elimina ultimul proprietar al organizației.";
