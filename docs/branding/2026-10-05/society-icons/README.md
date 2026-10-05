# Ícones das sociedades — 05/10/2026

Os seis ícones glossy fornecidos pelo proprietário foram preparados para os cards de seleção. Correspondência: SAF (mulher rosa), Pastor (igreja azul), UPH (homem verde), UPA (três adolescentes laranja), UMP (jovens/livro azul) e UCP (crianças roxo).

Os mestres em Downloads permanecem inalterados: **1254 × 1254 px, PNG RGBA**, com transparência de 0 a 255. Cada arquivo em `src/assets/societies/` tem **384 × 384 px, PNG RGBA**, reduzido diretamente do canvas completo com Pillow LANCZOS e codificado com PNG sem perda. Nenhum recorte, redesenho, recoloração, composição de fundo, correção, nitidez ou upscale foi aplicado.

O canvas original foi preservado integralmente, inclusive margens e brilhos. Alguns pixels alpha dos originais chegam à borda; remover margem por limiar poderia cortar conteúdo fornecido. A proporção quadrada permanece igual.

[Proveniência e hashes completos](asset-provenance.json) registra o nome de cada original, SHA256 de fonte e derivado, dimensões, alpha e bounding box. A releitura dos PNGs confirma igualdade pixel por pixel com a redução determinística; os hashes dos originais foram conferidos antes e depois.

Reprodução, usando Python 3 e Pillow da mesma versão registrada no JSON:

```python
from pathlib import Path
import json
from PIL import Image

manifest = json.loads(Path("docs/branding/2026-10-05/society-icons/asset-provenance.json").read_text())
for asset in manifest["assets"]:
    source = Path(manifest["source_directory"]) / asset["source_file"]
    with Image.open(source) as image:
        image.resize((384, 384), Image.Resampling.LANCZOS).save(
            asset["asset_path"], format="PNG", compress_level=9
        )
```

Esta preparação altera somente os seis assets e esta documentação. Cards, textos, seleção e navegação são implementados separadamente em HTML/CSS; o mockup não é usado como imagem de interface.
