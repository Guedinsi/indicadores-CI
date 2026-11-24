
"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import {
  api,
  type Axis,
  type IndicatorCard,
  type ComparisonResponse,
} from "@/lib/api";

function formatarValor(valor: number | null): string {
  if (valor === null) return "--";

  return valor.toLocaleString("pt-BR", {
    maximumFractionDigits: 4,
  });
}

export default function ComparativosPage() {
  const [categorias, setCategorias] = useState<Axis[]>([]);
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [indicadores, setIndicadores] = useState<IndicatorCard[]>([]);

  const [categoria, setCategoria] = useState("todas");
  const [periodo, setPeriodo] = useState("todos");
  const [selecionado, setSelecionado] = useState("");

  const [comparacao, setComparacao] =
    useState<ComparisonResponse | null>(null);

  const [carregando, setCarregando] = useState(true);
  const [carregandoComparacao, setCarregandoComparacao] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    Promise.all([api.axes(), api.periods()])
      .then(([eixos, anos]) => {
        setCategorias(eixos);
        setPeriodos(anos);
      })
      .catch((e: unknown) => {
        setErro(
          e instanceof Error ? e.message : "Erro ao carregar filtros.",
        );
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
          setErro(
            e instanceof Error
              ? e.message
              : "Erro ao carregar indicadores.",
          );
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
      setComparacao(null);
      return;
    }

    let cancelado = false;

    setCarregandoComparacao(true);

    api.comparison(
      selecionado,
      periodo === "todos" ? undefined : periodo,
    )
      .then((dados) => {
        if (!cancelado) setComparacao(dados);
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setErro(
            e instanceof Error
              ? e.message
              : "Erro ao carregar comparação.",
          );
          setComparacao(null);
        }
      })
      .finally(() => {
        if (!cancelado) setCarregandoComparacao(false);
      });

    return () => {
      cancelado = true;
    };
  }, [selecionado, periodo]);

  const indicadorSelecionado = indicadores.find(
    (item) => item.code === selecionado,
  );

  const valores = comparacao?.values ?? [];

  const maiorValor = Math.max(
    ...valores.map((item) => Math.abs(item.value ?? 0)),
    1,
  );

  return (
    <DashboardShell>
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Comparativos
          </h1>

          <p className="mt-2 text-slate-600">
            Compare os indicadores de Campo Mourão com a COMCAM,
            Paraná e Brasil.
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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">
              Filtros
            </h2>

            <button
              type="button"
              onClick={() => {
                setCategoria("todas");
                setPeriodo("todos");
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Limpar filtros
            </button>
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
                  <option key={ano} value={ano}>
                    {ano}
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
                value={selecionado}
                onChange={(e) => setSelecionado(e.target.value)}
                disabled={carregando || indicadores.length === 0}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm disabled:opacity-50"
              >
                {indicadores.length === 0 && (
                  <option value="">Nenhum indicador disponível</option>
                )}

                {indicadores.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">
              Comparação entre territórios
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {indicadorSelecionado?.name ?? "Selecione um indicador"}
              {comparacao?.period
                ? ` • Referência: ${comparacao.period}`
                : ""}
            </p>
          </div>

          {carregando || carregandoComparacao ? (
            <p className="rounded-xl bg-white py-12 text-center text-sm text-slate-500">
              Carregando comparação...
            </p>
          ) : !selecionado ? (
            <p className="rounded-xl bg-white p-6 text-sm text-slate-500">
              Nenhum indicador disponível para os filtros selecionados.
            </p>
          ) : valores.length === 0 ? (
            <p className="rounded-xl bg-white p-6 text-sm text-slate-500">
              Não existem dados disponíveis para este indicador no período selecionado.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {valores.map((item) => (
                <article
                  key={`${item.type}-${item.territory}`}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <p className="text-sm font-medium text-slate-500">
                    {item.territory}
                  </p>

                  <p className="mt-3 text-3xl font-bold text-slate-900">
                    {formatarValor(item.value)}
                  </p>

                  {indicadorSelecionado?.unit && (
                    <p className="mt-1 text-xs text-slate-500">
                      {indicadorSelecionado.unit}
                    </p>
                  )}

                  <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-800 transition-all"
                      style={{
                        width:
                          item.value === null
                            ? "0%"
                            : `${Math.max(
                                (Math.abs(item.value) / maiorValor) * 100,
                                1,
                              )}%`,
                      }}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
