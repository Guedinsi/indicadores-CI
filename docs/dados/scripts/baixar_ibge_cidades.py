#!/usr/bin/env python3
"""Baixa indicadores da API "IBGE Cidades" (servicodados.ibge.gov.br/api/v1/pesquisas, pública e sem chave)
e gera docs/dados/csv/valores-ibge-cidades.csv no formato do importador de valores.

É a mesma base do site cidades.ibge.gov.br, que já reúne dados de outros órgãos por município:
INEP (Censo Escolar, IDEB), SENATRAN (frota), Ministério da Saúde (mortalidade infantil),
Banco Central (agências), PNUD (IDHM) e o próprio IBGE (PIB, Registro Civil).

Uso (na raiz do repositório, com internet):
    python3 docs/dados/scripts/baixar_ibge_cidades.py                 # tudo, de 2015 em diante
    python3 docs/dados/scripts/baixar_ibge_cidades.py --desde 2005
    python3 docs/dados/scripts/baixar_ibge_cidades.py --so EDU-003,SEG-001
    python3 docs/dados/scripts/baixar_ibge_cidades.py --listar 13     # árvore de indicadores de uma pesquisa

COMCAM = soma dos 25 municípios, só para contagens e só quando todos têm dado no período.
Índices e notas (IDHM, IDEB) não se somam: a região fica sem valor.
"""
import argparse

from baixar_ibge import Ibge, codigos_comcam
from comum import DIA, DIR_CSV, MUNICIPIO, T_BR, T_MUN, T_REG, T_UF, UF_PR, Saida, filtrar_codigos, get_json, soma_completa

API = "https://servicodados.ibge.gov.br/api/v1/pesquisas"

# code: (pesquisa, indicador, somar na COMCAM?, "-" vale zero?)
SIMPLES = {
    "GP-016": (29, 21910, True, True),     # agências bancárias
    "EDU-003": (40, 78187, False, False),  # IDEB anos iniciais, rede pública
    "EDU-007": (40, 78192, False, False),  # IDEB anos finais, rede pública
    "EDU-008": (40, 78197, False, False),  # IDEB ensino médio, rede pública
    "EDU-009": (13, 77882, True, True),    # matrículas creche
    "EDU-010": (13, 5903, True, True),     # matrículas pré-escola
    "EDU-011": (13, 5908, True, True),     # matrículas ensino fundamental
    "EDU-012": (13, 5913, True, True),     # matrículas ensino médio
    "EDU-014": (13, 77887, True, True),    # docentes ensino infantil
    "EDU-015": (13, 5929, True, True),     # docentes ensino fundamental
    "EDU-016": (13, 5934, True, True),     # docentes ensino médio
    "EDU-017": (13, 77893, True, True),    # escolas ensino infantil
    "EDU-018": (13, 5950, True, True),     # escolas ensino fundamental
    "EDU-019": (13, 5955, True, True),     # escolas ensino médio
    "SEG-001": (22, 28120, True, False),   # frota total
    "SEG-003": (22, 28122, True, True),    # automóveis
    "SEG-004": (22, 28128, True, True),    # motocicletas
    "SAU-015": (20, 29778, True, True),    # nascidos vivos (residência da mãe)
    "SAU-016": (20, 29786, True, True),    # óbitos (residência do falecido)
}
CALCULADOS = ["GP-005", "GP-015", "EDU-001", "SAU-004", "SAU-005", "SAU-006"]
TODOS = list(SIMPLES) + CALCULADOS


def num(v, traco_zero):
    if v is None:
        return None
    v = str(v).strip()
    if v == "-":
        return 0.0 if traco_zero else None
    try:
        return float(v)
    except ValueError:
        return None  # "...", "X" = sem dado / sigilo


class Cidades:
    """Consulta resultados; devolve {localidade: {periodo: valor}} com a localidade como foi pedida."""

    def __init__(self, fetch=get_json):
        self.fetch = fetch

    def resultados(self, pesquisa, indicador, locais, traco_zero=False):
        # a API responde município com 6 dígitos (sem o verificador); estado "41"; Brasil "0"
        curto = {(c[:6] if len(c) == 7 else c): c for c in locais}
        url = f"{API}/{pesquisa}/indicadores/{indicador}/resultados/{'|'.join(curto)}"
        out = {c: {} for c in locais}
        for bloco in self.fetch(url, ttl=DIA):
            if bloco["id"] != indicador:
                continue
            for r in bloco["res"]:
                if r["localidade"] in curto:
                    out[curto[r["localidade"]]] = {p: num(v, traco_zero) for p, v in r["res"].items() if len(p) == 4}
        return out


def gravar_territorios(saida, code, dados, codigos, desde, somar, regional=None):
    saida.serie(code, T_MUN, dados.get(MUNICIPIO, {}), desde)
    if regional is None and somar:
        regional = soma_completa(dados, codigos)
    if regional is not None:
        saida.serie(code, T_REG, regional, desde)
    saida.serie(code, T_UF, dados.get(UF_PR, {}), desde)
    saida.serie(code, T_BR, dados.get("0", {}), desde)


def razao(numerador, denominador, fator=1.0):
    return {p: (numerador[p] / denominador[p] * fator if numerador.get(p) is not None and denominador.get(p) else None)
            for p in numerador}


