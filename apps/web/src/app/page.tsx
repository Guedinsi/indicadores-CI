"use client";

import { useEffect, useState } from "react";
import {
  API_URL,
  api,
  type Axis,
  type ComparisonItem,
  type ComparisonResponse,
  type IndicatorCard,
  type SeriesPoint,
  type SeriesResponse,
} from "@/lib/api";

/** Resultado de uma requisição junto com a chave dos filtros usados nela. */
type Loaded<T> = { key: string; data: T } | null;

function formatarValor(valor: number | null): string {
  if (valor === null) return "--";
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
}

function mensagemDeErro(e: unknown): string {
  return e instanceof Error ? e.message : "erro desconhecido";
}

function EstadoVazio({
  icone,
  titulo,
  texto,
}: {
  icone: string;
  titulo: string;
  texto: string;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        {icone}
      </div>
      <p className="font-medium text-slate-700">{titulo}</p>
      <p className="mt-1 text-sm text-slate-400">{texto}</p>
    </div>
  );
}

function GraficoEvolucao({
  pontos,
  unidade,
}: {
  pontos: SeriesPoint[];
  unidade: string | null;
}) {
  const validos = pontos.filter(
    (p): p is { period: string; value: number } => p.value !== null,
  );

  if (validos.length === 0) {
    return (
      <EstadoVazio
        icone="↗"
        titulo="Sem dados para este indicador"
        texto="Ainda não há valores gravados para Campo Mourão."
      />
    );
  }

  const W = 640;
  const H = 260;
  const pad = { top: 20, right: 24, bottom: 36, left: 56 };
  const larguraUtil = W - pad.left - pad.right;
  const alturaUtil = H - pad.top - pad.bottom;

  const valores = validos.map((p) => p.value);
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const folga = maximo === minimo ? Math.abs(maximo) * 0.1 || 1 : (maximo - minimo) * 0.15;
  const yMin = minimo - folga;
  const yMax = maximo + folga;

  const x = (i: number) =>
    validos.length === 1
      ? pad.left + larguraUtil / 2
      : pad.left + (i / (validos.length - 1)) * larguraUtil;
  const y = (v: number) =>
    pad.top + (1 - (v - yMin) / (yMax - yMin)) * alturaUtil;

  const linha = validos.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const marcasY = [yMax, (yMax + yMin) / 2, yMin];
  const passoRotulo = Math.ceil(validos.length / 8);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-full w-full"
      role="img"
      aria-label={`Evolução do indicador${unidade ? ` (${unidade})` : ""}`}
    >
      {marcasY.map((v) => (
        <g key={v}>
          <line
            x1={pad.left}
            x2={W - pad.right}
            y1={y(v)}
            y2={y(v)}
            stroke="#e2e8f0"
          />
          <text
            x={pad.left - 8}
            y={y(v) + 4}
            textAnchor="end"
            fontSize="11"
            fill="#64748b"
          >
            {formatarValor(Number(v.toFixed(4)))}
          </text>
        </g>
      ))}

      {validos.length > 1 && (
        <polyline
          points={linha}
          fill="none"
          stroke="#0f172a"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      )}

      {validos.map((p, i) => (
        <g key={p.period}>
          <circle cx={x(i)} cy={y(p.value)} r="4.5" fill="#0f172a">
            <title>{`${p.period}: ${formatarValor(p.value)}${unidade ? ` ${unidade}` : ""}`}</title>
          </circle>
          {i % passoRotulo === 0 && (
            <text
              x={x(i)}
              y={H - 12}
              textAnchor="middle"
              fontSize="11"
              fill="#64748b"
            >
              {p.period}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

function BarrasComparativo({
  itens,
  unidade,
}: {
  itens: ComparisonItem[];
  unidade: string | null;
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

  const maximo = Math.max(...itens.map((i) => i.value ?? 0), 0);

  return (
    <ul className="w-full space-y-4">
      {itens.map((item) => {
        const largura =
          item.value !== null && maximo > 0
            ? Math.max((item.value / maximo) * 100, 0)
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
                  destaque ? "bg-slate-900" : "bg-slate-400"
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

  const [categorias, setCategorias] = useState<Axis[]>([]);
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [indicadores, setIndicadores] = useState<Loaded<IndicatorCard[]>>(null);
  const [detalhe, setDetalhe] = useState<
    Loaded<{ serie: SeriesResponse; comparativo: ComparisonResponse }>
  >(null);
  const [erro, setErro] = useState<string | null>(null);

  const chaveIndicadores = `${categoriaSelecionada}|${periodoSelecionado}`;
  const chaveDetalhe = `${indicadorSelecionado}|${periodoSelecionado}`;

  // Categorias e períodos disponíveis (uma vez)
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

  // Cards de indicadores (mudam com categoria e período)
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

  // Gráfico de evolução e comparativo (só quando há um indicador selecionado)
  useEffect(() => {
    if (indicadorSelecionado === "todos") return;
    let cancelado = false;
    Promise.all([
      api.series(indicadorSelecionado),
      api.comparison(
        indicadorSelecionado,
        periodoSelecionado === "todos" ? undefined : periodoSelecionado,
      ),
    ])
      .then(([serie, comparativo]) => {
        if (cancelado) return;
        setDetalhe({ key: chaveDetalhe, data: { serie, comparativo } });
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
  const indicadoresVisiveis = listaIndicadores.filter(
    (i) => indicadorSelecionado === "todos" || i.code === indicadorSelecionado,
  );

  const detalheAtual = detalhe?.key === chaveDetalhe ? detalhe.data : null;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8">
          <div className="rounded-2xl bg-slate-900 px-6 py-8 text-white shadow-lg">
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

              <div className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Município
                </p>
                <p className="mt-1 text-lg font-semibold">Campo Mourão - PR</p>
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
              Principais índices disponíveis no painel
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
                    <p className="mt-3 text-3xl font-bold text-slate-900">
                      {formatarValor(indicador.value)}
                    </p>
                    {indicador.value !== null && indicador.unit && (
                      <p className="mt-1 text-xs text-slate-400">
                        {indicador.unit}
                      </p>
                    )}
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                    {indicador.axisAbbreviation ?? indicador.code.slice(0, 2)}
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {indicador.description ?? indicador.name}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {indicador.period
                    ? `Referência: ${indicador.period}`
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
                  Indicadores cadastrados na seleção atual
                </p>
              </div>
            )}
          </div>

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
                  }}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white">
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
              Acompanhe a evolução dos indicadores ao longo dos períodos.
            </p>
          </div>

          <div className="flex h-80 items-center justify-center rounded-2xl border border-slate-200 bg-white p-4">
            {indicadorSelecionado === "todos" ? (
              <EstadoVazio
                icone="↗"
                titulo="Selecione um indicador"
                texto="Escolha um indicador nos filtros para ver sua evolução."
              />
            ) : !detalheAtual ? (
              <p className="text-sm text-slate-400">Carregando...</p>
            ) : (
              <GraficoEvolucao
                pontos={detalheAtual.serie.points}
                unidade={detalheAtual.serie.indicator.unit}
              />
            )}
          </div>
        </section>

        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">Comparativos</h2>

            <p className="mt-1 text-sm text-slate-500">
              Compare Campo Mourão com a região, o estado e o país
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
              <BarrasComparativo
                itens={detalheAtual.comparativo.values}
                unidade={detalheAtual.comparativo.indicator.unit}
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
  );
}
