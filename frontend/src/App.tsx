import { RoadmapProvider } from './context/RoadmapContext';
import { OKRList } from './components/okrs/OKRList';
import { RoadmapView } from './components/roadmap/RoadmapView';
import { UnscopedTable } from './components/unscoped/UnscopedTable';
import { InitiativeForm } from './components/initiatives/InitiativeForm';
import { useJiraStatus, useSyncJira } from './hooks/useJira';

function JiraSyncButton() {
  const { data: jiraStatus } = useJiraStatus();
  const syncJira = useSyncJira();

  if (!jiraStatus?.configured) return null;

  return (
    <button
      onClick={() => syncJira.mutate()}
      disabled={syncJira.isPending}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-700"
    >
      <span
        className="inline-flex items-center justify-center w-4 h-4 rounded-sm bg-blue-600 text-white"
        style={{ fontSize: '9px', fontWeight: 700 }}
      >
        J
      </span>
      {syncJira.isPending ? 'Syncing...' : 'Sync Jira'}
      {syncJira.isSuccess && !syncJira.isPending && (
        <span className="text-green-600">✓</span>
      )}
    </button>
  );
}

function App() {
  return (
    <RoadmapProvider>
      <div className="h-screen flex flex-col bg-gray-100">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Product Roadmap</h1>
          <JiraSyncButton />
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
