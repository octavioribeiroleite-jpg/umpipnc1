import type { ReactNode } from 'react';
import { AuthProvider as Provider, useAuth as useBase } from '../diretoria/auth';
export const AuthProvider = ({children}:{children:ReactNode}) => <Provider>{children}</Provider>;
export function useAuth() {
  const auth=useBase();
  return {...auth,session:auth.user ? {access_token:'synthetic-directory',refresh_token:'synthetic-directory-refresh',user:auth.user} : null};
}
