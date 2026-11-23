#!/usr/bin/env python3
"""Baixa indicadores da Base dos Dados (https://basedosdados.org) pelo BigQuery e gera
docs/dados/csv/valores-basedosdados.csv no formato do importador de valores.

Só entra aqui o que NÃO tem download direto simples (microdados grandes do MTE e do DATASUS):
- RAIS  (br_me_rais):  empregos formais em 31/12, estabelecimentos, setores e Atividades Características do Turismo
- CAGED (br_me_caged): admissões e desligamentos por ano (Novo CAGED, 2020 em diante), total e por setor
- CNES  (br_ms_cnes):  leitos existentes

DIFERENTE dos outros scripts, este precisa de preparo (uma vez só):
  1. Conta Google + um projeto no Google Cloud (grátis): https://console.cloud.google.com/projectcreate
     O BigQuery dá 1 TB de consulta grátis por mês; o conjunto completo deste script usa bem menos que isso.
  2. pip install basedosdados
  3. Guardar o ID do projeto:  export BD_BILLING_PROJECT_ID=meu-projeto-123   (ou passar --projeto)
  Na primeira execução o pacote abre o navegador para autorizar a conta Google.

Uso (na raiz do repositório):
    python3 docs/dados/scripts/baixar_basedosdados.py --mostrar-sql        # só imprime as consultas (não precisa de conta)
    python3 docs/dados/scripts/baixar_basedosdados.py                      # tudo, de 2015 em diante
    python3 docs/dados/scripts/baixar_basedosdados.py --so rais_vinculos   # um grupo (ver GRUPOS)
    python3 docs/dados/scripts/baixar_basedosdados.py --sem-brasil         # só PR: consulta bem menor (sem coluna Brasil)

Conferido em 16/11/2026 contra o documento do IPPLAN (valores idênticos):
- RAIS empregos: Campo Mourão 2016 = 25.476 e 2017 = 24.931; Paraná 3.013.105 e 3.028.192.
- RAIS estabelecimentos = os que NÃO são "RAIS negativa" (tiveram empregado no ano): Campo Mourão
  2016 = 3.277 e 2017 = 3.181; comércio varejista 1.141; construção civil 333.
- CAGED 2025: Paraná 2.023.090 admissões e saldo 80.587; COMCAM 33.859 admissões e saldo 1.116.
- Leitos de internação 2025: Campo Mourão 234; Paraná 27.392.
- ACTs (turismo), Paraná 2016: alojamento 1.817, alimentação 14.857, transporte terrestre 1.264,
  aéreo 36, agências 950 e aluguel 271 batem. Ainda APROXIMADOS: transporte aquaviário (27 contra 21)
  e cultura e lazer (925 contra 788), e por isso o total das ACTs (GP-003) fica ~0,7% acima.
  A lista oficial desses dois grupos deve ser por subclasse CNAE; não deu para deduzi-la dos números.
Custo: o conjunto completo lê ~45 GB do 1 TB grátis por mês do BigQuery (~5 GB com --sem-brasil).
"""
import argparse
import datetime
import os
import sys

from baixar_ibge import Ibge, codigos_comcam
from comum import DIR_CSV, MUNICIPIO, T_BR, T_MUN, T_REG, T_UF, Saida

UF = "PR"
# Atividades Características do Turismo: classe CNAE 2.0 (5 dígitos) por grupo
ACTS = {
    "GP-057": ["55108", "55906"],                                                  # alojamento
    "GP-058": ["56112", "56121"],                                                  # alimentação
    "GP-059": ["49221", "49230", "49299", "49507"],                                # transporte terrestre
    "GP-060": ["51111", "51129"],                                                  # transporte aéreo
    "GP-061": ["50114", "50122", "50220", "50912", "50998"],                       # transporte aquaviário
    "GP-062": ["79112", "79121", "79902"],                                         # agências de viagem
    "GP-063": ["77110"],                                                           # aluguel de transportes
    "GP-064": ["90019", "90027", "90035", "91023", "91031", "92003", "93115", "93191", "93212", "93298"],  # cultura e lazer
}
SUBSETORES = {"GP-053": [16], "GP-054": [15], "GP-055": [21], "GP-056": [25]}  # estabelecimentos por subsetor IBGE
SETORES_CAGED = {"EMP-004": ["G"], "EMP-006": ["B", "C", "D", "E"], "EMP-008": list("HIJKLMNOPQRSTU")}  # admissões; +1 = desligamentos


