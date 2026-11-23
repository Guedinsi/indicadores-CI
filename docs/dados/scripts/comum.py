"""Funções comuns aos scripts baixar_*.py. Só biblioteca padrão do Python (nada para instalar).

- baixar / get_json / baixar_arquivo: HTTP com novas tentativas e cache em disco (docs/dados/scripts/.cache).
- Saida: junta as linhas no formato do importador de valores, grava o CSV e imprime o relatório.
- soma_completa: soma regional que só vale quando TODOS os municípios têm dado (senão "sem dado").
- ler_xlsx: lê planilhas .xlsx sem depender de pandas/openpyxl.
"""
import csv
import gzip
import hashlib
import json
import re
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

from baixar_ibge import COMCAM, MUNICIPIO, UF_PR, norm  # noqa: F401 - reexportados para os outros scripts

DIR_CSV = Path(__file__).resolve().parent.parent / "csv"
DIR_CACHE = Path(__file__).resolve().parent / ".cache"
UA = "indicadores-ci/1.0"
CABECALHO = ["indicator_code", "territory_type", "territory_code", "period", "value"]
DIA = 24 * 3600

T_MUN = ("MUNICIPIO", MUNICIPIO)
T_REG = ("REGIAO", "COMCAM")
T_UF = ("ESTADO", UF_PR)
T_BR = ("PAIS", "BR")


def _requisicao(url, dados=None, cabecalhos=None):
    h = {"User-Agent": UA, "Accept": "*/*"}
    h.update(cabecalhos or {})
    return urllib.request.Request(url, data=dados, headers=h)


def _tentar(fn, url, tentativas):
    """Repete em erro de rede, limite de requisições (429) e erro do servidor (5xx)."""
    for n in range(tentativas):
        try:
            return fn()
        except urllib.error.HTTPError as e:
            if e.code not in (429, 500, 502, 503, 504) or n == tentativas - 1:
                raise RuntimeError(f"HTTP {e.code} em {url}") from e
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            if n == tentativas - 1:
                raise RuntimeError(f"sem conexão com {url}: {e}") from e
        time.sleep(2 ** (n + 1))


def baixar(url, *, ttl=None, tentativas=4, timeout=120, dados=None, cabecalhos=None, antes=None):
    """Devolve os bytes da resposta (GET, ou POST se `dados`). `ttl` em segundos liga o cache em disco.
    `antes()` é chamado logo antes de cada ida real à rede (serve para respeitar limite de requisições)."""
    arq = None
    if ttl:
        chave = hashlib.sha1(url.encode() + (dados or b"")).hexdigest()
        arq = DIR_CACHE / "http" / chave
        if arq.exists() and time.time() - arq.stat().st_mtime < ttl:
            return arq.read_bytes()

    def uma_vez():
        if antes:
            antes()
        with urllib.request.urlopen(_requisicao(url, dados, cabecalhos), timeout=timeout) as r:
            corpo = r.read()
        return gzip.decompress(corpo) if corpo[:2] == b"\x1f\x8b" else corpo

    corpo = _tentar(uma_vez, url, tentativas)
    if arq:
        arq.parent.mkdir(parents=True, exist_ok=True)
        arq.write_bytes(corpo)
    return corpo


def get_json(url, **kw):
    return json.loads(baixar(url, **kw).decode("utf-8"))


def baixar_arquivo(url, nome, *, ttl=DIA, tentativas=3, timeout=300):
    """Baixa um arquivo grande direto para o disco (sem carregar na memória) e devolve o caminho."""
    destino = DIR_CACHE / "arquivos" / nome
    if destino.exists() and destino.stat().st_size and time.time() - destino.stat().st_mtime < ttl:
        return destino
    destino.parent.mkdir(parents=True, exist_ok=True)
    tmp = destino.with_name(destino.name + ".parcial")

    def uma_vez():
        with urllib.request.urlopen(_requisicao(url), timeout=timeout) as r, open(tmp, "wb") as f:
            while bloco := r.read(1 << 20):
                f.write(bloco)
        tmp.replace(destino)
        return destino

    return _tentar(uma_vez, url, tentativas)


def fmt(v):
    """Número no formato do importador: ponto decimal, até 4 casas, vazio = sem dado."""
    if v is None:
        return ""
    v = round(float(v), 4)
    return str(int(v)) if v == int(v) else f"{v:.4f}".rstrip("0").rstrip(".")


