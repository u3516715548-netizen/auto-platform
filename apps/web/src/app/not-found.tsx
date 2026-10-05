export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-4 py-16 text-center sm:px-6">
      <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">404</p>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Pagină negăsită</h1>
      <p className="text-sm leading-6 text-zinc-600">
        Dealerul sau pagina solicitată nu este disponibilă.
      </p>
    </main>
  );
}