def lista(valores):
    return ", ".join(f"'{v}'" for v in valores)


def territorios(expr, comcam, brasil):
    """Colunas municipio/regiao/estado/pais somando `expr` (1 para contar linhas)."""
    condicoes = {"municipio": f"id_municipio = '{MUNICIPIO}'", "regiao": f"id_municipio IN ({lista(comcam)})",
                 "estado": f"sigla_uf = '{UF}'"}
    colunas = [f"  SUM(IF({cond}, {expr}, 0)) AS {nome}" for nome, cond in condicoes.items()]
    colunas.append("  " + (f"SUM({expr})" if brasil else "CAST(NULL AS INT64)") + " AS pais")
    return ",\n".join(colunas)


def onde(desde, ate, brasil, extra=""):
    filtros = [f"ano BETWEEN {desde} AND {ate}"] + ([] if brasil else [f"sigla_uf = '{UF}'"]) + ([extra] if extra else [])
    return "WHERE " + "\n  AND ".join(filtros)


def codes(fixos, condicionais):
    """ARRAY de códigos de indicador em que a linha entra: os fixos + os que passam na condição."""
    partes = [f"[{lista(fixos)}]"] + [f"IF({cond}, ['{code}'], ARRAY<STRING>[])" for code, cond in condicionais.items()]
    return "UNNEST(ARRAY_CONCAT(\n    " + ",\n    ".join(partes) + "\n  )) AS code"


def sql_rais_vinculos(comcam, desde, ate, brasil):
    return (f"SELECT ano, 'GP-001' AS code,\n{territorios('1', comcam, brasil)}\n"
            "FROM `basedosdados.br_me_rais.microdados_vinculos`\n"
            + onde(desde, ate, brasil, "vinculo_ativo_3112 = '1'") + "\nGROUP BY ano, code")


def sql_rais_estabelecimentos(comcam, desde, ate, brasil):
    classe = "SUBSTR(cnae_2_subclasse, 1, 5)"
    todas = [c for cs in ACTS.values() for c in cs]
    cond = {code: f"SAFE_CAST(subsetor_ibge AS INT64) IN ({', '.join(map(str, subs))})" for code, subs in SUBSETORES.items()}
    cond["GP-003"] = f"{classe} IN ({lista(todas)})"
    cond.update({code: f"{classe} IN ({lista(cs)})" for code, cs in ACTS.items()})
    return (f"SELECT ano, code,\n{territorios('1', comcam, brasil)}\n"
            "FROM `basedosdados.br_me_rais.microdados_estabelecimentos`,\n  "
            f"{codes(['GP-002'], cond)}\n"
            f"{onde(desde, ate, brasil, 'indicador_rais_negativa = 0')}\nGROUP BY ano, code")


def sql_caged(comcam, desde, ate, brasil):
    def par(adm):  # EMP-004 (admissões) -> EMP-005 (desligamentos)
        return f"IF(saldo_movimentacao = 1, '{adm}', 'EMP-{int(adm[4:]) + 1:03d}')"
    partes = [f"[{par('EMP-001')}]"] + [f"IF(cnae_2_secao IN ({lista(secoes)}), [{par(code)}], ARRAY<STRING>[])"
                                        for code, secoes in SETORES_CAGED.items()]
    unnest = "UNNEST(ARRAY_CONCAT(\n    " + ",\n    ".join(partes) + "\n  )) AS code"
    return (f"SELECT ano, code,\n{territorios('1', comcam, brasil)}\n"
            f"FROM `basedosdados.br_me_caged.microdados_movimentacao`,\n  {unnest}\n"
            f"{onde(max(desde, 2020), ate, brasil, 'saldo_movimentacao IN (1, -1)')}\nGROUP BY ano, code")


