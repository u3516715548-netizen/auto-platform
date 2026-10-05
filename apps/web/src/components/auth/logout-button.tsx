import { Button } from "@auto-platform/ui";
import { signOutAction } from "@/lib/auth/sign-out";

type LogoutButtonProps = {
  className?: string;
};

export function LogoutButton({ className = "w-full sm:w-auto" }: LogoutButtonProps) {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="secondary" className={className}>
        Delogare
      </Button>
    </form>
  );
}
