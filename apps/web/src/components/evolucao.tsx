"use client";

import { useState } from "react";
import type { IndicatorKind, IndicatorPolarity, SeriesPoint } from "@/lib/api";
import { formatarValor, periodoEmAnos } from "@/lib/formatacao";
import { EstadoVazio } from "@/components/estado-vazio";

/** Série de um território. A primeira da lista é sempre o município. */
export type SerieTerritorio = {
  id: string;
  nome: string;
  /** Usado na frase de comparação: "a COMCAM", "o Paraná". */
  comArtigo: string;
  cor: string;
  pontos: SeriesPoint[];
};

type Ponto = { period: string; value: number };
type Serie = Omit<SerieTerritorio, "pontos"> & { pontos: Ponto[] };
type Modo = "valores" | "indice";

function comValor(pontos: SeriesPoint[]): Ponto[] {
  return pontos
    .filter((p): p is Ponto => p.value !== null)
    .sort((a, b) => periodoEmAnos(a.period) - periodoEmAnos(b.period));
}

function valorEm(pontos: Ponto[], periodo: string): number | null {
  return pontos.find((p) => p.period === periodo)?.value ?? null;
}

/** Variação percentual; null quando o valor inicial é zero (a conta não existe). */
function variacaoPercentual(inicial: number, final: number): number | null {
  if (inicial === 0) return null;
  return ((final - inicial) / Math.abs(inicial)) * 100;
}

function formatarPercentual(pct: number, comSinal = true): string {
  const casas = Math.abs(pct) < 0.1 && pct !== 0 ? 2 : 1;
  return `${pct.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
    signDisplay: comSinal ? "exceptZero" : "never",
  })}%`;
}

function formatarDiferenca(dif: number, unidade: string | null): string {
  const n = dif.toLocaleString("pt-BR", {
    maximumFractionDigits: Math.abs(dif) >= 1 ? 2 : 4,
    signDisplay: "exceptZero",
  });
  if (unidade === "%") return `${n} p.p.`;
  return unidade ? `${n} ${unidade}` : n;
}

/** Verde quando melhorou, vermelho quando piorou; neutro quando o indicador não tem leitura definida. */
function corDaVariacao(dif: number, polaridade: IndicatorPolarity): string {
  if (dif === 0 || !polaridade) return "text-slate-900";
  const melhorou = polaridade === "HIGHER_BETTER" ? dif > 0 : dif < 0;
  return melhorou ? "text-emerald-700" : "text-red-700";
}

function CartaoVariacao({
  serie,
  inicio,
  fim,
  unidade,
  polaridade,
  destaque,
}: {
  serie: Serie;
  inicio: string;
  fim: string;
  unidade: string | null;
  polaridade: IndicatorPolarity;
  destaque: boolean;
}) {
  const a = valorEm(serie.pontos, inicio);
  const b = valorEm(serie.pontos, fim);
  const borda = destaque ? "border-slate-900" : "border-slate-200";

  let corpo;
  if (a === null || b === null) {
    const faltam = [a === null ? inicio : null, b === null ? fim : null].filter(Boolean);
    corpo = (
      <p className="mt-3 text-sm text-slate-400">Sem dado em {faltam.join(" e ")}</p>
    );
  } else {
    const dif = b - a;
    const pct = variacaoPercentual(a, b);
    const cor = corDaVariacao(dif, polaridade);
    const seta = dif > 0 ? "▲" : dif < 0 ? "▼" : "■";
    corpo = (
      <>
        <p className={`mt-2 text-3xl font-bold ${cor}`}>
          <span className="mr-1 text-lg" aria-hidden="true">
            {seta}
          </span>
          {pct === null ? formatarDiferenca(dif, unidade) : formatarPercentual(pct)}
        </p>
        <p className="mt-2 text-sm text-slate-700">
          {formatarValor(a)} → {formatarValor(b)}
          {unidade ? ` ${unidade}` : ""}
        </p>
        {pct !== null && (
          <p className="text-xs text-slate-500">{formatarDiferenca(dif, unidade)}</p>
        )}
      </>
    );
  }

  return (
    <div className={`rounded-xl border bg-white p-4 ${borda}`}>
      <p
        className={`text-sm ${destaque ? "font-semibold text-slate-900" : "text-slate-600"}`}
      >
        <span
          className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
          style={{ backgroundColor: serie.cor }}
          aria-hidden="true"
        />
        {serie.nome}
      </p>
      {corpo}
    </div>
  );
}

