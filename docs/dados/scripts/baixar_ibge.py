#!/usr/bin/env python3
"""Baixa indicadores do IBGE (API pública SIDRA/Agregados, sem cadastro e sem chave)
e gera docs/dados/csv/valores-ibge.csv no formato do importador de valores.

Uso (na raiz do repositório, com internet):
    python3 docs/dados/scripts/baixar_ibge.py                 # tudo, de 2015 em diante
    python3 docs/dados/scripts/baixar_ibge.py --desde 2010
    python3 docs/dados/scripts/baixar_ibge.py --so AGR-005,GP-005
    python3 docs/dados/scripts/baixar_ibge.py --listar 5938   # mostra variáveis/categorias de uma tabela

Territórios: Campo Mourão (MUNICIPIO/4104303), Paraná (ESTADO/41), Brasil (PAIS/BR) e
COMCAM (REGIAO/COMCAM) = SOMA dos municípios da região (só onde a soma é válida, e só
quando TODOS os municípios têm dado naquele ano; senão fica vazio = "sem dado").

Os códigos das variáveis e categorias são procurados PELO NOME nos metadados do IBGE, então
o script avisa (e lista as opções) se algum nome mudou, em vez de gravar o dado errado.
"""
import argparse
import csv
import gzip
import json
import sys
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

BASE = "https://servicodados.ibge.gov.br/api"
MUNICIPIO, ESTADO_UF, UF_PR = "4104303", "PR", "41"

# 25 municípios da COMCAM conforme a tabela de IDEB do documento do IPPLAN
COMCAM = [
    "Altamira do Paraná", "Araruna", "Barbosa Ferraz", "Boa Esperança", "Campina da Lagoa",
    "Campo Mourão", "Corumbataí do Sul", "Engenheiro Beltrão", "Farol", "Fênix", "Goioerê",
    "Iretama", "Janiópolis", "Juranda", "Luiziana", "Mamborê", "Moreira Sales", "Nova Cantu",
    "Peabiru", "Quarto Centenário", "Quinta do Sol", "Rancho Alegre d'Oeste", "Roncador",
    "Terra Boa", "Ubiratã",
]

# code: (tabela, tokens do nome da variável, tokens a excluir, categoria (ou None), soma na COMCAM?)
ESPEC = {
    "DEM-001": (6579, ["populacao residente estimada"], [], None, True),
    "GP-005": (5938, ["produto interno bruto per capita"], [], None, False),  # COMCAM: PIB/população
    "GP-006": (5938, ["valor adicionado bruto", "total"], [], None, True),
    "GP-018": (5938, ["valor adicionado bruto", "agropecuaria"], [], None, True),
    "GP-019": (5938, ["valor adicionado bruto", "industria"], [], None, True),
    "GP-020": (5938, ["valor adicionado bruto", "servicos", "exclusive"], [], None, True),
    "GP-021": (5938, ["valor adicionado bruto", "administracao"], ["exclusive"], None, True),
    "AGR-002": (3939, ["efetivo dos rebanhos"], [], "bovino", True),
    "AGR-003": (3939, ["efetivo dos rebanhos"], [], "suino - total", True),
    "AGR-004": (3939, ["efetivo dos rebanhos"], [], "galinaceos - total", True),
    "AGR-005": (5457, ["quantidade produzida"], [], "soja (em grao)", True),
    "AGR-006": (5457, ["quantidade produzida"], [], "milho (em grao)", True),
    "AGR-007": (5457, ["quantidade produzida"], [], "trigo (em grao)", True),
}
PIB_TOTAL = (5938, ["produto interno bruto", "correntes"], ["per capita"], None, True)


