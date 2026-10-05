import { useRef, useState } from 'react';
import { attachTreasuryReceipt, setTreasuryAttachmentActive, downloadTreasuryReceipt, useTreasuryAttachments } from '@/hooks/useTreasuryWorkflow';
import { savePdfFile } from '@/lib/treasury-download';
import { toast } from 'sonner';

export function TreasuryAttachments({ entryId, admin }: { entryId: string; admin: boolean }) {
  const attachments = useTreasuryAttachments(entryId, true);
  const [file, setFile] = useState<File | null>(null);
  const id = useRef(crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const upload = async () => { if (!file || busy) return; setBusy(true); setError(''); try { await attachTreasuryReceipt(entryId, file, id.current); await attachments.refetch(); setFile(null); if (input.current) input.current.value = ''; toast.success('Comprovante anexado.'); } catch (error) { setError((error as Error).message); } finally { setBusy(false); } };
  return <section className="tr-attachments" aria-label="Comprovantes"><h3>Comprovantes</h3><p className="treasury-field-help">Arquivos privados, disponíveis ao administrador e ao tesoureiro da sociedade. Não aparecem no link público. Arquivar retira o anexo dos relatórios e preserva o arquivo para reativação.</p>{attachments.error && <p role="alert">{attachments.error.message}</p>}
    {attachments.data?.map(item => <div key={item.id} className="tr-manager-row"><button type="button" className="tr-button" key={item.id} disabled={busy} onClick={async () => { setBusy(true); try { savePdfFile(await downloadTreasuryReceipt(item), item.filename, item.mime_type); } catch (error) { setError((error as Error).message); } finally { setBusy(false); } }}>{item.filename}{item.active === false ? ' (arquivado)' : ''}</button>{admin && <button type="button" className="tr-button" disabled={busy} onClick={async () => { setBusy(true); try { await setTreasuryAttachmentActive(item.id, item.active === false); await attachments.refetch(); } catch (error) { setError((error as Error).message); } finally { setBusy(false); } }}>{item.active === false ? 'Reativar' : 'Arquivar'}</button>}</div>)}
    {admin && <div className="treasury-field"><label htmlFor={`receipt-${entryId}`}>Anexar PDF, PNG ou JPG (até 10 MB)</label><input ref={input} id={`receipt-${entryId}`} type="file" accept="application/pdf,image/png,image/jpeg" disabled={busy} onChange={event => { setFile(event.target.files?.[0] ?? null); id.current = crypto.randomUUID(); setError(''); }} /><button type="button" className="tr-button" disabled={!file || busy} onClick={() => void upload()}>{busy ? 'Anexando…' : 'Anexar comprovante'}</button></div>}
    {error && <p role="alert" className="treasury-form-error">{error}</p>}
  </section>;
}