/**
 * Frase que compara o crescimento do município com o das outras séries, pelo tamanho da variação:
 * "Campo Mourão caiu 88,4% entre 2020 e 2025: mais que a COMCAM (35,5%), enquanto o Paraná cresceu 73,9%."
 */
function resumoComparacao(series: Serie[], inicio: string, fim: string): string | null {
  const pct = (s: Serie) => {
    const a = valorEm(s.pontos, inicio);
    const b = valorEm(s.pontos, fim);
    return a === null || b === null ? null : variacaoPercentual(a, b);
  };
  const verbo = (p: number) =>
    p > 0 ? `cresceu ${formatarPercentual(p, false)}` : p < 0 ? `caiu ${formatarPercentual(p, false)}` : "ficou estável";

  const [municipio, ...outros] = series;
  const pm = pct(municipio);
  if (pm === null) return null;
  const mesmoSentido: string[] = [];
  const contrarios: string[] = [];
  for (const s of outros) {
    const p = pct(s);
    if (p === null) continue;
    if (pm === 0 || p === 0 || Math.sign(p) !== Math.sign(pm)) {
      contrarios.push(`enquanto ${s.comArtigo} ${verbo(p)}`);
    } else if (Math.abs(pm - p) < 0.05) {
      mesmoSentido.push(`o mesmo que ${s.comArtigo}`);
    } else {
      const quanto = Math.abs(pm) > Math.abs(p) ? "mais" : "menos";
      mesmoSentido.push(`${quanto} que ${s.comArtigo} (${formatarPercentual(p, false)})`);
    }
  }
  if (mesmoSentido.length === 0 && contrarios.length === 0) return null;
  const comparados = mesmoSentido.length > 0 ? `: ${mesmoSentido.join(" e ")}` : "";
  const outrosSentidos = contrarios.map((c) => `, ${c}`).join("");
  return `${municipio.nome} ${verbo(pm)} entre ${inicio} e ${fim}${comparados}${outrosSentidos}.`;
}

