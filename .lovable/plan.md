## Correção: Avanço automático de step ao adicionar candidato

### Problema
Em `src/pages/EleicaoDetalhe.tsx`, quando o usuário adiciona o primeiro candidato, `completion.candidatos` vira `true`. Como `activeStep` inicia como `null`, o `currentStepKey` cai no fallback `steps[autoCurrentIndex]?.key`, que recalcula e avança automaticamente para a etapa "Presença" — mesmo sem o usuário clicar em "Avançar".

### Solução
Inicializar `activeStep` com `'candidatos'` para que o step ativo seja sempre controlado manualmente (via clique no stepper ou no botão "Avançar"), e nunca mude automaticamente em resposta a mudanças de `completion`.

### Alterações em `src/pages/EleicaoDetalhe.tsx`

1. **Trocar inicialização do `activeStep`:**
   - De: `const [activeStep, setActiveStep] = useState<string | null>(null);`
   - Para: `const [activeStep, setActiveStep] = useState<string | null>('candidatos');`

2. **Trocar operador `||` por `??` no `currentStepKey`:**
   - De: `const currentStepKey = activeStep || steps[autoCurrentIndex]?.key;`
   - Para: `const currentStepKey = activeStep ?? steps[autoCurrentIndex]?.key;`

### O que NÃO muda
- `autoCurrentIndex` continua existindo e é usado apenas como fallback visual no stepper (`currentIndex >= 0 ? currentIndex : autoCurrentIndex`).
- A lógica de `completion`, `steps`, `handleStepClick` e renderização dos `ElectionStepCard` permanece intacta.
- Botões "Avançar" continuam funcionando via `setActiveStep(nextStep.key)`.

### Resultado esperado
O usuário pode adicionar quantos candidatos quiser sem que a UI pule para "Chamada de Presença". O avanço só ocorre ao clicar explicitamente em "Avançar: Chamada de Presença" ou em outro step do stepper.
