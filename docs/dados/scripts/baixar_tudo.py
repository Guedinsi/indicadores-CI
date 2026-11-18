#!/usr/bin/env python3
"""Roda todos os scripts baixar_*.py em sequência e mostra um resumo no final.
Cada script grava o seu docs/dados/csv/valores-<fonte>.csv; depois é só importar:

    python3 docs/dados/scripts/baixar_tudo.py                 # tudo que não precisa de conta
    python3 docs/dados/scripts/baixar_tudo.py --pular bcb,tse # pula os mais demorados
    python3 docs/dados/scripts/baixar_tudo.py --so ibge,siconfi
    bash docs/dados/setup-dados.sh                            # importa os CSVs para o banco

Tempo da primeira rodada: ~20 min (SICONFI ~10 min, Banco Central ~10 min, TSE ~3 min; o resto é rápido).
As respostas ficam em cache (docs/dados/scripts/.cache), então rodar de novo leva poucos minutos.
A Base dos Dados (BigQuery) só entra se BD_BILLING_PROJECT_ID estiver definido e se este script for
rodado com o Python que tem o pacote instalado:  ~/.venvs/indicadores/bin/python docs/dados/scripts/baixar_tudo.py
"""
import argparse
import os
import subprocess
import sys
import time
from pathlib import Path

AQUI = Path(__file__).resolve().parent
FONTES = {  # nome curto: (script, o que traz)
    "ibge": ("baixar_ibge.py", "população, PIB, VAB, rebanhos, lavouras (SIDRA)"),
    "ibge_cidades": ("baixar_ibge_cidades.py", "IDHM, IDEB, matrículas, frota, mortalidade infantil, agências, PIB per capita"),
    "firjan": ("baixar_firjan.py", "IFGF e IFDM"),
    "siconfi": ("baixar_siconfi.py", "receitas, despesas, impostos, FPM, gasto com saúde"),
    "deral": ("baixar_deral.py", "valor bruto da produção agropecuária (VBP)"),
    "inep": ("ler_inep.py", "rendimento escolar e ensino superior (lê os zips de docs/dados/brutos)"),
    "tse": ("baixar_tse.py", "eleitorado por sexo e idade, zonas eleitorais"),
    "bcb": ("baixar_bcb.py", "crédito rural (lento)"),
    "basedosdados": ("baixar_basedosdados.py", "RAIS, CAGED, leitos (precisa de conta Google)"),
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--so", help=f"fontes separadas por vírgula: {', '.join(FONTES)}")
    ap.add_argument("--pular", default="", help="fontes a pular, separadas por vírgula")
    a = ap.parse_args()
    pedidas = [f.strip() for f in a.so.split(",")] if a.so else list(FONTES)
    pular = {f.strip() for f in a.pular.split(",") if f.strip()}
    ruins = [f for f in [*pedidas, *pular] if f not in FONTES]
    if ruins:
        sys.exit(f"Fontes desconhecidas: {ruins}. Válidas: {', '.join(FONTES)}")

    resumo = []
    for fonte in pedidas:
        script, descricao = FONTES[fonte]
        if fonte in pular:
            resumo.append((fonte, "PULADA", "pedido com --pular"))
            continue
        if fonte == "basedosdados" and not os.environ.get("BD_BILLING_PROJECT_ID"):
            resumo.append((fonte, "PULADA", "defina BD_BILLING_PROJECT_ID para incluir (ver baixar_basedosdados.py)"))
            continue
        print(f"\n{'=' * 70}\n{fonte}: {descricao}\n{'=' * 70}", flush=True)
        inicio, falhas = time.time(), 0
        proc = subprocess.Popen([sys.executable, str(AQUI / script)], stdout=subprocess.PIPE, text=True)
        for linha in proc.stdout:
            print(linha, end="", flush=True)
            falhas += linha.startswith("FALHOU")
        codigo = proc.wait()
        tempo = f"{time.time() - inicio:.0f}s"
        if codigo != 0:
            resumo.append((fonte, "ERRO", f"o script parou com código {codigo} ({tempo})"))
        elif falhas:
            resumo.append((fonte, "PARCIAL", f"{falhas} indicador(es) falharam; os demais foram gravados ({tempo})"))
        else:
            resumo.append((fonte, "OK", tempo))

    print(f"\n{'=' * 70}\nRESUMO\n{'=' * 70}")
    for fonte, estado, detalhe in resumo:
        print(f"{estado:8} {fonte:14} {detalhe}")
    sys.exit(1 if any(estado == "ERRO" for _, estado, _ in resumo) else 0)


if __name__ == "__main__":
    main()
