

# Melhorar o Icone PWA na Tela Inicial

## Problema

O icone atual (`icon-512x512.png`) tem duas questoes:

1. **Muito espaco em branco** ao redor do logo na imagem original (512x512px)
2. O manifest declara `"purpose": "any maskable"`, o que faz o Android aplicar um recorte adicional de ~20% em cada borda, reduzindo ainda mais o logo visivel

## Solucao

### Passo 1: Ajustar o `manifest.json`

Separar os propositos dos icones. Usar `"any"` como padrao (sem recorte extra) para que o logo apareca maior e mais centralizado:

- Icone 192x192: `"purpose": "any"`
- Icone 512x512: `"purpose": "any"`

Isso remove o recorte maskable e o logo ocupara mais espaco no icone.

### Passo 2 (opcional, recomendado): Adicionar icone maskable dedicado

Se voce quiser tambem suportar o formato maskable (icones adaptativos do Android), o ideal seria fornecer uma versao separada do logo com fundo colorido (verde `#2f9e6e`) e o logo centralizado ocupando apenas os 80% internos. Isso seria um arquivo separado como `icon-maskable-512x512.png`.

Por enquanto, apenas o Passo 1 ja resolve o problema de tamanho.

## Secao Tecnica

### Arquivo: `public/manifest.json`

Mudar `"purpose": "any maskable"` para `"purpose": "any"` em ambas as entradas de icone. Isso instrui o sistema operacional a nao aplicar recorte maskable, exibindo o icone completo.

| Antes | Depois |
|---|---|
| `"purpose": "any maskable"` | `"purpose": "any"` |

Apenas 1 arquivo sera modificado: `public/manifest.json`.

**Nota**: Apos publicar, os usuarios precisarao remover o app da tela inicial e adicionar novamente para ver o icone atualizado (cache do PWA).
