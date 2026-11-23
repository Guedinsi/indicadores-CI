#!/usr/bin/env python3
"""Baixa os índices da FIRJAN (planilhas públicas .xlsx, sem cadastro) e gera
docs/dados/csv/valores-firjan.csv no formato do importador de valores.

- IFGF (Índice Firjan de Gestão Fiscal): geral + Autonomia, Gastos com Pessoal, Liquidez, Investimentos.
- IFDM (Índice Firjan de Desenvolvimento Municipal): geral + Educação, Saúde, Emprego & Renda
  e a posição de Campo Mourão nos rankings estadual e nacional.

Uso (na raiz do repositório, com internet):
    python3 docs/dados/scripts/baixar_firjan.py
    python3 docs/dados/scripts/baixar_firjan.py --so GP-013,GP-014
    python3 docs/dados/scripts/baixar_firjan.py --ifgf-url https://.../novo.xlsx   # se a Firjan trocar o link

Os índices não se somam, então só Campo Mourão recebe valor (a planilha não traz COMCAM/PR/Brasil).
A cada edição a Firjan publica uma planilha nova, com outro endereço: o script procura o link na
página de downloads; se não achar, usa o último endereço conhecido (constantes abaixo).

Atenção: a metodologia do IFGF mudou (edição 2025). A série desta planilha (2013 em diante) NÃO é
comparável com os números antigos do documento do IPPLAN (ex.: 0,2672 para 2016).
"""
import argparse
import re
import urllib.parse

from comum import DIA, DIR_CSV, MUNICIPIO, T_MUN, Saida, baixar, baixar_arquivo, filtrar_codigos, ler_xlsx, norm

SITE = "https://www.firjan.com.br"
IFGF_URL = SITE + "/data/files/86/20/2F/AC/1345991031B91689D8284EA8/Evolucao_por_Indicador_2013_a_2024_IFGF_2025.xlsx"
IFDM_URL = SITE + "/data/files/09/42/7A/34/0EFA6910734FAA69D8284EA8/Serie-Historica-IFDM-2013-a-2023.xlsx"
PAGINAS = {"ifgf": [SITE + "/ifgf/", SITE + "/ifgf/downloads/"], "ifdm": [SITE + "/ifdm/downloads/", SITE + "/ifdm/"]}
PADRAO_LINK = {"ifgf": r"evolucao[^\"']*ifgf[^\"']*\.xlsx", "ifdm": r"serie-historica-ifdm[^\"']*\.xlsx"}

# code: (planilha, trecho do nome da aba, prefixo do cabeçalho da coluna — sem acento, minúsculo)
ESPEC = {
    "GP-013": ("ifgf", "geral", "ifgf"),
    "GP-034": ("ifgf", "autonomia", "ifgf autonomia"),
    "GP-035": ("ifgf", "gastos com pessoal", "ifgf gastos com pessoal"),
    "GP-036": ("ifgf", "liquidez", "ifgf liquidez"),
    "GP-037": ("ifgf", "investimentos", "ifgf investimentos"),
    "GP-014": ("ifdm", "geral", "ifdm"),
    "GP-038": ("ifdm", "geral", "ranking estadual ifdm"),
    "GP-039": ("ifdm", "geral", "ranking ifdm"),
    "GP-040": ("ifdm", "educacao", "ifdm educacao"),
    "GP-041": ("ifdm", "saude", "ifdm saude"),
    "GP-042": ("ifdm", "emprego", "ifdm emprego"),
}


def achar_link(qual, padrao_url):
    """Procura o .xlsx mais recente nas páginas da Firjan; cai no endereço conhecido se não achar."""
    for pagina in PAGINAS[qual]:
        try:
            html = baixar(pagina, ttl=DIA, tentativas=2).decode("utf-8", "ignore")
        except RuntimeError:
            continue
        achados = re.findall(r"[\"']([^\"']*/data/files/[^\"']*)[\"']", html)
        achados = [a for a in achados if re.search(PADRAO_LINK[qual], a, re.I)]
        if achados:
            return urllib.parse.urljoin(pagina, achados[0])  # o link pode vir relativo ("../../data/files/...")
    return padrao_url


def series_do_municipio(caminho, codigo6):
    """{trecho_aba: {cabecalho_sem_ano: {ano: valor}}} só da linha do município."""
    out = {}
    for nome_aba, linhas in ler_xlsx(caminho).items():
        cab, achou = None, {}
        for linha in linhas:
            if cab is None:
                cab = linha
                continue
            if str(linha.get("A", "")).split(".")[0] == codigo6:
                for col, titulo in cab.items():
                    m = re.fullmatch(r"(.*?)\s*((?:19|20)\d\d)", norm(titulo))
                    if not m or linha.get(col) in (None, ""):
                        continue
                    try:
                        achou.setdefault(m.group(1), {})[m.group(2)] = float(linha[col])
                    except ValueError:
                        pass  # "*", "n.d." = município sem dado naquele ano
                break
        out[norm(nome_aba)] = achou
    return out


def coletar(arquivos, quais, desde):
    saida, cache = Saida(), {}
    for code in quais:
        qual, aba, coluna = ESPEC[code]
        try:
            if qual not in cache:
                try:
                    cache[qual] = series_do_municipio(arquivos[qual](), MUNICIPIO[:6])
                except Exception as e:  # noqa: BLE001 - não baixa de novo para cada indicador da mesma planilha
                    cache[qual] = e
            if isinstance(cache[qual], Exception):
                raise cache[qual]
            abas = [v for nome, v in cache[qual].items() if aba in nome]
            if len(abas) != 1:
                raise LookupError(f"aba com '{aba}' deu {len(abas)} resultados. Abas: {list(cache[qual])}")
            if coluna not in abas[0]:
                raise LookupError(f"coluna '{coluna}' não encontrada. Colunas: {list(abas[0])}")
            saida.serie(code, T_MUN, abas[0][coluna], desde)
            saida.resumo(code)
        except Exception as e:  # noqa: BLE001 - seguir para os próximos indicadores
            saida.falhou(code, e)
    return saida


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--desde", type=int, default=2013)
    ap.add_argument("--so", help="códigos separados por vírgula (ex.: GP-013,GP-014)")
    ap.add_argument("--ifgf-url", help="endereço da planilha do IFGF (padrão: procura no site)")
    ap.add_argument("--ifdm-url", help="endereço da planilha do IFDM (padrão: procura no site)")
    ap.add_argument("--saida", default=str(DIR_CSV / "valores-firjan.csv"))
    a = ap.parse_args()
    quais = filtrar_codigos(a.so, ESPEC)

    def arquivo(qual, informado, padrao):
        def baixa():
            url = informado or achar_link(qual, padrao)
            print(f"{qual.upper()}: {url}")
            return baixar_arquivo(url, f"firjan-{qual}.xlsx", ttl=7 * DIA)
        return baixa

    saida = coletar({"ifgf": arquivo("ifgf", a.ifgf_url, IFGF_URL), "ifdm": arquivo("ifdm", a.ifdm_url, IFDM_URL)},
                    quais, a.desde)
    saida.gravar(a.saida)


if __name__ == "__main__":
    main()