def pib_per_capita(api, saida, codigos, desde):
    """Município: PIB dos Municípios. Paraná: Contas Regionais. Brasil: Contas Nacionais.
    COMCAM: soma dos PIBs / soma das populações implícitas (PIB / PIB per capita de cada município)."""
    pc = api.resultados(38, 47001, codigos)
    pib = api.resultados(38, 46997, codigos)
    pop = {c: razao(pib[c], pc[c]) for c in codigos}
    regional = razao(soma_completa(pib, codigos), soma_completa(pop, codigos))
    dados = {MUNICIPIO: pc[MUNICIPIO],
             UF_PR: api.resultados(10060, 60148, [UF_PR])[UF_PR],
             "0": api.resultados(10089, 77003, ["0"])["0"]}
    gravar_territorios(saida, "GP-005", dados, codigos, desde, False, regional)


def idhm(api, saida, codigos, desde):
    """Municípios: Atlas (1991, 2000, 2010). Paraná e Brasil: série do IDH do IBGE Cidades."""
    dados = api.resultados(10111, 329756, [MUNICIPIO])
    dados.update(api.resultados(37, 30255, [UF_PR, "0"]))
    gravar_territorios(saida, "GP-015", dados, codigos, None, False)  # decenal: ignora o --desde


def matriculas_basica(api, saida, codigos, desde, locais):
    """Educação básica = infantil + fundamental + médio."""
    partes = [api.resultados(13, i, locais, True) for i in (77881, 5908, 5913)]
    total = {}
    for c in locais:
        periodos = set().union(*(p[c] for p in partes))
        total[c] = {p: (None if any(x[c].get(p) is None for x in partes) else sum(x[c][p] for x in partes))
                    for p in periodos}
    gravar_territorios(saida, "EDU-001", total, codigos, desde, True)


def mortalidade_infantil(api, saida, codigos, desde, locais):
    """Taxa pronta para município/estado/país; na COMCAM = óbitos < 1 ano / nascidos vivos x 1000."""
    taxa = api.resultados(39, 30279, locais)
    nasc = soma_completa(api.resultados(39, 78159, codigos, True), codigos)
    obitos = soma_completa(api.resultados(39, 78160, codigos, True), codigos)
    gravar_territorios(saida, "SAU-006", taxa, codigos, desde, False, razao(obitos, nasc, 1000))


def taxa_por_mil(api, ibge, saida, codigos, desde, locais, code, indicador):
    """Natalidade e mortalidade geral: eventos do Registro Civil / população estimada x 1000.
    Só sai nos anos em que o IBGE publicou estimativa de população (tabela 6579)."""
    eventos = api.resultados(20, indicador, locais, True)
    periodos = ibge.periodos(6579, desde)
    var = ibge.variavel(6579, ["populacao residente estimada"], [])
    s = ibge.serie(6579, var, periodos, f"N6[{','.join(codigos)}]|N3[{UF_PR}]|N1[all]")
    pop = {c: s.get(("N6", c), {}) for c in codigos}
    pop[UF_PR], pop["0"] = s.get(("N3", UF_PR), {}), s.get(("N1", "1"), {})
    taxas = {c: razao({p: eventos[c].get(p) for p in pop[c]}, pop[c], 1000) for c in (MUNICIPIO, UF_PR, "0")}
    ev_reg, pop_reg = soma_completa(eventos, codigos), soma_completa(pop, codigos)
    gravar_territorios(saida, code, taxas, codigos, desde, False, razao({p: ev_reg.get(p) for p in pop_reg}, pop_reg, 1000))


def coletar(api, ibge, codigos, desde, quais):
    saida = Saida()
    locais = codigos + [UF_PR, "0"]
    especiais = {
        "GP-005": lambda: pib_per_capita(api, saida, codigos, desde),
        "GP-015": lambda: idhm(api, saida, codigos, desde),
        "EDU-001": lambda: matriculas_basica(api, saida, codigos, desde, locais),
        "SAU-006": lambda: mortalidade_infantil(api, saida, codigos, desde, locais),
        "SAU-004": lambda: taxa_por_mil(api, ibge, saida, codigos, desde, locais, "SAU-004", 29778),
        "SAU-005": lambda: taxa_por_mil(api, ibge, saida, codigos, desde, locais, "SAU-005", 29786),
    }
    for code in quais:
        try:
            if code in especiais:
                especiais[code]()
            else:
                pesquisa, indicador, somar, traco_zero = SIMPLES[code]
                dados = api.resultados(pesquisa, indicador, locais, traco_zero)
                gravar_territorios(saida, code, dados, codigos, desde, somar)
            saida.resumo(code)
        except Exception as e:  # noqa: BLE001 - seguir para os próximos indicadores
            saida.falhou(code, e)
    return saida


def listar(pesquisa):
    def andar(no, nivel):
        unidade = (no.get("unidade") or {}).get("id", "")
        print("  " * nivel + f'{no["id"]} {no.get("indicador")}' + (f" ({unidade})" if unidade else ""))
        for filho in no.get("children", []):
            andar(filho, nivel + 1)

    for no in get_json(f"{API}/{pesquisa}/indicadores/0?scope=sub"):
        andar(no, 0)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--desde", type=int, default=2015)
    ap.add_argument("--so", help="códigos separados por vírgula (ex.: EDU-003,SEG-001)")
    ap.add_argument("--listar", help="número da pesquisa: mostra a árvore de indicadores")
    ap.add_argument("--saida", default=str(DIR_CSV / "valores-ibge-cidades.csv"))
    a = ap.parse_args()
    if a.listar:
        return listar(a.listar)
    quais = filtrar_codigos(a.so, TODOS)
    ibge = Ibge()
    saida = coletar(Cidades(), ibge, codigos_comcam(ibge), a.desde, quais)
    saida.gravar(a.saida)


if __name__ == "__main__":
    main()
