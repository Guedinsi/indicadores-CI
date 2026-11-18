#!/usr/bin/env python3
"""Lê os arquivos do INEP baixados À MÃO para docs/dados/brutos/ e gera
docs/dados/csv/valores-inep.csv no formato do importador de valores.

Por que à mão: o site download.inep.gov.br falha na verificação do certificado HTTPS quando acessado
por script (testado em 11/2026); pelo navegador funciona. Salve os .zip SEM extrair e sem renomear:

  Taxas de rendimento por município (um por ano):
    https://download.inep.gov.br/informacoes_estatisticas/indicadores_educacionais/2025/tx_rend_municipios_2025.zip
  Microdados do Censo da Educação Superior (um por ano, ~450 MB):
    https://download.inep.gov.br/microdados/microdados_censo_da_educacao_superior_2024.zip
  (para outros anos, troque o ano no endereço)

Uso (na raiz do repositório):
    python3 docs/dados/scripts/ler_inep.py                 # lê todos os zips que estiverem em docs/dados/brutos
    python3 docs/dados/scripts/ler_inep.py --so EDU-020,EDU-026

Indicadores:
- Rendimento escolar (EDU-020 a EDU-025): taxas de aprovação, reprovação e abandono no ensino fundamental
  e no médio, todas as redes e localizações. Só Campo Mourão: taxa não se soma, e o arquivo municipal não
  traz estado nem Brasil.
- Ensino superior (EDU-005, EDU-026 a EDU-029): cursos presenciais, matrículas e concluintes presenciais
  e a distância, pelo município do curso (presencial) ou do polo (EAD). Campo Mourão, COMCAM, Paraná, Brasil.
  Cada ano leva ~1 minuto (o CSV tem 450 MB e é lido direto do zip).
"""
import argparse
import csv
import io
import re
import zipfile
from pathlib import Path

from baixar_ibge import Ibge, codigos_comcam
from comum import DIR_CSV, MUNICIPIO, T_BR, T_MUN, T_REG, T_UF, UF_PR, Saida, filtrar_codigos, ler_xlsx

DIR_BRUTOS = Path(__file__).resolve().parent.parent / "brutos"
RENDIMENTO = {  # code: código da coluna na planilha (linha de cabeçalho com os nomes de variável)
    "EDU-020": "1_CAT_FUN", "EDU-021": "2_CAT_FUN", "EDU-022": "3_CAT_FUN",
    "EDU-023": "1_CAT_MED", "EDU-024": "2_CAT_MED", "EDU-025": "3_CAT_MED",
}
SUPERIOR = {  # code: (TP_MODALIDADE_ENSINO: "1" presencial, "2" a distância; coluna somada)
    "EDU-005": ("1", "QT_CURSO"), "EDU-026": ("1", "QT_MAT"), "EDU-027": ("2", "QT_MAT"),
    "EDU-028": ("1", "QT_CONC"), "EDU-029": ("2", "QT_CONC"),
}
TODOS = [*RENDIMENTO, *SUPERIOR]


def rendimento(linhas, municipio=MUNICIPIO):
    """linhas = linhas de uma aba (ler_xlsx). Devolve (ano, {code: taxa}) da linha Total/Total do município."""
    colunas = None
    for linha in linhas:
        if colunas is None:
            nomes = {str(v).strip(): k for k, v in linha.items()}
            if "CO_MUNICIPIO" in nomes and "1_CAT_FUN" in nomes:
                colunas = nomes
            continue
        if (str(linha.get(colunas["CO_MUNICIPIO"], "")).split(".")[0] == municipio
                and linha.get(colunas["NO_CATEGORIA"]) == "Total" and linha.get(colunas["NO_DEPENDENCIA"]) == "Total"):
            valores = {}
            for code, var in RENDIMENTO.items():
                try:
                    valores[code] = round(float(linha.get(colunas[var], "")), 2)
                except ValueError:
                    valores[code] = None  # "--" = não se aplica / sem dado
            return str(linha[colunas["NU_ANO_CENSO"]]).split(".")[0], valores
    raise LookupError("município não encontrado na planilha (ou o layout mudou)" if colunas else
                      "cabeçalho com CO_MUNICIPIO e 1_CAT_FUN não encontrado")


