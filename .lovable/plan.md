

# Plano: Gerar PDF de Eventos do Calendario

## O que sera feito

Adicionar um botao "Gerar PDF" no calendario do pastor (e tambem acessivel nas paginas das sociedades) que exporta os eventos do mes atual em um PDF bonito, organizado por dia, com logo da IPNC, cores de cada sociedade e layout profissional.

---

## Layout do PDF

```text
+--------------------------------------------------+
|  [BARRA AZUL ESCURO - HEADER]                    |
|  [Logo IPNC]  Cronograma de Eventos              |
|               Fevereiro 2026                      |
|               Igreja Presbiteriana de Nova Carapina|
+--------------------------------------------------+
|  Tema 2026: RENOVO - Isaias 40.31                |
|  Enfase do mes: No altar                         |
+--------------------------------------------------+
|                                                  |
|  DOM 01/02                                       |
|  [bolinha azul] Plenaria da UMP         18:45 UMP|
|  [bolinha laranja] Plenaria da UPA      18:45 UPA|
|                                                  |
|  SEX 06/02                                       |
|  [bolinha laranja] Abertura UPA         19:00 UPA|
|  [bolinha rosa] Departamental da SAF    19:00 SAF|
|                                                  |
|  SAB 07/02                                       |
|  [bolinha laranja] Abertura FEDUPA      09:00 UPA|
|  ...                                             |
|                                                  |
|  LEGENDA                                         |
|  [azul] UMP  [rosa] SAF  [verde] UPH            |
|  [laranja] UPA  [roxo] UCP  [cinza] IPNC        |
+--------------------------------------------------+
|  Gerado em 17/02/2026    Pagina 1 de 1           |
+--------------------------------------------------+
```

---

## Mudancas

### 1. PastorCalendario.tsx

Adicionar botao "Gerar PDF" ao lado do filtro de sociedade no header do calendario. Ao clicar:

- Busca todos os eventos filtrados do mes atual
- Agrupa eventos por dia (ordenados cronologicamente)
- Gera PDF com jsPDF usando o mesmo padrao visual do PlenariaDetalhe (header azul escuro, linhas decorativas, fontes consistentes)
- Inclui logo da IPNC no header (converter imagem para base64)
- Cada evento mostra bolinha colorida da sociedade, titulo, horario e nome da sociedade
- Rodape com data de geracao e paginacao
- Legenda de cores das sociedades no final

### 2. Funcao de geracao

Criar a logica de geracao do PDF diretamente no componente (ou extrair para um utilitario), seguindo o padrao ja usado em `PlenariaDetalhe.tsx`:

- Header com barra azul escuro + logo + titulo do mes
- Card de tema anual e enfase mensal
- Lista de eventos agrupados por dia
- Cada dia: linha com data formatada (ex: "DOM 01/02")
- Cada evento: bolinha colorida + titulo + horario + sociedade
- Legenda de cores no final
- Footer com data de geracao e pagina

### Detalhes tecnicos

- Usar `jsPDF` (ja instalado no projeto)
- Carregar logo de `src/assets/logo-ipnc.png` como base64 para embed no PDF
- Respeitar filtro de sociedade ativo (se filtrando por UMP, so exporta eventos da UMP)
- Titulo do PDF muda conforme filtro: "Cronograma UMP - Fevereiro 2026" ou "Cronograma Geral - Fevereiro 2026"
- Paginacao automatica quando eventos ultrapassam uma pagina

### Arquivo modificado

| Arquivo | Mudanca |
|---|---|
| `src/pages/PastorCalendario.tsx` | Adicionar botao e funcao de geracao de PDF |

### Ordem de execucao

1. Adicionar funcao `handleDownloadPDF` com toda a logica de geracao
2. Adicionar botao "PDF" no header do calendario (icone Download)
3. Testar com eventos do mes atual
