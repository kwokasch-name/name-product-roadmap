import { clsx } from 'clsx';
import { Tooltip } from '../ui/Tooltip';
import { useRoadmapContext } from '../../context/RoadmapContext';
import type { Initiative } from '../../types';

const ROW_HEIGHT = 48;
const ROW_GAP = 8;

interface InitiativeBarProps {
  initiative: Initiative;
  position: { left: number; width: number };
  row: number;
}

export function InitiativeBar({ initiative, position, row }: InitiativeBarProps) {
  const { setEditingInitiative } = useRoadmapContext();

  const handleClick = () => {
    setEditingInitiative(initiative);
  };

  const top = ROW_GAP + row * (ROW_HEIGHT + ROW_GAP);

  return (
    <Tooltip content={initiative.successCriteria || 'No success criteria defined. Click to add.'}>
      <div
        className={clsx(
          'initiative-bar',
          initiative.pod === 'Retail Therapy' ? 'retail-therapy' : initiative.pod === 'Migration' ? 'migration' : 'json-id',
          {
            'opacity-60': initiative.status === 'completed',
            'ring-2 ring-yellow-400': initiative.status === 'blocked',
          }
        )}
        style={{
          left: position.left,
          width: position.width,
          top,
          height: ROW_HEIGHT,
        }}
        onClick={handleClick}
      >
        <span className="truncate flex-1">{initiative.title}</span>
        <span className="flex items-center gap-1 flex-shrink-0">
          {initiative.jiraEpicKey && (
            <span
              title={`Linked to Jira: ${initiative.jiraEpicKey}`}
              className="inline-flex items-center justify-center w-4 h-4 rounded-sm bg-blue-600 text-white"
              style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '-0.02em' }}
            >
              J
            </span>
          )}
          <span className="text-xs opacity-75">
            {initiative.developerCount}
            <svg className="inline-block w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
            </svg>
          </span>
        </span>
      </div>
    </Tooltip>
  );
}
