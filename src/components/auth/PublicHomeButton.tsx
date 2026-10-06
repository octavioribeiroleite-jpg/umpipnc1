import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { APP_HOME_PATH } from '@/lib/app-home';

export default function PublicHomeButton({ onClick, disabled, className = '' }: {
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const navigate = useNavigate();
  return <Button type="button" variant="ghost" disabled={disabled}
    className={`h-auto min-h-11 whitespace-normal gap-2 py-2 text-left leading-snug ${className}`} onClick={onClick ?? (() => navigate(APP_HOME_PATH, { replace: true }))}>
    <Home className="h-4 w-4 shrink-0" aria-hidden="true" />Voltar para a Home
  </Button>;
}
