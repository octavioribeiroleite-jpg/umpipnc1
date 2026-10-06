import { useState } from 'react';
import IdentityConfirmation from '@/components/auth/IdentityConfirmation';
import { fixtureParams } from './options';

// Local presentation QA only: callbacks have no authentication or backend effects.
export default function IdentityFixture() {
  const [action, setAction] = useState('');
  const name = fixtureParams.get('state') === 'long'
    ? 'Pessoa Fictícia de Demonstração com Nome Muito Extenso para Conferência de Quebra de Linha'
    : 'Pessoa Fictícia';
  return (
    <div className="auth-page auth-page-identity">
      <main className="auth-main"><div className="auth-main-inner">
        <IdentityConfirmation name={name} role={fixtureParams.get('identity-role') === 'member' ? undefined : 'Tesoureiro(a)'} society="UMP"
          loading={fixtureParams.get('identity-loading') === '1'}
          onBack={() => setAction('Voltar recebido')} onDifferentPerson={() => setAction('Troca de pessoa recebida')} onConfirm={() => setAction('Confirmação recebida')} />
        {action && <p role="status">{action}</p>}
        <footer className="auth-page-footer"><p className="auth-copyright">© 2026 IPNC</p></footer>
      </div></main>
    </div>
  );
}
