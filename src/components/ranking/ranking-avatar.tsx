import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface RankingAvatarProps {
  name: string;
  avatarUrl: string | null;
  size?: "default" | "sm" | "lg";
  className?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0];
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : undefined;
  const initials = `${first ?? ""}${last ?? ""}`.toUpperCase();
  return initials || "?";
}

/**
 * Avatar do participante do ranking, com fallback de iniciais quando não há `avatarUrl`
 * (mascaramento de privacidade já vem resolvido do backend — aqui só se exibe o que chegou).
 * Server Component — puramente apresentacional.
 */
export function RankingAvatar({ name, avatarUrl, size = "default", className }: RankingAvatarProps) {
  return (
    <Avatar size={size} className={className}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
      <AvatarFallback>{getInitials(name)}</AvatarFallback>
    </Avatar>
  );
}
