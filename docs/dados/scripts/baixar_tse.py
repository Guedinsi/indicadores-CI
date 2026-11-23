#!/usr/bin/env python3
"""Baixa o perfil do eleitorado do TSE (dados abertos, sem cadastro) e gera
docs/dados/csv/valores-tse.csv no formato do importador de valores.

Indicadores: eleitores aptos (total, por sexo e por faixa etária) e número de zonas eleitorais,
para Campo Mourão, COMCAM (soma dos 25 municípios), Paraná e Brasil.

Uso (na raiz do repositório, com internet):
    python3 docs/dados/scripts/baixar_tse.py                    # eleitorado ATUAL (período = ano do arquivo)
    python3 docs/dados/scripts/baixar_tse.py --anos 2022,2024   # também o eleitorado dessas eleições
    python3 docs/dados/scripts/baixar_tse.py --so GP-017

O arquivo ATUAL tem ~85 MB (zip) e é atualizado pelo TSE todo mês; os de anos eleitorais passam de
300 MB cada. Tudo é lido direto do zip, linha a linha, sem descompactar no disco (leva 1 a 3 minutos).
O mesmo dado existe na Base dos Dados (br_tse_eleicoes), mas aqui não precisa de conta Google.
"""
import argparse
import csv
import io
import zipfile

from comum import COMCAM, DIA, DIR_CSV, T_BR, T_MUN, T_REG, T_UF, Saida, baixar_arquivo, filtrar_codigos, norm

BASE = "https://cdn.tse.jus.br/estatistica/sead/odsele/perfil_eleitorado/perfil_eleitorado_{}.zip"
SEXO = {"GP-043": "feminino", "GP-044": "masculino"}
FAIXAS = {  # code: (idade mínima, idade máxima)
    "GP-045": (16, 17), "GP-046": (18, 24), "GP-047": (25, 34), "GP-048": (35, 44),
    "GP-049": (45, 59), "GP-050": (60, 69), "GP-051": (70, 200),
}
TODOS = ["GP-017", *SEXO, *FAIXAS, "GP-052"]


def idade_minima(cd_faixa):
    """CD_FAIXA_ETARIA: '1600' = 16 anos, '2124' = 21 a 24, '9999' = 100 ou mais; inválida -> None."""
    cd = cd_faixa.strip()
    if not cd.isdigit() or len(cd) != 4:
        return None
    return 100 if cd == "9999" else int(cd[:2])


def chaves(sexo, cd_faixa):
    out = ["GP-017"]
    out += [code for code, nome in SEXO.items() if norm(sexo) == nome]
    idade = idade_minima(cd_faixa)
    if idade is not None:
        out += [code for code, (lo, hi) in FAIXAS.items() if lo <= idade <= hi]
    return out


def ler(linhas, municipio="campo mourao", uf="PR", regiao=COMCAM):
    """Soma QT_ELEITORES por território. `linhas` = iterável de dicts com as colunas do TSE.
    Devolve (ano_do_arquivo, {territorio: {code: valor}}, municípios da região que não apareceram)."""
    nomes_regiao = {norm(n) for n in regiao}
    soma = {t: dict.fromkeys(TODOS, 0) for t in (T_MUN, T_REG, T_UF, T_BR)}
    zonas = {t: set() for t in soma}
    vistos, ano = set(), None
    for r in linhas:
        if ano is None:
            ano = r["ANO_ELEICAO"] if r["ANO_ELEICAO"].isdigit() and r["ANO_ELEICAO"] != "9999" else r["DT_GERACAO"][-4:]
        if r["SG_UF"] == "ZZ":
            continue  # eleitores no exterior não entram no total do Brasil por território
        qt = int(r["QT_ELEITORES"] or 0)
        onde = [T_BR]
        if r["SG_UF"] == uf:
            onde.append(T_UF)
            nome = norm(r["NM_MUNICIPIO"])
            if nome in nomes_regiao:
                onde.append(T_REG)
                vistos.add(nome)
                if nome == municipio:
                    onde.append(T_MUN)
        ks = chaves(r["DS_GENERO"], r["CD_FAIXA_ETARIA"])
        for t in onde:
            for k in ks:
                soma[t][k] += qt
            zonas[t].add((r["SG_UF"], r["NR_ZONA"]))
    for t in soma:
        soma[t]["GP-052"] = len(zonas[t])
    return ano, soma, sorted(nomes_regiao - vistos)


def linhas_do_zip(caminho):
    with zipfile.ZipFile(caminho) as z:
        nome = next(n for n in z.namelist() if n.lower().endswith(".csv"))
        with z.open(nome) as f:
            yield from csv.DictReader(io.TextIOWrapper(f, encoding="latin-1", newline=""), delimiter=";")


def coletar(arquivos, quais):
    """arquivos = [(rótulo, função que devolve as linhas)]."""
    saida = Saida()
    for rotulo, abrir in arquivos:
        try:
            ano, soma, faltando = ler(abrir())
            if ano is None:
                raise ValueError("arquivo vazio")
            for territorio, valores in soma.items():
                sem_dado = territorio == T_REG and faltando  # região incompleta = sem dado
                for code in quais:
                    saida.add(code, territorio, ano, None if sem_dado else valores[code])
            if faltando:
                saida.falhou(f"TSE {rotulo}", f"municípios da COMCAM não encontrados no arquivo: {faltando}")
        except Exception as e:  # noqa: BLE001 - seguir para o próximo arquivo
            saida.falhou(f"TSE {rotulo}", e)
    for code in quais:
        saida.resumo(code)
    return saida


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--anos", help="anos eleitorais extras, separados por vírgula (ex.: 2022,2024); ~300 MB cada")
    ap.add_argument("--sem-atual", action="store_true", help="não baixa o eleitorado atual")
    ap.add_argument("--so", help="códigos separados por vírgula (ex.: GP-017,GP-052)")
    ap.add_argument("--saida", default=str(DIR_CSV / "valores-tse.csv"))
    a = ap.parse_args()
    quais = filtrar_codigos(a.so, TODOS)
    rotulos = [x.strip() for x in (a.anos or "").split(",") if x.strip()] + ([] if a.sem_atual else ["ATUAL"])

    def abrir(rotulo):
        def f():
            print(f"TSE {rotulo}: baixando e lendo (pode levar alguns minutos)...")
            ttl = 7 * DIA if rotulo == "ATUAL" else 365 * DIA
            return linhas_do_zip(baixar_arquivo(BASE.format(rotulo), f"tse-perfil-{rotulo}.zip", ttl=ttl, timeout=600))
        return f

    saida = coletar([(r, abrir(r)) for r in rotulos], quais)
    saida.gravar(a.saida)


if __name__ == "__main__":
    main()
