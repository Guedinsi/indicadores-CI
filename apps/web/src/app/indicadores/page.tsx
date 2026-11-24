"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import {
  api,
  type Axis,
  type IndicatorCard,
  type SeriesResponse,
} from "@/lib/api";

function formatarValor(valor: number | null): string {
  if (valor === null) return "--";
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
}

export default function IndicadoresPage() {
  const [categorias, setCategorias] = useState<Axis[]>([]);
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [indicadores, setIndicadores] = useState<IndicatorCard[]>([]);
  const [categoria, setCategoria] = useState("todas");
  const [periodo, setPeriodo] = useState("todos");
  const [selecionado, setSelecionado] = useState("");
  const [serie, setSerie] = useState<SeriesResponse | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [carregandoSerie, setCarregandoSerie] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    Promise.all([api.axes(), api.periods()])
      .then(([eixos, anos]) => {
        setCategorias(eixos);
        setPeriodos(anos);
      })
      .catch((e: unknown) => {
        setErro(e instanceof Error ? e.message : "Erro ao carregar filtros.");
      });
  }, []);

  useEffect(() => {
    let cancelado = false;

    setCarregando(true);
    api.indicators(
      categoria === "todas" ? undefined : categoria,
      periodo === "todos" ? undefined : periodo,
    )
      .then((dados) => {
        if (cancelado) return;
        setIndicadores(dados);
        setSelecionado((atual) =>
          dados.some((item) => item.code === atual)
            ? atual
            : dados[0]?.code ?? "",
        );
        setErro("");
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setErro(e instanceof Error ? e.message : "Erro ao carregar indicadores.");
        }
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [categoria, periodo]);

  useEffect(() => {
    if (!selecionado) {
      setSerie(null);
      return;
    }

    let cancelado = false;
    setCarregandoSerie(true);

    api.series(selecionado)
      .then((dados) => {
        if (!cancelado) setSerie(dados);
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setErro(e instanceof Error ? e.message : "Erro ao carregar evolução.");
          setSerie(null);
        }
      })
      .finally(() => {
        if (!cancelado) setCarregandoSerie(false);
      });

    return () => {
      cancelado = true;
    };
  }, [selecionado]);

  const indicadorSelecionado = indicadores.find(
    (item) => item.code === selecionado,
  );

  const pontosValidos = serie?.points.filter(
    (ponto): ponto is { period: string; value: number } =>
      ponto.value !== null,
  ) ?? [];

  return (
    <DashboardShell>
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Indicadores
          </h1>
          <p className="mt-2 text-slate-600">
            Consulte os indicadores de Campo Mourão por categoria e período.
          </p>
        </header>

        {erro && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            Não foi possível carregar os dados: {erro}
          </div>
        )}

        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-900">Filtros</h2>
		<button
  type="button"
  onClick={() => {
    setCategoria("todas");
    setPeriodo("todos");
  }}
  className="mb-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
>
  Limpar filtros
</button>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="categoria"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Categoria
              </label>
              <select
                id="categoria"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm"
              >
                <option value="todas">Todas as categorias</option>
                {categorias.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.name}
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
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm"
              >
                <option value="todos">Mais recente</option>
                {periodos.map((ano) => (
                  <option key={ano} value={ano}>{ano}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">
              Indicadores disponíveis
            </h2>
            <span className="text-sm text-slate-500">
              {indicadores.length} indicadores
            </span>
          </div>

          {carregando ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Carregando indicadores...
            </p>
          ) : indicadores.length === 0 ? (
            <p className="rounded-xl bg-white p-6 text-sm text-slate-500">
              Nenhum indicador encontrado para os filtros selecionados.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {indicadores.map((item) => (
                <button
                  type="button"
                  key={item.code}
                  onClick={() => setSelecionado(item.code)}
                  aria-pressed={selecionado === item.code}
                  className={`rounded-2xl border p-5 text-left shadow-sm transition hover:shadow-md ${
                    selecionado === item.code
                      ? "border-blue-600 bg-blue-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <p className="text-sm font-medium text-slate-500">
                    {item.name}
                  </p>
                  <p className="mt-3 text-3xl font-bold text-slate-900">
                    {formatarValor(item.value)}
                  </p>
                  {item.value !== null && item.unit && (
                    <p className="mt-1 text-xs text-slate-500">{item.unit}</p>
                  )}
                  <p className="mt-3 text-xs text-slate-400">
                    {item.period ? `Referência: ${item.period}` : "Sem dados"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">
            Evolução do indicador
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {indicadorSelecionado?.name ?? "Selecione um indicador"}
          </p>

          <div className="mt-6">
            {carregandoSerie ? (
              <p className="py-12 text-center text-sm text-slate-500">
                Carregando evolução...
              </p>
            ) : pontosValidos.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">
                Não há dados históricos disponíveis para este indicador.
              </p>
            ) : (
              <div className="space-y-3">
                {pontosValidos.map((ponto) => (
                  <div
                    key={ponto.period}
                    className="flex items-center gap-4"
                  >
                    <span className="w-16 text-sm text-slate-500">
                      {ponto.period}
                    </span>
                    <div className="h-6 flex-1 overflow-hidden rounded-md bg-slate-100">
                      <div
                        className="h-full rounded-md bg-slate-800"
                        style={{
                          width: `${
                            Math.max(
                              (ponto.value /
                                Math.max(...pontosValidos.map((p) => p.value), 1)) *
                                100,
                              1,
                            )
                          }%`,
                        }}
                      />
                    </div>
                    <span className="w-32 text-right text-sm font-medium text-slate-700">
                      {formatarValor(ponto.value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
