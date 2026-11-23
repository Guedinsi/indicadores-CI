#!/usr/bin/env python3
"""Baixa as finanças municipais do SICONFI / Tesouro Nacional (API pública, sem cadastro e sem chave)
e gera docs/dados/csv/valores-siconfi.csv no formato do importador de valores.

Fonte: Declaração de Contas Anuais (DCA) de cada prefeitura.
  Anexo I-C = receitas orçamentárias; Anexo I-E = despesas por função (saúde, educação...);
  Anexo I-D = despesas por natureza (só usado até 2016, para o total).

Uso (na raiz do repositório, com internet):
    python3 docs/dados/scripts/baixar_siconfi.py                  # Campo Mourão + COMCAM, de 2015 em diante
    python3 docs/dados/scripts/baixar_siconfi.py --desde 2022
    python3 docs/dados/scripts/baixar_siconfi.py --so GP-008,SAU-009
    python3 docs/dados/scripts/baixar_siconfi.py --parana         # soma também os 399 municípios do PR (demora)

São 2 consultas por município por ano (a API pede ~1 por segundo): a primeira rodada completa leva
uns 10 minutos; as respostas ficam em cache por 7 dias, então repetir é rápido.

Como os números são calculados (para bater com as tabelas do IPPLAN/IPARDES):
- Receitas = receita BRUTA realizada menos as deduções (FUNDEB e outras). Total inclui as intraorçamentárias.
- Despesas = despesas EMPENHADAS. Total inclui as intraorçamentárias.
- Impostos (IPTU, ISS, ITBI, IRRF), FPM e ICMS são achados PELO NOME da conta, porque o código muda
  conforme o ano (2015-2017, 2018-2021, 2022+). Entram o principal, multas/juros e dívida ativa.
- COMCAM = soma dos 25 municípios; fica vazio se algum deles ainda não entregou a DCA do ano.
- Por habitante usa a população que vem na própria resposta do SICONFI.
"""
import argparse
import datetime
import sys
import time
import urllib.parse

from baixar_ibge import Ibge, codigos_comcam
from comum import DIA, DIR_CSV, MUNICIPIO, T_MUN, T_REG, T_UF, UF_PR, Saida, filtrar_codigos, get_json, norm

API = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/dca"
PAUSA = 0.6  # segundos entre consultas que não vieram do cache

# code: (medida somável) ou (numerador, denominador, fator) quando é razão
INDICADORES = {
    "GP-008": "rec_total", "GP-009": "desp_total", "GP-022": "rec_correntes", "GP-023": "rec_capital",
    "GP-024": "rec_tributaria", "GP-025": "iptu", "GP-026": "iss", "GP-027": "itbi", "GP-028": "irrf",
    "GP-029": "transf_correntes", "GP-012": "fpm", "GP-030": "icms", "AGR-018": "cfem",
    "GP-031": ("rec_tributaria", "populacao", 1),
    "GP-032": ("resultado", "rec_sem_intra", 100),
    "SAU-011": "saude", "SAU-012": "saude_basica", "SAU-013": "saude_hospitalar", "SAU-014": "saude_vigilancia",
    "SAU-009": ("saude", "populacao", 1),
}
POR_NOME = {  # trecho do nome da conta (sem acento, minúsculo)
    "iptu": "propriedade predial e territorial urbana",
    "itbi": "inter vivos",
    "iss": "servicos de qualquer natureza",
    "irrf": "retido na",
    "fpm": "fundo de participacao dos municipios",
    "icms": "cota-parte do icms",
    "cfem": "recursos minerais",  # cota-parte da CFEM que entrou no caixa da prefeitura
}
POR_NIVEL = {"rec_correntes": ("1",), "rec_capital": ("2",), "rec_tributaria": ("1", "1"), "transf_correntes": ("1", "7")}
FUNCOES = {"saude": ("10 -",), "saude_basica": ("10.301",), "saude_hospitalar": ("10.302",),
           "saude_vigilancia": ("10.304", "10.305")}


class Siconfi:
    def __init__(self, fetch=get_json, pausa=PAUSA):
        self.fetch, self.pausa, self._ultima = fetch, pausa, 0.0

    def dca(self, ano, anexo, ente):
        itens, offset = [], 0
        while True:
            q = urllib.parse.urlencode({"an_exercicio": ano, "no_anexo": f"DCA-Anexo {anexo}", "id_ente": ente,
                                        "offset": offset}, quote_via=urllib.parse.quote)
            r = self.fetch(f"{API}?{q}", ttl=7 * DIA, antes=self._esperar)
            itens += r.get("items", [])
            if not r.get("hasMore"):
                return itens
            offset += len(r["items"])

    def _esperar(self):
        falta = self.pausa - (time.time() - self._ultima)
        if falta > 0:
            time.sleep(falta)
        self._ultima = time.time()


def nivel(cod_conta):
    """'RO1.7.1.1.51.0.0' -> ('1','7','1','1','51'): posição da conta na árvore, sem os zeros finais."""
    partes = cod_conta[2:].split(".")
    while partes and set(partes[-1]) <= {"0"}:
        partes.pop()
    return tuple(partes)


