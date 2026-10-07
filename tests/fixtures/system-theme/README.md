# Fixture integrada de tema

Use somente em `127.0.0.1:8086`, via `tests/vite.system-theme.config.ts`. Monta o App e os controllers visuais reais com identidades e clientes fictícios. `index.html` produtivo é reutilizado na transformação; nenhum trecho de boot é copiado para manter sincronização com a entrega.

Emule `prefers-color-scheme` por CDP, sem alterar o OS. Parâmetros de perfil/estado seguem a fixture Diretoria; parâmetros `mode`, `edge`, `auth`, `read` e `realtime` seguem o benchmark EBD. Tesouraria tem dados consistentes somente para leitura; `treasury=locked` inicia sem sessão. Todas as escritas financeiras e uploads são rejeitados.

`mode=stored-admin&reauth=1` ou `mode=stored-professor&reauth=1` expira somente a metadata fictícia após o seed, permitindo que o timer real abra a renovação. `edge=3000` mantém o loading visível; PIN fictício `123456` passa e `000000` falha. `pinStress=1` renderiza o PinPad/Dialog reais com `errorMessage` sintético persistente de três linhas para medir junto com seis dígitos. `safe=1` aplica insets CSS fictícios 44/34/18/18; não representa um dispositivo instalado real.

`visual=populated` acrescenta oito registros de presença e dois acessos de professores inteiramente fictícios, somente para inspeção do histórico e das listas. A leitura de senhas das salas retorna PINs sintéticos para as duas turmas da fixture; qualquer ação de criar ou remover senha é rejeitada. Não preencher credenciais reais nem interpretar esta prévia como verificação de permissões do backend.

Rotas, resultados e limitações: `docs/design-audit/system-dark-theme-2026-10-06/README.md`. Não registrar Service Worker, preencher credenciais reais nem trocar os aliases por clientes produtivos.
