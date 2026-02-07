import Chat from "@/components/Chat";

export default function ResultsPage() {
  return (
    <div className="flex h-screen flex-col bg-white dark:bg-black">
      <header className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Food Resource Finder — Results
        </h1>
      </header>

      <main className="flex-1 overflow-hidden">
        <Chat phase="results" />
      </main>
    </div>
  );
}