function GraficoLinhas({
  series,
  rotuloEixo,
  linhaDeBase,
}: {
  series: (Serie & { destaque: boolean })[];
  rotuloEixo: string | null;
  linhaDeBase: number | null;
}) {
  const todos = series.flatMap((s) => s.pontos);
  if (todos.length === 0) {
    return (
      <EstadoVazio
        icone="↗"
        titulo="Sem dados no intervalo"
        texto="Nenhum território tem valor entre os anos escolhidos."
      />
    );
  }

  const W = 720;
  const H = 280;
  const pad = { top: 20, right: 24, bottom: 36, left: 72 };
  const larguraUtil = W - pad.left - pad.right;
  const alturaUtil = H - pad.top - pad.bottom;

  const valores = todos.map((p) => p.value).concat(linhaDeBase ?? []);
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const folga =
    maximo === minimo ? Math.abs(maximo) * 0.1 || 1 : (maximo - minimo) * 0.15;
  const yMin = minimo >= 0 ? Math.max(minimo - folga, 0) : minimo - folga;
  const yMax = maximo + folga;

  const periodos = [...new Set(todos.map((p) => p.period))].sort(
    (a, b) => periodoEmAnos(a) - periodoEmAnos(b),
  );
  const tMin = periodoEmAnos(periodos[0]);
  const tMax = periodoEmAnos(periodos[periodos.length - 1]);
  const x = (periodo: string) =>
    tMax === tMin
      ? pad.left + larguraUtil / 2
      : pad.left + ((periodoEmAnos(periodo) - tMin) / (tMax - tMin)) * larguraUtil;
  const y = (v: number) => pad.top + (1 - (v - yMin) / (yMax - yMin)) * alturaUtil;

  const rotulados: string[] = [];
  for (const p of periodos) {
    const ultimo = rotulados.at(-1);
    if (ultimo === undefined || x(p) - x(ultimo) >= 48) rotulados.push(p);
  }
  const marcasY = [yMax, (yMax + yMin) / 2, yMin];
  // o município é desenhado por último, por cima das outras linhas
  const ordem = [...series].sort((a, b) => Number(a.destaque) - Number(b.destaque));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Evolução: ${series.map((s) => s.nome).join(", ")}`}
    >
      {marcasY.map((v) => (
        <g key={v}>
          <line x1={pad.left} x2={W - pad.right} y1={y(v)} y2={y(v)} stroke="#e2e8f0" />
          <text x={pad.left - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#64748b">
            {formatarValor(Number(v.toPrecision(4)))}
          </text>
        </g>
      ))}

      {linhaDeBase !== null && (
        <line
          x1={pad.left}
          x2={W - pad.right}
          y1={y(linhaDeBase)}
          y2={y(linhaDeBase)}
          stroke="#94a3b8"
          strokeDasharray="4 4"
        />
      )}

      {rotuloEixo && (
        <text
          x={14}
          y={pad.top + alturaUtil / 2}
          textAnchor="middle"
          fontSize="11"
          fill="#64748b"
          transform={`rotate(-90 14 ${pad.top + alturaUtil / 2})`}
        >
          {rotuloEixo}
        </text>
      )}

      {rotulados.map((p) => (
        <text key={p} x={x(p)} y={H - 12} textAnchor="middle" fontSize="11" fill="#64748b">
          {p}
        </text>
      ))}

      {ordem.map((s) => (
        <g key={s.id}>
          {s.pontos.length > 1 && (
            <polyline
              points={s.pontos.map((p) => `${x(p.period)},${y(p.value)}`).join(" ")}
              fill="none"
              stroke={s.cor}
              strokeWidth={s.destaque ? 3 : 2}
              strokeDasharray={s.destaque ? undefined : "6 4"}
              strokeLinejoin="round"
            />
          )}
          {s.pontos.map((p) => (
            <circle
              key={p.period}
              cx={x(p.period)}
              cy={y(p.value)}
              r={s.destaque ? 4.5 : 3.5}
              fill={s.cor}
            >
              <title>{`${s.nome} · ${p.period}: ${formatarValor(Number(p.value.toFixed(4)))}`}</title>
            </circle>
          ))}
        </g>
      ))}
    </svg>
  );
}

/**
 * Variação entre dois períodos escolhidos (município, COMCAM e Paraná) e gráfico de evolução
 * com a opção de sobrepor as outras séries. Para totais, o padrão é o gráfico em base 100
 * (as escalas do município e do estado não cabem no mesmo eixo); para taxas, os valores.
 */
export function Evolucao({
  series: entrada,
  unidade,
  tipo,
  polaridade,
}: {
  series: SerieTerritorio[];
  unidade: string | null;
  tipo: IndicatorKind;
  polaridade: IndicatorPolarity;
}) {
  const [escolhaInicio, setEscolhaInicio] = useState<string | null>(null);
  const [escolhaFim, setEscolhaFim] = useState<string | null>(null);
  const [ocultas, setOcultas] = useState<string[]>([]);
  const [escolhaModo, setEscolhaModo] = useState<Modo | null>(null);

  const series: Serie[] = entrada.map((s) => ({ ...s, pontos: comValor(s.pontos) }));
  const [municipio, ...outras] = series;
  const periodos = municipio.pontos.map((p) => p.period);

  if (periodos.length === 0) {
    return (
      <div className="py-10">
        <EstadoVazio
          icone="↗"
          titulo="Sem dados para este indicador"
          texto={`Ainda não há valores gravados para ${municipio.nome}.`}
        />
      </div>
    );
  }

  const inicio =
    escolhaInicio && periodos.slice(0, -1).includes(escolhaInicio) ? escolhaInicio : periodos[0];
  const posInicio = periodos.indexOf(inicio);
  const fim =
    escolhaFim && periodos.indexOf(escolhaFim) > posInicio
      ? escolhaFim
      : periodos[periodos.length - 1];
  const tInicio = periodoEmAnos(inicio);
  const tFim = periodoEmAnos(fim);
  const noIntervalo = (p: Ponto) =>
    periodoEmAnos(p.period) >= tInicio && periodoEmAnos(p.period) <= tFim;

  const baseMunicipio = valorEm(municipio.pontos, inicio);
  const podeIndice = periodos.length > 1 && baseMunicipio !== null && baseMunicipio > 0;
  const modo: Modo = podeIndice ? (escolhaModo ?? (tipo === "TOTAL" ? "indice" : "valores")) : "valores";

  const avisos: string[] = [];
  const noGrafico = series
    .filter((s) => s.id === municipio.id || !ocultas.includes(s.id))
    .flatMap((s) => {
      const pontos = s.pontos.filter(noIntervalo);
      const destaque = s.id === municipio.id;
      if (pontos.length === 0) {
        if (!destaque) {
          avisos.push(
            inicio === fim
              ? `${s.nome}: sem dado em ${inicio}.`
              : `${s.nome}: sem dados entre ${inicio} e ${fim}.`,
          );
        }
        return [];
      }
      if (modo === "valores") return [{ ...s, pontos, destaque }];
      const base = valorEm(s.pontos, inicio);
      if (base === null || base <= 0) {
        avisos.push(`${s.nome}: sem valor em ${inicio} (ano base), por isso ficou fora do gráfico.`);
        return [];
      }
      return [{ ...s, destaque, pontos: pontos.map((p) => ({ ...p, value: (p.value / base) * 100 })) }];
    });

  const resumo = periodos.length > 1 ? resumoComparacao(series, inicio, fim) : null;
  const classeSelect =
    "rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-500 focus:bg-white";
  const classeBotao = (ativo: boolean) =>
    `px-3 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
      ativo ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
    }`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        {periodos.length > 1 ? (
          <>
            <label className="text-sm font-medium text-slate-700">
              <span className="mb-1 block">De</span>
              <select
                className={classeSelect}
                value={inicio}
                onChange={(e) => setEscolhaInicio(e.target.value)}
              >
                {periodos.slice(0, -1).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              <span className="mb-1 block">Até</span>
              <select
                className={classeSelect}
                value={fim}
                onChange={(e) => setEscolhaFim(e.target.value)}
              >
                {periodos.slice(posInicio + 1).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <p className="text-sm text-slate-500">
            Só há dado de {periodos[0]}: escolha outro indicador para ver crescimento ou queda.
          </p>
        )}

        {outras.length > 0 && (
          <fieldset className="text-sm text-slate-700">
            <legend className="mb-1 font-medium">Comparar no gráfico com</legend>
            <div className="flex gap-4 py-2">
              {outras.map((s) => (
                <label key={s.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!ocultas.includes(s.id)}
                    onChange={(e) =>
                      setOcultas(
                        e.target.checked ? ocultas.filter((id) => id !== s.id) : [...ocultas, s.id],
                      )
                    }
                  />
                  {s.nome}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="text-sm text-slate-700">
          <span className="mb-1 block font-medium">Mostrar no gráfico</span>
          <div className="inline-flex overflow-hidden rounded-xl border border-slate-300">
            <button
              type="button"
              className={classeBotao(modo === "valores")}
              onClick={() => setEscolhaModo("valores")}
            >
              Valores
            </button>
            <button
              type="button"
              className={classeBotao(modo === "indice")}
              disabled={!podeIndice}
              title={podeIndice ? undefined : `Precisa de um valor positivo de ${municipio.nome} no ano inicial`}
              onClick={() => setEscolhaModo("indice")}
            >
              Crescimento ({inicio} = 100)
            </button>
          </div>
        </div>
      </div>

      {periodos.length > 1 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">
            Crescimento ou queda entre {inicio} e {fim}
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {series.map((s) => (
              <CartaoVariacao
                key={s.id}
                serie={s}
                inicio={inicio}
                fim={fim}
                unidade={unidade}
                polaridade={polaridade}
                destaque={s.id === municipio.id}
              />
            ))}
          </div>
          {resumo && <p className="mt-3 text-sm text-slate-600">{resumo}</p>}
        </div>
      )}

      <div>
        <div className="mb-2 flex flex-wrap gap-4 text-xs text-slate-600">
          {noGrafico.map((s) => (
            <span key={s.id} className="flex items-center gap-2">
              <svg width="22" height="6" aria-hidden="true">
                <line
                  x1="0"
                  x2="22"
                  y1="3"
                  y2="3"
                  stroke={s.cor}
                  strokeWidth={s.destaque ? 3 : 2}
                  strokeDasharray={s.destaque ? undefined : "6 4"}
                />
              </svg>
              {s.nome}
            </span>
          ))}
        </div>
        <GraficoLinhas
          series={noGrafico}
          rotuloEixo={modo === "indice" ? `${inicio} = 100` : unidade}
          linhaDeBase={modo === "indice" ? 100 : null}
        />
        {modo === "indice" && (
          <p className="mt-2 text-xs text-slate-500">
            Cada linha começa em 100 no ano {inicio}: 120 quer dizer 20% acima do valor daquele ano.
          </p>
        )}
        {avisos.map((a) => (
          <p key={a} className="mt-1 text-xs text-slate-400">
            {a}
          </p>
        ))}
      </div>
    </div>
  );
}