def superior(linhas, comcam, municipio=MUNICIPIO, uf=UF_PR):
    """linhas = csv.reader do MICRODADOS_CADASTRO_CURSOS (com o cabeçalho). Devolve (ano, {territorio: {code: soma}})."""
    cab = next(linhas)
    pos = {nome: cab.index(nome) for nome in ("NU_ANO_CENSO", "CO_UF", "CO_MUNICIPIO", "TP_MODALIDADE_ENSINO",
                                              *{col for _, col in SUPERIOR.values()})}
    regiao = set(comcam)
    soma = {t: dict.fromkeys(SUPERIOR, 0) for t in (T_MUN, T_REG, T_UF, T_BR)}
    ano = None
    for r in linhas:
        ano = ano or r[pos["NU_ANO_CENSO"]]
        cod = r[pos["CO_MUNICIPIO"]]
        onde = [T_BR] + ([T_UF] if r[pos["CO_UF"]] == uf else []) + ([T_REG] if cod in regiao else []) + ([T_MUN] if cod == municipio else [])
        for code, (modalidade, coluna) in SUPERIOR.items():
            if r[pos["TP_MODALIDADE_ENSINO"]] == modalidade and r[pos[coluna]]:
                for t in onde:
                    soma[t][code] += int(r[pos[coluna]])
    return ano, soma


def abrir_rendimento(caminho):
    with zipfile.ZipFile(caminho) as z:
        nome = next(n for n in z.namelist() if n.lower().endswith(".xlsx"))
        abas = ler_xlsx(io.BytesIO(z.read(nome)))
    return next(iter(abas.values()))


def abrir_superior(caminho):
    with zipfile.ZipFile(caminho) as z:
        nome = next(n for n in z.namelist() if "CADASTRO_CURSOS" in n.upper() and n.lower().endswith(".csv"))
        with z.open(nome) as f:
            yield from csv.reader(io.TextIOWrapper(f, encoding="latin-1", newline=""), delimiter=";")


def coletar(arq_rendimento, arq_superior, comcam, quais, avisar=lambda msg: print(msg, flush=True)):
    """arq_* = listas de (nome, função que devolve as linhas)."""
    saida = Saida()
    if any(c in RENDIMENTO for c in quais):
        for nome, abrir in arq_rendimento:
            try:
                avisar(f"lendo {nome}...")
                ano, valores = rendimento(abrir())
                for code in (c for c in quais if c in RENDIMENTO):
                    saida.add(code, T_MUN, ano, valores[code])
            except Exception as e:  # noqa: BLE001 - seguir para o próximo arquivo
                saida.falhou(nome[:40], e)
    if any(c in SUPERIOR for c in quais):
        for nome, abrir in arq_superior:
            try:
                avisar(f"lendo {nome} (~1 minuto)...")
                ano, soma = superior(abrir(), comcam)
                for territorio, valores in soma.items():
                    for code in (c for c in quais if c in SUPERIOR):
                        saida.add(code, territorio, ano, valores[code])
            except Exception as e:  # noqa: BLE001
                saida.falhou(nome[:40], e)
    for code in quais:
        tem_arquivo = arq_rendimento if code in RENDIMENTO else arq_superior
        if tem_arquivo:
            saida.resumo(code)
        else:
            saida.falhou(code, f"nenhum zip desse tipo em {DIR_BRUTOS} (links no início de ler_inep.py)")
    return saida


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--so", help="códigos separados por vírgula (ex.: EDU-020,EDU-026)")
    ap.add_argument("--pasta", default=str(DIR_BRUTOS), help="onde estão os .zip baixados")
    ap.add_argument("--saida", default=str(DIR_CSV / "valores-inep.csv"))
    a = ap.parse_args()
    quais = filtrar_codigos(a.so, TODOS)
    pasta = Path(a.pasta)

    def achar(padrao, abrir):
        zips = sorted(p for p in pasta.glob("*.zip") if re.fullmatch(padrao, p.name, re.I))
        return [(p.name, lambda p=p: abrir(p)) for p in zips]

    coletar(achar(r"tx_rend_municipios_\d{4}.*\.zip", abrir_rendimento),
            achar(r"microdados_censo_da_educacao_superior_\d{4}.*\.zip", abrir_superior),
            codigos_comcam(Ibge()), quais).gravar(a.saida)


if __name__ == "__main__":
    main()
