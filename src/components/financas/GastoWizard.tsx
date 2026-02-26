import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Upload,
  FileImage,
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  FileText,
  DollarSign,
  CalendarDays,
  Camera,
  ClipboardList,
} from 'lucide-react';

interface GastoWizardProps {
  editing: boolean;
  initialData: {
    description: string;
    amount: string;
    date: string;
  };
  initialReceiptPreview: string | null;
  submitting: boolean;
  onSubmit: (data: { description: string; amount: string; date: string }, receiptFile: File | null) => void;
  onCancel: () => void;
}

const STEP_LABELS = ['Descrição', 'Valor', 'Data', 'Comprovante', 'Resumo'];
const STEP_ICONS = [FileText, DollarSign, CalendarDays, Camera, ClipboardList];

export function GastoWizard({
  editing,
  initialData,
  initialReceiptPreview,
  submitting,
  onSubmit,
  onCancel,
}: GastoWizardProps) {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [animating, setAnimating] = useState(false);
  const [formData, setFormData] = useState(initialData);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(initialReceiptPreview);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const goNext = () => {
    if (!validateStep()) return;
    setDirection('next');
    setAnimating(true);
    setTimeout(() => {
      setStep((s) => s + 1);
      setAnimating(false);
    }, 200);
  };

  const goPrev = () => {
    setDirection('prev');
    setAnimating(true);
    setTimeout(() => {
      setStep((s) => s - 1);
      setAnimating(false);
    }, 200);
  };

  const validateStep = (): boolean => {
    if (step === 1 && !formData.description.trim()) {
      toast.error('Descrição é obrigatória');
      return false;
    }
    if (step === 2) {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Valor inválido');
        return false;
      }
    }
    if (step === 4 && !editing && !receiptFile && !receiptPreview) {
      toast.error('Comprovante é obrigatório');
      return false;
    }
    return true;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 5MB.');
        return;
      }
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setReceiptPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(editing ? initialReceiptPreview : null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirm = () => {
    onSubmit(formData, receiptFile);
  };

  const slideClass = animating
    ? direction === 'next'
      ? 'translate-x-8 opacity-0'
      : '-translate-x-8 opacity-0'
    : 'translate-x-0 opacity-100';

  const progressValue = (step / 5) * 100;

  const StepIcon = STEP_ICONS[step - 1];

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          {STEP_LABELS.map((label, i) => {
            const isActive = i + 1 === step;
            const isDone = i + 1 < step;
            const Icon = STEP_ICONS[i];
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                    isDone
                      ? 'bg-primary text-primary-foreground'
                      : isActive
                      ? 'bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                </div>
                <span
                  className={`text-[10px] font-medium transition-colors duration-300 ${
                    isActive ? 'text-primary' : isDone ? 'text-primary/70' : 'text-muted-foreground'
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
        <Progress value={progressValue} className="h-1.5" />
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Step content with animation */}
      <div className={`transition-all duration-200 ease-out ${slideClass} min-h-[180px]`}>
        {step === 1 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <FileText className="h-5 w-5 text-primary" />
              <span>Descrição do gasto</span>
            </div>
            <p className="text-sm text-muted-foreground">Descreva brevemente o que foi gasto.</p>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ex: Material de limpeza, aluguel do salão..."
              className="min-h-[100px] text-base"
              autoFocus
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <DollarSign className="h-5 w-5 text-primary" />
              <span>Valor do gasto</span>
            </div>
            <p className="text-sm text-muted-foreground">Informe o valor total em reais.</p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                R$
              </span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0,00"
                className="pl-10 text-2xl font-bold h-14"
                autoFocus
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <CalendarDays className="h-5 w-5 text-primary" />
              <span>Data do gasto</span>
            </div>
            <p className="text-sm text-muted-foreground">Quando esse gasto ocorreu?</p>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="text-lg h-14"
              autoFocus
            />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Camera className="h-5 w-5 text-primary" />
              <span>Comprovante {!editing && '*'}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Anexe uma foto ou PDF do comprovante.
            </p>

            {receiptPreview ? (
              <div className="relative animate-scale-in">
                <div className="border rounded-xl p-3 bg-muted/50">
                  {receiptPreview.startsWith('data:image') || receiptPreview.includes('/receipts/') ? (
                    <img
                      src={receiptPreview}
                      alt="Preview"
                      className="max-h-40 rounded-lg mx-auto object-contain"
                    />
                  ) : (
                    <div className="flex items-center justify-center py-6 text-muted-foreground">
                      <FileImage className="h-10 w-10 mr-2" />
                      <span>Arquivo selecionado</span>
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-7 w-7 rounded-full"
                  onClick={removeReceipt}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-muted-foreground/30 rounded-xl py-10 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors duration-200"
              >
                <Upload className="h-8 w-8" />
                <span className="text-sm font-medium">Toque para anexar</span>
                <span className="text-xs">Imagens ou PDF (máx. 5MB)</span>
              </button>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <ClipboardList className="h-5 w-5 text-primary" />
              <span>Confirme os dados</span>
            </div>

            <div className="bg-muted/50 rounded-xl p-4 space-y-3 border">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Descrição</p>
                  <p className="font-medium mt-0.5">{formData.description}</p>
                </div>
              </div>

              <div className="h-px bg-border" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Valor</p>
                  <p className="text-xl font-bold text-destructive mt-0.5">
                    R$ {parseFloat(formData.amount || '0').toFixed(2).replace('.', ',')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Data</p>
                  <p className="font-medium mt-0.5">
                    {new Date(formData.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="h-px bg-border" />

              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Comprovante</p>
                {receiptPreview ? (
                  receiptPreview.startsWith('data:image') || receiptPreview.includes('/receipts/') ? (
                    <img
                      src={receiptPreview}
                      alt="Comprovante"
                      className="max-h-24 rounded-lg object-contain"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileImage className="h-5 w-5" />
                      <span className="text-sm">Arquivo anexado</span>
                    </div>
                  )
                ) : editing ? (
                  <span className="text-sm text-muted-foreground italic">(manter atual)</span>
                ) : (
                  <span className="text-sm text-muted-foreground">Nenhum</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between pt-2">
        {step === 1 ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={goPrev} disabled={submitting}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        )}

        {step < 5 ? (
          <Button type="button" onClick={goNext}>
            Próximo
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleConfirm} disabled={submitting} className="min-w-[140px]">
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            {editing ? 'Salvar' : 'Confirmar Gasto'}
          </Button>
        )}
      </div>
    </div>
  );
}
