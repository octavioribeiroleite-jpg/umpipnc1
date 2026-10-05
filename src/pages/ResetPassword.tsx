import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, KeyRound } from 'lucide-react';
import logo from '@/assets/logo-ipnc.png';

export default function ResetPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sessionState, setSessionState] = useState<'checking' | 'valid' | 'invalid' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    let recoveryReceived = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY' && session) {
        recoveryReceived = true;
        setSessionState('valid');
      } else if (event === 'SIGNED_OUT') setSessionState('invalid');
    });
    void supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (mounted && !recoveryReceived) setSessionState(error ? 'error' : session ? 'valid' : 'invalid');
    }).catch(() => { if (mounted && !recoveryReceived) setSessionState('error'); });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage('');
    if (password.length < 6) { setErrorMessage('A senha deve ter pelo menos 6 caracteres.'); return; }
    if (password !== confirmPassword) { setErrorMessage('As senhas digitadas são diferentes.'); return; }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { setErrorMessage('Não foi possível salvar a nova senha. Confira sua conexão ou solicite outro link de redefinição.'); return; }
      toast({ title: 'Senha redefinida!', description: 'Sua senha foi alterada com sucesso.' });
      navigate('/');
    } catch { setErrorMessage('Não foi possível confirmar a alteração. Confira sua conexão e tente novamente.'); }
    finally { setIsLoading(false); }
  };

  return <main className="min-h-dvh flex items-center justify-center bg-background p-4">
    <div className="w-full max-w-[400px] space-y-6">
      <img src={logo} alt="Renovo IPNC" className="mx-auto h-24 w-24 rounded-2xl bg-[#123b2e] p-1 object-contain" />
      <Card>
        <CardHeader>
          <KeyRound className="h-10 w-10 text-primary" aria-hidden="true" />
          <CardTitle>{sessionState === 'checking' ? 'Verificando link' : sessionState === 'valid' ? 'Redefinir senha' : sessionState === 'error' ? 'Não foi possível verificar o link' : 'Link inválido'}</CardTitle>
          <CardDescription>{sessionState === 'checking' ? 'Aguarde a confirmação do seu acesso.' : sessionState === 'valid' ? 'Digite e confirme sua nova senha.' : sessionState === 'error' ? 'Confira sua conexão e tente novamente.' : 'O link expirou ou é inválido. Solicite um novo link na entrada administrativa.'}</CardDescription>
        </CardHeader>
        <CardContent>
          {sessionState === 'checking' ? <p role="status" className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Verificando…</p> : sessionState === 'valid' ?
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-2"><Label htmlFor="password">Nova senha</Label><Input id="password" type="password" autoComplete="new-password" placeholder="Mínimo 6 caracteres" value={password} onChange={event => {setPassword(event.target.value);setErrorMessage('');}} required disabled={isLoading} aria-describedby="reset-error" /></div>
              <div className="space-y-2"><Label htmlFor="confirm-password">Confirmar senha</Label><Input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={event => {setConfirmPassword(event.target.value);setErrorMessage('');}} required disabled={isLoading} aria-describedby="reset-error" /></div>
              <p id="reset-error" role={errorMessage ? 'alert' : undefined} className="min-h-6 text-sm text-destructive">{errorMessage}</p>
              <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? 'Salvando…' : 'Salvar nova senha'}</Button>
            </form> : <div className="space-y-3">{sessionState === 'error' && <Button className="w-full" onClick={() => window.location.reload()}>Tentar novamente</Button>}<Button variant="outline" className="w-full" onClick={() => navigate('/auth')}>Voltar à entrada</Button></div>}
        </CardContent>
      </Card>
    </div>
  </main>;
}
