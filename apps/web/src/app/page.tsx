"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import {
  API_URL,
  api,
  type Axis,
  type ComparisonItem,
  type ComparisonResponse,
  type IndicatorCard,
  type IndicatorKind,
  type SeriesResponse,
} from "@/lib/api";
import { AuthLink } from "@/components/auth-link";
import { EstadoVazio } from "@/components/estado-vazio";
import { Evolucao } from "@/components/evolucao";
import { formatarValor, leitura } from "@/lib/formatacao";

/** Territórios comparados no gráfico de evolução (códigos da tabela territory). */
const TERRITORIOS_COMPARADOS = [
  { codigo: "COMCAM", id: "REGIAO", nome: "COMCAM", comArtigo: "a COMCAM", cor: "#2563eb" },
  { codigo: "41", id: "ESTADO", nome: "Paraná", comArtigo: "o Paraná", cor: "#d97706" },
];

/** Resultado de uma requisição junto com a chave dos filtros usados nela. */
type Loaded<T> = { key: string; data: T } | null;

const LIMITE_CARDS = 12;

function formatarParticipacao(parte: number, todo: number): string {
  const pct = (parte / todo) * 100;
  if (pct < 0.01) return "menos de 0,01%";
  return `${pct.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

function mensagemDeErro(e: unknown): string {
  return e instanceof Error ? e.message : "erro desconhecido";
}

function ParticipacaoComparativo({
  itens,
  unidade,
  mostrarParticipacao,
}: {
  itens: ComparisonItem[];
  unidade: string | null;
  mostrarParticipacao: boolean;
}) {
  const municipio = itens.find((i) => i.type === "MUNICIPIO")?.value ?? null;

  return (
    <ul className="w-full divide-y divide-slate-100">
      {itens.map((item) => {
        const destaque = item.type === "MUNICIPIO";
        const participacao =
          mostrarParticipacao &&
          !destaque &&
          municipio !== null &&
          municipio > 0 &&
          item.value !== null &&
          item.value > 0
            ? formatarParticipacao(municipio, item.value)
            : null;

        return (
          <li
            key={item.territory}
            className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3"
          >
            <span
              className={`text-sm ${
                destaque ? "font-semibold text-slate-900" : "text-slate-600"
              }`}
            >
              {item.territory}
            </span>
            <span className="text-right">
              <span className="text-sm font-medium text-slate-700">
                {item.value === null
                  ? "sem dados"
                  : `${formatarValor(item.value)}${unidade ? ` ${unidade}` : ""}`}
              </span>
              {participacao && (
                <span className="block text-xs text-slate-500">
                  Campo Mourão representa {participacao}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Comparativo({
  itens,
  unidade,
  tipo,
}: {
  itens: ComparisonItem[];
  unidade: string | null;
  tipo: IndicatorKind;
}) {
  if (itens.length === 0) {
    return (
      <EstadoVazio
        icone="⇄"
        titulo="Sem dados para comparar"
        texto="Nenhum território tem valor para este indicador no período."
      />
    );
  }

  if (tipo !== "RATE") {
    return (
      <ParticipacaoComparativo
        itens={itens}
        unidade={unidade}
        mostrarParticipacao={tipo === "TOTAL"}
      />
    );
  }

  const maximo = Math.max(...itens.map((i) => Math.abs(i.value ?? 0)), 0);

  return (
    <ul className="w-full space-y-4">
      {itens.map((item) => {
        const largura =
          item.value !== null && maximo > 0
            ? (Math.abs(item.value) / maximo) * 100
            : 0;
        const destaque = item.type === "MUNICIPIO";

        return (
          <li key={item.territory} className="flex items-center gap-4">
            <span
              className={`w-32 shrink-0 text-sm ${
                destaque ? "font-semibold text-slate-900" : "text-slate-600"
              }`}
            >
              {item.territory}
            </span>
            <div className="h-6 flex-1 overflow-hidden rounded-md bg-slate-100">
              <div
                className={`h-full rounded-md ${
                  destaque ? "bg-green-600" : "bg-green-300"
                }`}
                style={{ width: `${largura}%` }}
              />
            </div>
            <span className="w-28 shrink-0 text-right text-sm font-medium text-slate-700">
              {item.value === null
                ? "sem dados"
                : `${formatarValor(item.value)}${unidade ? ` ${unidade}` : ""}`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function Home() {
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("todas");
  const [indicadorSelecionado, setIndicadorSelecionado] = useState("todos");
  const [periodoSelecionado, setPeriodoSelecionado] = useState("todos");
  const [mostrarTodos, setMostrarTodos] = useState(false);

  const [categorias, setCategorias] = useState<Axis[]>([]);
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [indicadores, setIndicadores] = useState<Loaded<IndicatorCard[]>>(null);
  const [detalhe, setDetalhe] = useState<
    Loaded<{ series: SeriesResponse[]; comparativo: ComparisonResponse }>
  >(null);
  const [erro, setErro] = useState<string | null>(null);

  const chaveIndicadores = `${categoriaSelecionada}|${periodoSelecionado}`;
  const chaveDetalhe = `${indicadorSelecionado}|${periodoSelecionado}`;

  useEffect(() => {
    let cancelado = false;
    Promise.all([api.axes(), api.periods()])
      .then(([eixos, periodosDisponiveis]) => {
        if (cancelado) return;
        setCategorias(eixos);
        setPeriodos(periodosDisponiveis);
        setErro(null);
      })
      .catch((e: unknown) => {
        if (!cancelado) setErro(mensagemDeErro(e));
      });
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    let cancelado = false;
    api
      .indicators(
        categoriaSelecionada === "todas" ? undefined : categoriaSelecionada,
        periodoSelecionado === "todos" ? undefined : periodoSelecionado,
      )
      .then((data) => {
        if (cancelado) return;
        setIndicadores({ key: chaveIndicadores, data });
        setErro(null);
      })
      .catch((e: unknown) => {
        if (!cancelado) setErro(mensagemDeErro(e));
      });
    return () => {
      cancelado = true;
    };
  }, [categoriaSelecionada, periodoSelecionado, chaveIndicadores]);

  useEffect(() => {
    if (indicadorSelecionado === "todos") return;
    let cancelado = false;
    Promise.all([
      Promise.all([
        api.series(indicadorSelecionado),
        ...TERRITORIOS_COMPARADOS.map((t) => api.series(indicadorSelecionado, t.codigo)),
      ]),
      api.comparison(
        indicadorSelecionado,
        periodoSelecionado === "todos" ? undefined : periodoSelecionado,
      ),
    ])
      .then(([series, comparativo]) => {
        if (cancelado) return;
        setDetalhe({ key: chaveDetalhe, data: { series, comparativo } });
        setErro(null);
      })
      .catch((e: unknown) => {
        if (!cancelado) setErro(mensagemDeErro(e));
      });
    return () => {
      cancelado = true;
    };
  }, [indicadorSelecionado, periodoSelecionado, chaveDetalhe]);

  const listaIndicadores = indicadores?.data ?? [];
  const atualizandoIndicadores = indicadores?.key !== chaveIndicadores;
  const semCategoria =
    categoriaSelecionada === "todas" && indicadorSelecionado === "todos";
  const comDado = listaIndicadores.filter((i) => i.value !== null);
  const candidatos = semCategoria
    ? []
    : indicadorSelecionado === "todos"
      ? [...comDado, ...listaIndicadores.filter((i) => i.value === null)]
      : listaIndicadores.filter((i) => i.code === indicadorSelecionado);
  const indicadoresVisiveis = mostrarTodos
    ? candidatos
    : candidatos.slice(0, LIMITE_CARDS);
  const ocultos = candidatos.length - indicadoresVisiveis.length;
  const leituraDetalhe = detalhe?.key === chaveDetalhe
    ? leitura(detalhe.data.series[0].indicator.polarity)
    : null;

  const detalheAtual = detalhe?.key === chaveDetalhe ? detalhe.data : null;

  return (
  <DashboardShell>
    <main className="min-h-screen bg-green-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8">
<div className="rounded-2xl bg-green-600 px-6 py-8 text-white shadow-lg">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div>
                <p className="mb-2 text-sm font-medium uppercase tracking-wider text-slate-400">
                  Cidades Inteligentes
                </p>

                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Indicadores de Campo Mourão
                </h1>

                <p className="mt-3 max-w-2xl text-slate-300">
                  Painel de visualização dos principais indicadores municipais.
                </p>
              </div>

              <div className="flex flex-col items-start gap-3 md:items-end">
                <AuthLink />
                <div className="rounded-xl border border-green-400 bg-green-700 px-5 py-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Município
                  </p>
                  <p className="mt-1 text-lg font-semibold">Campo Mourão - PR</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {erro && (
          <div
            role="alert"
            className="mb-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800"
          >
            Não foi possível carregar os dados ({erro}). Verifique se a API está
            no ar em {API_URL}.
          </div>
        )}

        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">Visão geral</h2>
            <p className="mt-1 text-sm text-slate-500">
              {semCategoria
                ? "Escolha uma categoria ou um indicador para ver os valores"
                : "Indicadores de Campo Mourão na seleção atual"}
              {atualizandoIndicadores && !erro ? " · atualizando..." : ""}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {indicadoresVisiveis.map((indicador) => (
              <div
                key={indicador.code}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      {indicador.name}
                    </p>
                    <p className="mt-3 text-3xl font-bold text-green-700">
                      {formatarValor(indicador.value)}
                    </p>
                    {indicador.value !== null &&
                      (indicador.unit || leitura(indicador.polarity)) && (
                        <p className="mt-1 text-xs text-slate-400">
                          {[indicador.unit, leitura(indicador.polarity)]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-green-700">
                    {indicador.axisAbbreviation ?? indicador.code.slice(0, 2)}
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {indicador.description ?? indicador.name}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {indicador.value !== null
                    ? `Referência: ${indicador.period}`
                    : indicador.period
                      ? `Sem dados em ${indicador.period}`
                      : "Sem dados"}
                </p>
              </div>
            ))}

            {indicadorSelecionado === "todos" && indicadores && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Indicadores
                    </p>
                    <p className="mt-3 text-3xl font-bold text-slate-900">
                      {listaIndicadores.length}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                    #
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Indicadores cadastrados na seleção atual ({comDado.length}{" "}
                  com dado)
                </p>
              </div>
            )}
          </div>

          {(ocultos > 0 || (mostrarTodos && candidatos.length > LIMITE_CARDS)) && (
            <button
              type="button"
              onClick={() => setMostrarTodos(!mostrarTodos)}
              className="mt-4 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {mostrarTodos
                ? "Mostrar menos"
                : `Mostrar os outros ${ocultos} indicadores`}
            </button>
          )}

          {indicadores && listaIndicadores.length === 0 && (
            <p className="mt-4 text-sm text-slate-500">
              Nenhum indicador cadastrado para esta categoria.
            </p>
          )}
        </section>

        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-900">Filtros</h2>
            <p className="mt-1 text-sm text-slate-500">
              Selecione os critérios para visualizar os indicadores.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <label
                htmlFor="categoria"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Categoria
              </label>

              <select
                id="categoria"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-500 focus:bg-white"
                value={categoriaSelecionada}
                onChange={(e) => {
                  setCategoriaSelecionada(e.target.value);
                  setIndicadorSelecionado("todos");
                  setMostrarTodos(false);
                }}
              >
                <option value="todas">Todas</option>
                {categorias.map((categoria) => (
                  <option key={categoria.slug} value={categoria.slug}>
                    {categoria.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="indicador"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Indicador
              </label>

              <select
                id="indicador"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-500 focus:bg-white"
                value={indicadorSelecionado}
                onChange={(e) => setIndicadorSelecionado(e.target.value)}
              >
                <option value="todos">Todos</option>
                {listaIndicadores.map((indicador) => (
                  <option key={indicador.code} value={indicador.code}>
                    {indicador.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="periodo"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Período
              </label>

              <select
                id="periodo"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-500 focus:bg-white"
                value={periodoSelecionado}
                onChange={(e) => setPeriodoSelecionado(e.target.value)}
              >
                <option value="todos">Mais recente</option>
                {periodos.map((periodo) => (
                  <option key={periodo} value={periodo}>
                    {periodo}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">Categorias</h2>

            <p className="mt-1 text-sm text-slate-500">
              Indicadores organizados por área.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categorias
              .filter(
                (categoria) =>
                  categoriaSelecionada === "todas" ||
                  categoria.slug === categoriaSelecionada,
              )
              .map((categoria) => (
                <button
                  type="button"
                  key={categoria.slug}
                  onClick={() => {
                    setCategoriaSelecionada(categoria.slug);
                    setIndicadorSelecionado("todos");
                    setMostrarTodos(false);
                  }}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-600 text-xs font-bold text-white">
                      {categoria.abbreviation ??
                        categoria.name.slice(0, 2).toUpperCase()}
                    </div>

                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {categoria.name}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {categoria.description}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {categoria.indicatorCount}{" "}
                        {categoria.indicatorCount === 1
                          ? "indicador"
                          : "indicadores"}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
          </div>

          {categorias.length === 0 && !erro && (
            <p className="text-sm text-slate-500">
              Nenhuma categoria cadastrada ainda.
            </p>
          )}
        </section>

        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">
              Evolução dos indicadores
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Crescimento ou queda entre dois anos e evolução de Campo Mourão
              comparada com a COMCAM e o Paraná
              {leituraDetalhe ? ` · ${leituraDetalhe}` : ""}.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            {indicadorSelecionado === "todos" ? (
              <div className="py-10">
                <EstadoVazio
                  icone="↗"
                  titulo="Selecione um indicador"
                  texto="Escolha um indicador nos filtros para ver sua evolução."
                />
              </div>
            ) : !detalheAtual ? (
              <p className="py-10 text-center text-sm text-slate-400">Carregando...</p>
            ) : (
              <Evolucao
                key={indicadorSelecionado}
                unidade={detalheAtual.series[0].indicator.unit}
                tipo={detalheAtual.series[0].indicator.kind}
                polaridade={detalheAtual.series[0].indicator.polarity}
                series={[
                  {
                    id: "MUNICIPIO",
                    nome: detalheAtual.series[0].territory.name,
                    comArtigo: "",
                    cor: "#0f172a",
                    pontos: detalheAtual.series[0].points,
                  },
                  ...TERRITORIOS_COMPARADOS.map((t, i) => ({
                    id: t.id,
                    nome: t.nome,
                    comArtigo: t.comArtigo,
                    cor: t.cor,
                    pontos: detalheAtual.series[i + 1].points,
                  })),
                ]}
              />
            )}
          </div>
        </section>

        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">Comparativos</h2>

            <p className="mt-1 text-sm text-slate-500">
              {detalheAtual?.comparativo.indicator.kind === "TOTAL"
                ? "Participação de Campo Mourão na região, no estado e no país"
                : "Compare Campo Mourão com a região, o estado e o país"}
              {leituraDetalhe ? ` · ${leituraDetalhe}` : ""}
              {detalheAtual?.comparativo.period
                ? ` · período ${detalheAtual.comparativo.period}`
                : ""}
              .
            </p>
          </div>

          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white p-6">
            {indicadorSelecionado === "todos" ? (
              <EstadoVazio
                icone="⇄"
                titulo="Selecione um indicador"
                texto="Escolha um indicador nos filtros para ver o comparativo."
              />
            ) : !detalheAtual ? (
              <p className="text-sm text-slate-400">Carregando...</p>
            ) : (
              <Comparativo
                itens={detalheAtual.comparativo.values}
                unidade={detalheAtual.comparativo.indicator.unit}
                tipo={detalheAtual.comparativo.indicator.kind}
              />
            )}
          </div>
        </section>

        <footer className="border-t border-slate-200 py-6 text-center">
          <p className="text-xs text-slate-400">
            Dashboard de Indicadores • Campo Mourão - PR
          </p>
        </footer>
      </div>
    </main>
    </DashboardShell>
  );
}
