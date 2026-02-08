import Chat from "@/components/Chat";
import BudgetChatbot from "@/components/BudgetChatbot";

export default function Home() {
  return (
    <div className="flex h-screen flex-col bg-white dark:bg-black">
      <main className="flex-1 overflow-hidden p-6">
        <div className="max-w-2xl mx-auto">
          <BudgetChatbot />
        </div>
      </main>
    </div>
  );
}
