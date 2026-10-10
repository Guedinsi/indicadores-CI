"use client";

import { useState } from "react";

export default function Home() {

  const [categoriaSelecionada, setCategoriaSelecionada] = useState("todas");

  const [indicadorSelecionado, setIndicadorSelecionado] = useState("todos");

  const categorias = [

    {

      nome: "Economia",

      descricao: "Indicadores econômicos e fiscais",

      sigla: "EC",

    },

    {

      nome: "Desenvolvimento",

      descricao: "Indicadores de desenvolvimento humano",

      sigla: "DE",

    },

    {

      nome: "Educação",

      descricao: "Indicadores educacionais",

      sigla: "ED",

    },

    {

      nome: "Saúde",

      descricao: "Indicadores de saúde",

      sigla: "SA",

    },

    {

      nome: "Cultura",

      descricao: "Indicadores culturais",

      sigla: "CU",

    },

    {

      nome: "Gestão",

      descricao: "Indicadores de gestão municipal",

      sigla: "GE",

    },

  ];



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

                  Painel de visualização dos principais indicadores

                  municipais.

                </p>

              </div>



              <div className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-4">

                <p className="text-xs uppercase tracking-wide text-slate-400">

                  Município

                </p>

                <p className="mt-1 text-lg font-semibold">

                  Campo Mourão - PR

                </p>

              </div>

            </div>

          </div>

        </header>



        <section className="mb-8">

          <div className="mb-4">

            <h2 className="text-xl font-bold text-slate-900">

              Visão geral

            </h2>

            <p className="mt-1 text-sm text-slate-500">

              Principais índices disponíveis no painel

            </p>

          </div>



          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {(indicadorSelecionado === "todos" ||
            indicadorSelecionado === "ifgf") && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">IFGF</p>
                  <p className="mt-3 text-3xl font-bold text-slate-900">--</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                  IF
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Índice Firjan de Gestão Fiscal
              </p>
            </div>
          )}

          {(indicadorSelecionado === "todos" ||
            indicadorSelecionado === "ifdm") && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">IFDM</p>
                  <p className="mt-3 text-3xl font-bold text-slate-900">--</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                  ID
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Índice Firjan de Desenvolvimento Municipal
              </p>
            </div>
          )}

          {(indicadorSelecionado === "todos" ||
            indicadorSelecionado === "idhm") && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">IDHM</p>
                  <p className="mt-3 text-3xl font-bold text-slate-900">--</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                  IH
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Índice de Desenvolvimento Humano Municipal
              </p>
            </div>
          )}

          {indicadorSelecionado === "todos" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Indicadores
                  </p>
                  <p className="mt-3 text-3xl font-bold text-slate-900">36</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                  #
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Indicadores identificados no levantamento
              </p>
            </div>
          )}

          </div>

        </section>



        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="mb-5">

            <h2 className="text-lg font-bold text-slate-900">

              Filtros

            </h2>
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

                onChange={(e) => setCategoriaSelecionada(e.target.value)}

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

                <option value="ifgf">IFGF</option>

                <option value="ifdm">IFDM</option>

                <option value="idhm">IDHM</option>

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

          <div className="mb-4">

            <h2 className="text-xl font-bold text-slate-900">

              Categorias

            </h2>



            <p className="mt-1 text-sm text-slate-500">

              Indicadores organizados por área.

            </p>

          </div>



          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

            {categorias

                .filter(

                    (categoria) =>

                        categoriaSelecionada === "todas" ||

                        categoria.nome

                            .normalize("NFD")

                            .replace(/[\u0300-\u036f]/g, "")

                            .toLowerCase() === categoriaSelecionada

            )

            .map((categoria) => (

              <div

                key={categoria.nome}

                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"

              >

                <div className="flex items-center gap-4">

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white">

                    {categoria.sigla}

                  </div>



                  <div>

                    <h3 className="font-semibold text-slate-900">

                      {categoria.nome}

                    </h3>



                    <p className="mt-1 text-sm text-slate-500">

                      {categoria.descricao}

                    </p>

                  </div>

                </div>

              </div>

            ))}

          </div>

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



          <div className="flex h-80 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white">

            <div className="text-center">

              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">

                ↗

              </div>



              <p className="font-medium text-slate-700">

                Gráfico em desenvolvimento

              </p>



              <p className="mt-1 text-sm text-slate-400">

                Os dados serão apresentados nesta área.

              </p>

            </div>

          </div>

        </section>



        <section className="mb-8">

          <div className="mb-4">

            <h2 className="text-xl font-bold text-slate-900">

              Comparativos

            </h2>



            <p className="mt-1 text-sm text-slate-500">

              Compare os indicadores de Campo Mourão com outros municípios.

            </p>

          </div>



          <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white">

            <div className="text-center">

              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">

                ⇄

              </div>



              <p className="font-medium text-slate-700">

                Comparativos em desenvolvimento

              </p>



              <p className="mt-1 text-sm text-slate-400">

                Esta área será preenchida com os dados dos indicadores.

              </p>

            </div>

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