def receitas(itens):
    """{medida: valor líquido} a partir do Anexo I-C."""
    liquido = {}  # (cod_conta, nome) -> bruta - deduções
    for i in itens:
        sinal = 1 if i["coluna"].startswith("Receitas Brutas") else -1 if "Dedu" in i["coluna"] else 0
        chave = (i["cod_conta"], i["conta"])
        liquido[chave] = liquido.get(chave, 0.0) + sinal * (i["valor"] or 0.0)
    por_codigo = {}
    for (cod, _), v in liquido.items():
        por_codigo[cod] = por_codigo.get(cod, 0.0) + v
    contas = [(cod, nivel(cod), norm(nome), v) for (cod, nome), v in liquido.items() if cod[:1] == "R" and cod[2:3].isdigit()]

    m = {k: sum(v for _, nv, _, v in contas if nv == alvo and nv[0] in "12") for k, alvo in POR_NIVEL.items()}
    for k, trecho in POR_NOME.items():
        achadas = [(nv, v) for _, nv, nome, v in contas if trecho in nome and nv[:1] == ("1",)]
        # tira as contas-filhas quando a conta-mãe também casou, para não somar duas vezes
        m[k] = sum(v for nv, v in achadas if not any(o != nv and nv[:len(o)] == o for o, _ in achadas))
    intra = por_codigo.get("ReceitasIntraOrcamentarias")
    if intra is None:
        intra = sum(v for _, nv, _, v in contas if nv in (("7",), ("8",)))
    total = por_codigo.get("TotalReceitas")
    if total is None:
        total = por_codigo.get("ReceitasExcetoIntraOrcamentarias", 0.0) + intra
    m["rec_total"], m["rec_sem_intra"] = total, total - intra
    return m


def despesas(itens):
    """{medida: valor empenhado} a partir do Anexo I-E (despesas por função)."""
    emp = {}
    for i in itens:
        if i["coluna"] == "Despesas Empenhadas":
            emp[i["conta"].strip()] = emp.get(i["conta"].strip(), 0.0) + (i["valor"] or 0.0)
    m = {k: sum(v for nome, v in emp.items() if nome.startswith(prefixos)) for k, prefixos in FUNCOES.items()}
    intra = sum(v for nome, v in emp.items() if norm(nome).startswith("despesas intra"))
    exceto = [v for nome, v in emp.items() if norm(nome).startswith("despesas exceto intra")]
    if exceto:
        m["desp_total"], m["desp_sem_intra"] = exceto[0] + intra, exceto[0]
    else:
        # até 2016 o anexo não traz as linhas de total nem as intraorçamentárias: soma as funções
        # ("01 - Legislativa", "10 - Saúde"...) e deixa o total para o Anexo I-D (ver medidas)
        m["desp_total"] = None
        m["desp_sem_intra"] = sum(v for nome, v in emp.items() if nome[:2].isdigit() and nome[2:5] == " - ")
    return m


def medidas(api, ano, ente):
    """Todas as medidas de um município em um ano; None se a prefeitura não entregou a DCA."""
    rec = api.dca(ano, "I-C", ente)
    if not rec:
        return None
    m = receitas(rec)
    m.update(despesas(api.dca(ano, "I-E", ente)))
    if m["desp_total"] is None:
        m["desp_total"] = sum(i["valor"] or 0.0 for i in api.dca(ano, "I-D", ente)
                              if i["coluna"] == "Despesas Empenhadas" and i["cod_conta"] == "TotalDespesas")
    m["populacao"] = next((i["populacao"] for i in rec if i.get("populacao")), None)
    m["resultado"] = m["rec_sem_intra"] - m["desp_sem_intra"]
    return m


def valor(code, grupo):
    """Calcula o indicador para um território = lista de medidas de seus municípios (None se faltar algum)."""
    if not grupo or any(g is None for g in grupo):
        return None
    regra = INDICADORES[code]
    if isinstance(regra, str):
        return sum(g[regra] for g in grupo)
    num, den, fator = regra
    if any(g[den] is None for g in grupo):
        return None
    d = sum(g[den] for g in grupo)
    return sum(g[num] for g in grupo) / d * fator if d else None


def coletar(api, comcam, parana, anos, quais, avisar=lambda *_: None):
    saida = Saida()
    try:
        for ano in anos:
            base = {c: medidas(api, ano, c) for c in comcam if avisar(ano, c) is None}
            if base.get(MUNICIPIO) is None and all(v is None for v in base.values()):
                continue  # ninguém entregou ainda: não grava o ano
            territorios = [(T_MUN, [base[MUNICIPIO]]), (T_REG, [base[c] for c in comcam])]
            if parana:
                # município sem DCA no ano fica fora da soma do estado (são poucos; o total é aproximado)
                todos = [base[c] if c in base else medidas(api, ano, c) for c in parana if avisar(ano, c) is None]
                territorios.append((T_UF, [m for m in todos if m is not None]))
            for code in quais:
                for territorio, grupo in territorios:
                    saida.add(code, territorio, ano, valor(code, grupo))
        for code in quais:
            saida.resumo(code)
    except Exception as e:  # noqa: BLE001 - grava o que já foi coletado
        saida.falhou("SICONFI", e)
    return saida


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--desde", type=int, default=2015)
    ap.add_argument("--ate", type=int, default=datetime.date.today().year - 1, help="último exercício (padrão: ano passado)")
    ap.add_argument("--so", help="códigos separados por vírgula (ex.: GP-008,SAU-009)")
    ap.add_argument("--parana", action="store_true", help="soma os 399 municípios do PR (2 consultas por município/ano)")
    ap.add_argument("--saida", default=str(DIR_CSV / "valores-siconfi.csv"))
    a = ap.parse_args()
    quais = filtrar_codigos(a.so, INDICADORES)
    ibge = Ibge()
    comcam = codigos_comcam(ibge)
    parana = [str(m["id"]) for m in ibge.fetch(f"/v1/localidades/estados/{UF_PR}/municipios")] if a.parana else None

    def avisar(ano, ente):
        print(f"\r{ano} município {ente}   ", end="", file=sys.stderr, flush=True)

    saida = coletar(Siconfi(), comcam, parana, range(a.desde, a.ate + 1), quais, avisar)
    print(file=sys.stderr)
    saida.gravar(a.saida)


if __name__ == "__main__":
    main()