def sql_cnes_leitos(comcam, desde, ate, brasil):
    """Leitos de internação (sem os complementares/UTI, tipo_leito 3) no último mês disponível de cada ano.
    É o critério do "Leitos hospitalares existentes" do DATASUS/IPARDES."""
    return ("WITH base AS (\n  SELECT ano, mes, id_municipio, sigla_uf, quantidade_total\n"
            "  FROM `basedosdados.br_ms_cnes.leito`\n  "
            + onde(desde, ate + 1, brasil, "tipo_leito != '3'").replace(chr(10), chr(10) + "  ") + "\n),\n"
            "ultimo AS (SELECT ano, MAX(mes) AS mes FROM base GROUP BY ano)\n"
            f"SELECT ano, 'SAU-002' AS code,\n{territorios('quantidade_total', comcam, brasil)}\n"
            "FROM base JOIN ultimo USING (ano, mes)\nGROUP BY ano, code")


GRUPOS = {
    "rais_vinculos": sql_rais_vinculos,
    "rais_estabelecimentos": sql_rais_estabelecimentos,
    "caged": sql_caged,
    "cnes_leitos": sql_cnes_leitos,
}
COLUNAS = {"municipio": T_MUN, "regiao": T_REG, "estado": T_UF, "pais": T_BR}


def coletar(rodar, comcam, desde, ate, quais, brasil=True):
    """`rodar(sql)` devolve uma lista de dicts (ano, code, municipio, regiao, estado, pais)."""
    saida = Saida()
    for grupo in quais:
        try:
            vistos = set()
            for r in rodar(GRUPOS[grupo](comcam, desde, ate, brasil)):
                vistos.add(r["code"])
                for coluna, territorio in COLUNAS.items():
                    v = r.get(coluna)
                    if v is not None and v == v:  # v == v descarta NaN
                        saida.add(r["code"], territorio, int(r["ano"]), float(v))
            if grupo == "caged":  # saldo = admissões - desligamentos
                for (code, tipo, cod, periodo), adm in list(saida.linhas.items()):
                    desl = saida.linhas.get(("EMP-002", tipo, cod, periodo))
                    if code == "EMP-001" and desl is not None:
                        saida.add("EMP-003", (tipo, cod), periodo, adm - desl)
                        vistos.add("EMP-003")
            for code in sorted(vistos):
                saida.resumo(code)
            if not vistos:
                saida.falhou(grupo, "a consulta rodou, mas não devolveu linhas")
        except Exception as e:  # noqa: BLE001 - seguir para o próximo grupo
            saida.falhou(grupo, e)
    return saida


def rodar_bigquery(projeto):
    try:
        import basedosdados as bd
    except ImportError:
        sys.exit("Falta o pacote da Base dos Dados. Instale com:  pip install basedosdados")

    def rodar(sql):
        return bd.read_sql(query=sql, billing_project_id=projeto).to_dict("records")
    return rodar


def main():
    ano_passado = datetime.date.today().year - 1
    ap = argparse.ArgumentParser()
    ap.add_argument("--desde", type=int, default=2015)
    ap.add_argument("--ate", type=int, default=ano_passado, help="último ano completo (padrão: ano passado)")
    ap.add_argument("--so", help=f"grupos separados por vírgula: {', '.join(GRUPOS)}")
    ap.add_argument("--projeto", default=os.environ.get("BD_BILLING_PROJECT_ID"), help="ID do projeto no Google Cloud")
    ap.add_argument("--sem-brasil", action="store_true", help="consulta só o Paraná (mais barato; sem valor para o Brasil)")
    ap.add_argument("--mostrar-sql", action="store_true", help="imprime as consultas e sai, sem rodar nada")
    ap.add_argument("--saida", default=str(DIR_CSV / "valores-basedosdados.csv"))
    a = ap.parse_args()
    quais = [g.strip() for g in a.so.split(",")] if a.so else list(GRUPOS)
    ruins = [g for g in quais if g not in GRUPOS]
    if ruins:
        sys.exit(f"Grupos desconhecidos: {ruins}. Válidos: {', '.join(GRUPOS)}")
    comcam = codigos_comcam(Ibge())
    if a.mostrar_sql:
        for g in quais:
            print(f"-- {g}\n{GRUPOS[g](comcam, a.desde, a.ate, not a.sem_brasil)};\n")
        return
    if not a.projeto:
        sys.exit("Informe o projeto do Google Cloud: --projeto meu-projeto  (ou export BD_BILLING_PROJECT_ID=...). "
                 "Veja o preparo no início deste arquivo.")
    coletar(rodar_bigquery(a.projeto), comcam, a.desde, a.ate, quais, not a.sem_brasil).gravar(a.saida)


if __name__ == "__main__":
    main()
