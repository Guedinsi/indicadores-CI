#!/usr/bin/env python3
"""Baixa o crédito rural do Banco Central (SICOR - Matriz de Dados do Crédito Rural, API pública
OData "Olinda", sem cadastro) e gera docs/dados/csv/valores-bcb.csv no formato do importador de valores.

Indicadores, por ano de emissão do contrato: valor e número de contratos de financiamento à
agricultura e à pecuária (custeio + investimento + comercialização + industrialização).

Uso (na raiz do repositório, com internet):
    python3 docs/dados/scripts/baixar_bcb.py                # Campo Mourão, de 2020 até o último ano completo
    python3 docs/dados/scripts/baixar_bcb.py --desde 2023
    python3 docs/dados/scripts/baixar_bcb.py --so AGR-014,AGR-015

Limitações (conferidas na própria API):
- O servidor do BC é LENTO e instável nesta consulta: ~1,5 minuto por ano quando responde, e com
  frequência devolve erro 500/504 (o script tenta 2 vezes por ano e segue; o ano que falhar aparece
  como FALHOU e pode ser repetido depois com --desde/--ate). Por isso só Campo Mourão é baixado;
  filtrar o estado inteiro dá timeout.
  Para COMCAM/Paraná use a Base dos Dados (br_bcb_sicor), via baixar_basedosdados.py.
- Anos já fechados ficam em cache por 30 dias; o ano corrente, por 1 dia.
"""
import argparse
import datetime
import urllib.parse

from comum import DIA, DIR_CSV, MUNICIPIO, T_MUN, Saida, filtrar_codigos, get_json

API = "https://olinda.bcb.gov.br/olinda/servico/SICOR/versao/v2/odata/CusteioInvestimentoComercialIndustrialSemFiltros"
FINALIDADES = ["Custeio", "Investimento", "Comercializacao", "Industrializacao"]
# code: (atividades do SICOR: "1" agrícola, "2" pecuária; prefixo do campo: Vl = valor, Qtd = contratos)
ESPEC = {
    "AGR-008": (("1", "2"), "Vl"),
    "AGR-014": (("1",), "Vl"),
    "AGR-015": (("1",), "Qtd"),
    "AGR-016": (("2",), "Vl"),
    "AGR-017": (("2",), "Qtd"),
}


def linhas(ano, municipio, fetch=get_json):
    filtro = f"codMunicIbge eq '{municipio}' and AnoEmissao eq '{ano}'"
    q = urllib.parse.urlencode({"$format": "json", "$filter": filtro}, quote_via=urllib.parse.quote)
    ttl = DIA if int(ano) >= datetime.date.today().year else 30 * DIA
    return fetch(f"{API}?{q}", ttl=ttl, timeout=200, tentativas=2)["value"]


def somar(itens, atividades, prefixo):
    return sum(i.get(prefixo + f) or 0 for i in itens if i.get("Atividade") in atividades for f in FINALIDADES)


def avisar_na_hora(msg):
    print(msg, flush=True)


def coletar(anos, quais, fetch=get_json, avisar=avisar_na_hora):
    saida = Saida()
    for ano in anos:
        try:
            avisar(f"SICOR {ano}: consultando o Banco Central (pode levar 1 a 2 minutos)...")
            itens = linhas(ano, MUNICIPIO, fetch)
            for code in quais:
                saida.add(code, T_MUN, ano, somar(itens, *ESPEC[code]) if itens else None)
        except Exception as e:  # noqa: BLE001 - seguir para o próximo ano
            saida.falhou(f"SICOR {ano}", e)
    for code in quais:
        saida.resumo(code)
    return saida


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--desde", type=int, default=2020)
    ap.add_argument("--ate", type=int, default=datetime.date.today().year - 1,
                    help="último ano (padrão: ano passado; o ano corrente está incompleto e pareceria uma queda)")
    ap.add_argument("--so", help="códigos separados por vírgula (ex.: AGR-014,AGR-015)")
    ap.add_argument("--saida", default=str(DIR_CSV / "valores-bcb.csv"))
    a = ap.parse_args()
    quais = filtrar_codigos(a.so, ESPEC)
    coletar(range(a.desde, a.ate + 1), quais).gravar(a.saida)


if __name__ == "__main__":
    main()
