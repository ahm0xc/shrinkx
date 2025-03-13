export default function App() {
  return (
    <main className="grid grid-cols-5 h-[calc(100vh-2.5rem)] overflow-hidden">
      <div className="col-span-3 h-full p-4 pr-2 pt-0">
        <div className="w-full h-full bg-foreground/5 rounded-xl"></div>
      </div>
      <div className="col-span-2 h-full p-4 pl-2 pt-0">
        <div className="w-full h-full bg-foreground/5 rounded-xl"></div>
      </div>
    </main>
  )
}