def soma_completa(por_municipio, codigos):
    """{codigo: {periodo: valor}} -> {periodo: soma}; None se faltar o dado de algum município."""
    periodos = sorted({p for c in codigos for p in por_municipio.get(c, {})})
    out = {}
    for p in periodos:
        vals = [por_municipio.get(c, {}).get(p) for c in codigos]
        out[p] = None if any(v is None for v in vals) else sum(vals)
    return out


class Saida:
    """Acumula valores e o relatório de um script; grava o CSV no formato do importador."""

    def __init__(self):
        self.linhas = {}
        self.relatorio = []

    def add(self, code, territorio, periodo, valor):
        self.linhas[(code, territorio[0], territorio[1], str(periodo))] = valor

    def serie(self, code, territorio, por_periodo, desde=None):
        """Grava {periodo: valor}; devolve quantos valores preenchidos entraram."""
        n = 0
        for periodo in sorted(por_periodo):
            if desde and int(str(periodo)[:4]) < desde:
                continue
            self.add(code, territorio, periodo, por_periodo[periodo])
            n += por_periodo[periodo] is not None
        return n

    def ok(self, code, msg):
        self.relatorio.append((code, "OK", msg))

    def falhou(self, code, erro):
        self.relatorio.append((code, "FALHOU", str(erro)[:400]))

    def resumo(self, code):
        """Monta o 'OK' de um indicador a partir do que já foi adicionado."""
        ps = sorted(k[3] for k, v in self.linhas.items() if k[0] == code and v is not None)
        tipos = sorted({k[1] for k, v in self.linhas.items() if k[0] == code and v is not None})
        if ps:
            self.ok(code, f"{len(ps)} valores, {ps[0]} a {ps[-1]} ({', '.join(t.lower() for t in tipos)})")
        else:
            self.falhou(code, "a fonte respondeu, mas sem nenhum valor para os territórios")

    def gravar(self, caminho):
        caminho = Path(caminho)
        caminho.parent.mkdir(parents=True, exist_ok=True)
        with open(caminho, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(CABECALHO)
            for (code, tipo, cod, periodo), v in self.linhas.items():
                w.writerow([code, tipo, cod, periodo, fmt(v)])
        print(f"\nArquivo: {caminho} ({len(self.linhas)} linhas)\n")
        for code, st, msg in self.relatorio:
            print(f"{st:7} {code:8} {msg}")
        return sum(st == "FALHOU" for _, st, _ in self.relatorio)


def filtrar_codigos(so, validos):
    """Trata o --so do argparse: devolve a lista pedida ou encerra avisando os códigos inválidos."""
    if not so:
        return list(validos)
    quais = [c.strip().upper() for c in so.split(",") if c.strip()]
    ruins = [c for c in quais if c not in validos]
    if ruins:
        raise SystemExit(f"Códigos desconhecidos: {ruins}. Válidos: {', '.join(validos)}")
    return quais


_NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
_NS_REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"


def ler_xlsx(caminho):
    """Devolve {nome_da_aba: gerador de linhas}; cada linha é {letra_da_coluna: texto da célula}."""
    z = zipfile.ZipFile(caminho)
    textos = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.parse(z.open("xl/sharedStrings.xml")).getroot().iter(_NS + "si"):
            textos.append("".join(t.text or "" for t in si.iter(_NS + "t")))
    alvos = {r.get("Id"): r.get("Target") for r in ET.parse(z.open("xl/_rels/workbook.xml.rels")).getroot()}

    def linhas(arquivo):
        for _, el in ET.iterparse(z.open(arquivo)):
            if el.tag != _NS + "row":
                continue
            linha = {}
            for c in el:
                v, tipo = c.find(_NS + "v"), c.get("t")
                if tipo == "inlineStr":
                    valor = "".join(t.text or "" for t in c.iter(_NS + "t"))
                elif v is None or v.text is None:
                    continue
                else:
                    valor = textos[int(v.text)] if tipo == "s" else v.text
                linha[re.sub(r"\d", "", c.get("r"))] = valor
            el.clear()
            yield linha

    abas = {}
    for s in ET.parse(z.open("xl/workbook.xml")).getroot().iter(_NS + "sheet"):
        alvo = alvos[s.get(_NS_REL + "id")].lstrip("/")
        abas[s.get("name")] = linhas(alvo if alvo.startswith("xl/") else "xl/" + alvo)
    return abas
