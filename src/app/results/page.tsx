import Chat from "@/components/Chat";

export default function ResultsPage() {
  return (
    <div className="flex h-screen flex-col bg-white dark:bg-black">
      <main className="flex-1 overflow-hidden">
        <Chat phase="results" />
      </main>
    </div>
  );
}
