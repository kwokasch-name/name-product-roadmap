import { RoadmapProvider } from './context/RoadmapContext';
import { OKRList } from './components/okrs/OKRList';
import { RoadmapView } from './components/roadmap/RoadmapView';
import { UnscopedTable } from './components/unscoped/UnscopedTable';
import { InitiativeForm } from './components/initiatives/InitiativeForm';

function App() {
  return (
    <RoadmapProvider>
      <div className="h-screen flex flex-col bg-gray-100">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">Product Roadmap</h1>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - OKRs */}
          <aside className="w-72 bg-white border-r border-gray-200 p-4 overflow-y-auto">
            <OKRList />
          </aside>

          {/* Main Area */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* Roadmap Section */}
            <div className="flex-1 min-h-0">
              <RoadmapView />
            </div>

            {/* Unscoped Initiatives Table */}
            <div className="flex-shrink-0 max-h-72 overflow-y-auto">
              <UnscopedTable />
            </div>
          </main>
        </div>

        {/* Initiative Form Modal */}
        <InitiativeForm />
      </div>
    </RoadmapProvider>
  );
}

export default App;
