import Image from "next/image";


export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard de Indicadores
          </h1>
          <p className="mt-2 text-gray-600">
            Indicadores de Campo Mourão
          </p>
        </header>

        <section className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold text-gray-800">
            Filtros
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label
                htmlFor="categoria"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Categoria
              </label>

              <select
                id="categoria"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 outline-none focus:border-gray-500"
                defaultValue="todas"
              >
                <option value="todas">Todas</option>
                <option value="economia">Economia</option>
                <option value="desenvolvimento">
                  Desenvolvimento
                </option>
                <option value="educacao">Educação</option>
                <option value="saude">Saúde</option>
                <option value="cultura">Cultura</option>
                <option value="gestao">Gestão</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="indicador"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Indicador
              </label>

              <select
                id="indicador"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 outline-none focus:border-gray-500"
                defaultValue="todos"
              >
                <option value="todos">Todos</option>
                <option value="ifgf">IFGF</option>
                <option value="ifdm">IFDM</option>
                <option value="idhm">IDHM</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="periodo"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Período
              </label>

              <select
                id="periodo"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 outline-none focus:border-gray-500"
                defaultValue="todos"
              >
                <option value="todos">Todos</option>
                <option value="2016">2016</option>
                <option value="2017">2017</option>
                <option value="2018">2018</option>
                <option value="2019">2019</option>
              </select>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-800">
            Categorias
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg bg-white p-5 shadow">
              <h3 className="font-semibold text-gray-900">Economia</h3>
              <p className="mt-2 text-sm text-gray-500">
                Indicadores econômicos e fiscais
              </p>
            </div>

            <div className="rounded-lg bg-white p-5 shadow">
              <h3 className="font-semibold text-gray-900">
                Desenvolvimento
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Indicadores de desenvolvimento humano
              </p>
            </div>

            <div className="rounded-lg bg-white p-5 shadow">
              <h3 className="font-semibold text-gray-900">Educação</h3>
              <p className="mt-2 text-sm text-gray-500">
                Indicadores educacionais
              </p>
            </div>

            <div className="rounded-lg bg-white p-5 shadow">
              <h3 className="font-semibold text-gray-900">Saúde</h3>
              <p className="mt-2 text-sm text-gray-500">
                Indicadores de saúde
              </p>
            </div>

            <div className="rounded-lg bg-white p-5 shadow">
              <h3 className="font-semibold text-gray-900">Cultura</h3>
              <p className="mt-2 text-sm text-gray-500">
                Indicadores culturais
              </p>
            </div>

            <div className="rounded-lg bg-white p-5 shadow">
              <h3 className="font-semibold text-gray-900">Gestão</h3>
              <p className="mt-2 text-sm text-gray-500">
                Indicadores de gestão municipal
              </p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-800">
            Indicadores em destaque
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-white p-6 shadow">
              <p className="text-sm text-gray-500">IFGF</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">--</p>
              <p className="mt-1 text-sm text-gray-500">
                Índice Firjan de Gestão Fiscal
              </p>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <p className="text-sm text-gray-500">IFDM</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">--</p>
              <p className="mt-1 text-sm text-gray-500">
                Índice Firjan de Desenvolvimento Municipal
              </p>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <p className="text-sm text-gray-500">IDHM</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">--</p>
              <p className="mt-1 text-sm text-gray-500">
                Índice de Desenvolvimento Humano Municipal
              </p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-800">
            Evolução dos indicadores
          </h2>

          <div className="flex h-80 items-center justify-center rounded-lg bg-white shadow">
            <p className="text-gray-500">
              Gráfico será implementado posteriormente
            </p>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-gray-800">
            Comparativos
          </h2>

          <div className="flex h-64 items-center justify-center rounded-lg bg-white shadow">
            <p className="text-gray-500">
              Comparativos serão implementados posteriormente
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
