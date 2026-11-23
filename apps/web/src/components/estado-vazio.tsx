export function EstadoVazio({
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