def norm(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return " ".join(s.replace("'", " ").replace("’", " ").split())


def get_json(path):
    url = path if path.startswith("http") else BASE + path
    req = urllib.request.Request(url, headers={"User-Agent": "indicadores-ci/1.0", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        dados = r.read()
    if dados[:2] == b"\x1f\x8b":  # o IBGE pode responder comprimido (gzip) mesmo sem pedir
        dados = gzip.decompress(dados)
    return json.loads(dados.decode("utf-8"))


class Ibge:
    def __init__(self, fetch=get_json):
        self.fetch = fetch
        self._meta = {}

    def meta(self, agg):
        if agg not in self._meta:
            self._meta[agg] = self.fetch(f"/v3/agregados/{agg}/metadados")
        return self._meta[agg]

    def periodos(self, agg, desde):
        ids = [p["id"] for p in self.fetch(f"/v3/agregados/{agg}/periodos")]
        return [p for p in ids if p[:4].isdigit() and int(p[:4]) >= desde and len(p) == 4]

    def variavel(self, agg, tokens, excluir):
        achadas = [v for v in self.meta(agg)["variaveis"]
                   if all(t in norm(v["nome"]) for t in tokens) and not any(e in norm(v["nome"]) for e in excluir)]
        if len(achadas) != 1:
            nomes = "; ".join(f'{v["id"]}={v["nome"]}' for v in self.meta(agg)["variaveis"])
            raise LookupError(f"tabela {agg}: variável {tokens} deu {len(achadas)} resultados. Opções: {nomes}")
        return achadas[0]["id"]

    def categoria(self, agg, nome):
        achadas = [(c["id"], cat["id"], cat["nome"]) for c in self.meta(agg).get("classificacoes", [])
                   for cat in c["categorias"] if norm(cat["nome"]) == nome]
        if len(achadas) != 1:
            ops = "; ".join(f'{c["id"]}[{cat["id"]}]={cat["nome"]}' for c in self.meta(agg).get("classificacoes", [])
                            for cat in c["categorias"] if nome.split()[0] in norm(cat["nome"]))
            raise LookupError(f"tabela {agg}: categoria '{nome}' deu {len(achadas)} resultados. Parecidas: {ops}")
        return achadas[0][0], achadas[0][1]

    def serie(self, agg, var, periodos, locais, classif=None):
        """Retorna {(nivel, id_local): {ano: float|None}}."""
        q = f"/v3/agregados/{agg}/periodos/{'|'.join(periodos)}/variaveis/{var}?localidades={locais}"
        if classif:
            q += f"&classificacao={classif[0]}[{classif[1]}]"
        q = urllib.parse.quote(q, safe="/?=&[],|")
        out = {}
        for var_res in self.fetch(q):
            for res in var_res["resultados"]:
                for s in res["series"]:
                    loc = s["localidade"]
                    out[(loc["nivel"]["id"], str(loc["id"]))] = {
                        ano[:4]: num(v) for ano, v in s["serie"].items()}
        return out


def num(v):
    if v is None:
        return None
    v = str(v).strip()
    if v == "-":
        return 0.0  # zero absoluto (convenção do IBGE)
    try:
        return float(v)
    except ValueError:
        return None  # "X", "..", "..." = sem dado / sigilo


def codigos_comcam(ibge):
    munis = ibge.fetch(f"/v1/localidades/estados/{UF_PR}/municipios")
    por_nome = {norm(m["nome"]): str(m["id"]) for m in munis}
    faltam = [n for n in COMCAM if norm(n) not in por_nome]
    if faltam:
        raise LookupError(f"municípios da COMCAM não encontrados no IBGE: {faltam}")
    return [por_nome[norm(n)] for n in COMCAM]


def soma_regiao(series, codigos, anos):
    out = {}
    for ano in anos:
        vals = [series.get(("N6", c), {}).get(ano) for c in codigos]
        out[ano] = None if any(v is None for v in vals) else sum(vals)
    return out


def coletar(ibge, codigos, desde, quais):
    locais = f"N6[{','.join(codigos)}]|N3[{UF_PR}]|N1[all]"
    linhas, relatorio = [], []
    cache_pop = cache_pib = None
    for code in quais:
        agg, tokens, excl, cat, somar = ESPEC[code]
        try:
            periodos = ibge.periodos(agg, desde)
            var = ibge.variavel(agg, tokens, excl)
            classif = ibge.categoria(agg, cat) if cat else None
            s = ibge.serie(agg, var, periodos, locais, classif)
            anos = sorted({a for d in s.values() for a in d})
            regional = soma_regiao(s, codigos, anos) if somar else None
            if code == "GP-005":  # PIB per capita da região = PIB total / população
                pib = ibge.serie(*PIB_TOTAL[:1], ibge.variavel(*PIB_TOTAL[:3]), periodos, locais)
                pa, pv, pexc, _, _ = ESPEC["DEM-001"]
                pop = ibge.serie(pa, ibge.variavel(pa, pv, pexc), periodos, locais)
                sp, sq = soma_regiao(pib, codigos, anos), soma_regiao(pop, codigos, anos)
                regional = {a: (sp[a] * 1000 / sq[a] if sp[a] is not None and sq[a] else None) for a in anos}
            destinos = [("MUNICIPIO", MUNICIPIO, s.get(("N6", MUNICIPIO), {})),
                        ("ESTADO", UF_PR, s.get(("N3", UF_PR), {})),
                        ("PAIS", "BR", s.get(("N1", "1"), {}))]
            if regional is not None:
                destinos.insert(1, ("REGIAO", "COMCAM", regional))
            n = 0
            for tipo, cod, d in destinos:
                for ano in anos:
                    v = d.get(ano)
                    linhas.append([code, tipo, cod, ano, "" if v is None else repr(round(v, 4)).rstrip("0").rstrip(".")])
                    n += v is not None
            relatorio.append((code, "OK", f"{n} valores, anos {anos[0]}-{anos[-1]}" if anos else "sem períodos"))
        except Exception as e:  # noqa: BLE001 - queremos seguir para os próximos indicadores
            relatorio.append((code, "FALHOU", str(e)[:600]))
    return linhas, relatorio


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--desde", type=int, default=2015)
    ap.add_argument("--so", help="códigos separados por vírgula (ex.: AGR-005,GP-005)")
    ap.add_argument("--listar", help="número da tabela SIDRA: lista variáveis e categorias")
    ap.add_argument("--saida", default=str(Path(__file__).resolve().parent.parent / "csv" / "valores-ibge.csv"))
    a = ap.parse_args()
    ibge = Ibge()

    if a.listar:
        m = ibge.meta(int(a.listar))
        print(m["nome"])
        for v in m["variaveis"]:
            print("  variável", v["id"], v["nome"])
        for c in m.get("classificacoes", []):
            print("  classificação", c["id"], c["nome"])
            for cat in c["categorias"][:60]:
                print("     ", cat["id"], cat["nome"])
        return

    quais = [c.strip().upper() for c in a.so.split(",")] if a.so else list(ESPEC)
    desconhecidos = [c for c in quais if c not in ESPEC]
    if desconhecidos:
        sys.exit(f"Códigos desconhecidos: {desconhecidos}. Válidos: {', '.join(ESPEC)}")
    codigos = codigos_comcam(ibge)
    linhas, relatorio = coletar(ibge, codigos, a.desde, quais)

    Path(a.saida).parent.mkdir(parents=True, exist_ok=True)
    with open(a.saida, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["indicator_code", "territory_type", "territory_code", "period", "value"])
        w.writerows(linhas)
    print(f"\nArquivo: {a.saida} ({len(linhas)} linhas)\n")
    for code, st, msg in relatorio:
        print(f"{st:7} {code:8} {msg}")


if __name__ == "__main__":
    main()
