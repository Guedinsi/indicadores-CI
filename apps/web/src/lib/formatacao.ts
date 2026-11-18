import type { IndicatorPolarity } from "@/lib/api";

/** Até 4 casas para índices entre 0 e 1 (0,7881); 2 casas para o resto (55.952,18). */
export function formatarValor(valor: number | null): string {
  if (valor === null) return "--";
  return valor.toLocaleString("pt-BR", {
    maximumFractionDigits: Math.abs(valor) >= 1 ? 2 : 4,
  });
}

/** "2023" -> 2023; "2023-07" -> 2023,5. Serve para posicionar períodos no tempo. */
export function periodoEmAnos(periodo: string): number {
  const [ano, mes] = periodo.split("-").map(Number);
  return ano + (mes ? (mes - 1) / 12 : 0);
}

export function leitura(polaridade: IndicatorPolarity): string | null {
  if (polaridade === "LOWER_BETTER") return "menor é melhor";
  if (polaridade === "HIGHER_BETTER") return "maior é melhor";
  return null;
}
