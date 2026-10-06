# Acessos IPNC — 06/10/2026

## Comportamento entregue

- Os acessos de Diretoria, Secretaria EBD, conta administrativa, recuperação de senha e Finanças usam a composição da Secretaria: a mesma arte de fundo, logo oficial, títulos, navegação e cards.
- Todos os acessos por PIN reutilizam o mesmo `PinPad`: seis posições, teclado numérico, Limpar, apagar e a opção escrita **Voltar para a Home**. A modalidade em diálogo mantém a mesma composição e adapta seu tamanho ao espaço disponível.
- O fluxo da Diretoria passa a ser **Diretoria → sociedade/Pastor → PIN individual → identificação**. Escolher uma sociedade não autentica nem consulta um PIN.
- **Acesso administrativo → Configurações → PINs da Diretoria** permite definir os seis números de cada sociedade e do Pastor. Os valores ficam visíveis para o administrador. Cada campo informa se está salvo; Copiar só copia o valor confirmado pelo servidor. Nenhum PIN novo foi definido automaticamente.
- A conta administrativa continua usando usuário e senha. Os acessos financeiros mantêm sua própria validação e seus próprios PINs.
- Ao abrir novamente o PWA instalado, a rota inicial é **`/auth?home=1`**, inclusive com uma sessão salva ou uma rota privada restaurada. A retomada de um processo mantido em segundo plano também retorna imediatamente à entrada. Não é mais necessário aguardar 30 minutos.

## Implementação e limites

`AccessShell` e `AccessOption` extraem o modelo existente da EBD, evitando cópias de layouts que poderiam divergir. A logo oficial em `src/assets/logo-ipnc.png` foi preservada, sem edição ou recompressão (1254 × 1254, SHA-256 `2df611f147250f6df0caeb189051cea1cd0748c05ed90bb752501125021f7081`).

A validação da Diretoria agora exige sociedade ativa e seu PIN específico. Não existe fallback para o PIN geral. A função SQL que confirma sessões e os consumidores do contexto de IA reconhecem o mesmo PIN individual. Trocar um PIN invalida as sessões emitidas para aquele valor, sem alterar as outras sociedades. O registro histórico do PIN geral foi preservado, fora do editor e fora deste fluxo de autenticação.

O manifest mantém `id` e `scope`, define a entrada pública como `start_url` e solicita `navigate-existing` aos navegadores compatíveis. O início do documento aplica a mesma regra antes de montar uma tela privada, mesmo quando o aparelho ainda possui o manifest anterior. Em sistemas que não informam um relançamento pelo ícone, o retorno após segundo plano funciona como sinal de reabertura. Cliques em campos de arquivo/câmera protegem essa interação; teclado, resize, perda de foco e navegação interna não provocam retorno. Links explícitos de recuperação de senha e votação preservam seus destinos. A sessão e os dados não são apagados.

O cache de publicação foi atualizado para `ump-cache-v20`, o worker para `/sw.js?v=2026-10-06-access-v12` e o manifest para `?v=ipnc-access-v6`. Apenas caches antigos do aplicativo são substituídos; não são removidas credenciais ou dados locais. A cobertura de PWA combina testes de lifecycle com instalação simulada e uma fixture executada no navegador, sem alegar validação física de Android/iOS.

A migration `20261006135357_diretoria_society_pin_validation.sql` substitui apenas a definição de `portal_valid`, preservando proprietário, privilégios e os ramos da EBD e da Tesouraria. Não há movimentação de dados financeiros, votos ou registros da EBD.

Funções publicadas no projeto existente, preservando as fontes remotas não relacionadas e suas configurações de autenticação:

| Função | Versão | JWT da plataforma |
| --- | --- | --- |
| validate-diretoria-pin | 3 | Validação própria, como antes |
| auto-process-meeting | 5 | Exigido |
| manage-ebd-class-password | 4 | Validação própria, como antes |
| manage-task | 3 | Exigido |
| organize-plenary | 5 | Exigido |
| summarize-for-pastor | 5 | Exigido |
| summarize-study | 8 | Exigido |
| summarize-yearly-studies | 5 | Exigido |

## Verificação

- Verificação de tipos aprovada.
- Suíte completa de **339 testes aprovada**; inclui respostas reais dos componentes e do handler em ambientes isolados, PostgreSQL/PGlite com autorização, PIN incorreto, sociedade inativa, escopo entre sociedades, troca de PIN, requisições duplicadas, falhas de conexão, confirmação de gravação e cópia.
- Abertura e retomada instaladas cobertas com tempo de ausência de 0, 1 segundo, 5 minutos e 31 minutos, armazenamento indisponível, sessão anterior, entrega inicial/duplicada de launch, freeze/bfcache e interação de arquivo/câmera. A navegação normal permanece em uso; nenhuma operação de autenticação é feita por esse controller.
- Build de produção aprovado.
- Lint dos arquivos novos/alterados desse trabalho aprovado. `Secretaria.tsx` mantém 13 erros anteriores de `no-explicit-any`, nos mesmos trechos e posições da revisão anterior; nenhum foi ocultado ou introduzido pelos ajustes de apresentação.
- `git diff --check` aprovado.
- Conferência visual em 320, 375, 390, 768, 1024 e 1440 px: seleção de sociedades, PIN da Diretoria, seleção EBD, PIN EBD, conta administrativa, acesso financeiro e PIN financeiro. Nenhuma rolagem horizontal encontrada.
- Texto ampliado a 200% e simulação das áreas seguras móveis conferidos no seletor e no PIN da Diretoria.
- O painel administrativo foi conferido nas seis larguras, incluindo erro de entrada, salvamento confirmado, cópia e ausência do editor para quem não é administrador.

Toda interação de salvamento/cópia nos testes usou PINs e registros fictícios no ambiente local isolado. Não foram consultados PINs reais ou executadas transações na produção. As imagens do painel abaixo contêm somente valores fictícios.

## Evidências locais

- [Sociedades — celular](societies-mobile.png)
- [PIN da Diretoria — celular](directory-pin-mobile.png)
- [Perfis da EBD — computador](ebd-profiles-desktop.png)
- [PIN da EBD — celular](ebd-pin-mobile.png)
- [Conta administrativa — celular](account-login-mobile.png)
- [PIN financeiro — celular](treasury-pin-mobile.png)
- [PIN com texto ampliado e áreas seguras](directory-pin-safe-large-text.png)
- [Editor de PINs — computador](pins-admin-desktop.png)
- [Editor de PINs — celular](pins-admin-mobile.png)
- [Métricas de telas](viewport-checks.json)
- [Métricas do administrativo](pins-admin-metrics.json)
- [Home após abertura com rota privada restaurada](pwa-launch-restored-cold.png)
- [Home após retomada simulada](pwa-launch-resumed-home.png)
- [Método e limites da conferência de abertura](pwa-launch-fixture.md)

A versão do Site e o commit publicado são confirmados pela ferramenta de publicação e informados na entrega da conversa; uma prévia local ou um push não equivalem a deploy concluído.
