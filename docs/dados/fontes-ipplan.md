# Observações sobre o documento "Indicadores Campo Mourão 2026" (IPPLAN)

- `indicadores-ipplan.csv`: catálogo derivado das tabelas do PDF. Fontes e tipo de acesso (`source_url`, `source_access`) são SUGESTÕES: confirmar cada link.
- `valores-ipplan.csv`: valores copiados do PDF, no período indicado na coluna "Data" de cada tabela. Região = COMCAM, Paraná = 41. Conferir contra a fonte original.
- Os painéis econômicos "2018" a "2025" repetem os dados de 2017 (coluna Data = 2017): não importados. Buscar o dado atual na fonte (RAIS etc.).
- Tabelas com formatação confusa no PDF (VAB e VAF, estabelecimentos de saúde) não foram importadas.
- COMCAM no PDF tem 24/25 municípios (varia no texto): definir a lista antes de calcular valores regionais.
  Conferido em 16/11/2026: nas tabelas do agro, a "Região" do PDF é a soma dos 25 municípios menos Terra Boa. Os scripts somam os 25.
- Em 16/11/2026 saíram de `valores-ipplan.csv` as 30 linhas que conflitavam com os scripts automáticos (cópia em `removidos-ipplan.csv`). Motivos e regra: ver `fontes.md`.
- Valores do PDF sem fonte automática: `indicadores-pdf-manual.csv` e `valores-pdf-manual.csv` (lista e motivos em `fontes.md`).
