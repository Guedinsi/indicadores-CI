#!/usr/bin/env python3
"""Baixa o Valor Bruto da Produção Agropecuária (VBP) da SEAB/DERAL do Paraná (planilhas públicas
.xlsx, sem cadastro) e gera docs/dados/csv/valores-deral.csv no formato do importador de valores.

Indicador: AGR-001, para Campo Mourão, COMCAM (soma dos 25 municípios) e Paraná (soma de todos).

Uso (na raiz do repositório, com internet):
    python3 docs/dados/scripts/baixar_deral.py                # todos os anos com planilha .xlsx (2019 em diante)
    python3 docs/dados/scripts/baixar_deral.py --desde 2023

O DERAL publica uma planilha por ano, cada uma com um endereço diferente: o script lê a página
https://www.agricultura.pr.gov.br/vbp e pega os links de lá. As planilhas de 2012 a 2018 estão no
formato antigo (.xls), que a biblioteca padrão do Python não lê: ficam de fora.
O valor é a soma da coluna "VBP" (R$) de todas as culturas e criações do município.
"""
import argparse
import re
import urllib.parse

from baixar_ibge import Ibge, codigos_comcam
from comum import DIA, DIR_CSV, MUNICIPIO, T_MUN, T_REG, T_UF, Saida, baixar, baixar_arquivo, ler_xlsx, norm

PAGINA = "https://www.agricultura.pr.gov.br/vbp"
CODE = "AGR-001"


def links_por_ano(html, pagina=PAGINA):
    """{ano: url} das planilhas .xlsx citadas na página (nomes como vbp2025.xlsx, vbp_2023_0.xlsx)."""
    out = {}
    for href in re.findall(r"href=[\"']([^\"']+\.xlsx)[\"']", html, re.I):
        m = re.search(r"vbp_?((?:19|20)\d\d)", href.rsplit("/", 1)[-1], re.I)
        if m:
            out[int(m.group(1))] = urllib.parse.urljoin(pagina, href)
    return out


def somar_por_municipio(abas):
    """Acha a aba de dados (colunas 'Código Município' e 'VBP') e soma o VBP por código IBGE."""
    for linhas in abas.values():
        col_cod = col_vbp = None
        soma = {}
        for n, linha in enumerate(linhas):
            if col_cod is None:
                titulos = {norm(str(v)): k for k, v in linha.items()}
                if "codigo municipio" in titulos and "vbp" in titulos:
                    col_cod, col_vbp = titulos["codigo municipio"], titulos["vbp"]
                elif n > 15:
                    break  # não é a aba de dados
                continue
            cod = str(linha.get(col_cod, "")).split(".")[0]
            try:
                valor = float(linha.get(col_vbp) or 0)
            except ValueError:
                continue
            if len(cod) == 7 and cod.isdigit():
                soma[cod] = soma.get(cod, 0.0) + valor
        if soma:
            return soma
    raise LookupError("nenhuma aba com as colunas 'Código Município' e 'VBP'")


def coletar(planilhas, comcam):
    """planilhas = {ano: função que devolve as abas (ler_xlsx)}."""
    saida = Saida()
    for ano in sorted(planilhas):
        try:
            soma = somar_por_municipio(planilhas[ano]())
            saida.add(CODE, T_MUN, ano, soma.get(MUNICIPIO))
            saida.add(CODE, T_REG, ano, sum(soma[c] for c in comcam) if all(c in soma for c in comcam) else None)
            saida.add(CODE, T_UF, ano, sum(v for c, v in soma.items() if c.startswith("41")))
        except Exception as e:  # noqa: BLE001 - seguir para o próximo ano
            saida.falhou(f"VBP {ano}", e)
    saida.resumo(CODE)
    return saida


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--desde", type=int, default=2015)
    ap.add_argument("--saida", default=str(DIR_CSV / "valores-deral.csv"))
    a = ap.parse_args()
    links = links_por_ano(baixar(PAGINA, ttl=DIA).decode("utf-8", "ignore"))
    if not links:
        raise SystemExit(f"Nenhuma planilha .xlsx encontrada em {PAGINA} (a página mudou?)")

    def abrir(ano):
        def f():
            print(f"VBP {ano}: {links[ano]}", flush=True)
            return ler_xlsx(baixar_arquivo(links[ano], f"deral-vbp-{ano}.xlsx", ttl=30 * DIA))
        return f

    coletar({ano: abrir(ano) for ano in links if ano >= a.desde}, codigos_comcam(Ibge())).gravar(a.saida)


if __name__ == "__main__":
    main()
