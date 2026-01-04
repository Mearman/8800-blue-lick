import type { Sweep } from '../types/matterport'

interface NavigationControlsProps {
  sweeps: Sweep[]
  currentSweep: Sweep
  onNavigate: (sweepUuid: string) => void
}

/**
 * Navigation UI component showing current position and neighbor options
 */
export function NavigationControls({ sweeps, currentSweep, onNavigate }: NavigationControlsProps) {
  // Get neighbor sweep objects
  const neighbors = currentSweep.neighbors
    .map((index) => sweeps.find((s) => s.index === index))
    .filter((s): s is Sweep => s !== undefined)

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '16px',
        borderRadius: '8px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        maxWidth: '300px',
        zIndex: 1000,
      }}
    >
      <div style={{ marginBottom: '12px' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Current Location</h3>
        <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
          {currentSweep.sweep_name || `Sweep ${currentSweep.index + 1}`}
        </p>
        <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.7 }}>
          UUID: {currentSweep.sweep_uuid.substring(0, 8)}... | Floor: {currentSweep.floor_index} | Room: {currentSweep.room_index}
        </p>
      </div>

      {neighbors.length > 0 && (
        <div>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Navigate to:</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {neighbors.map((neighbor) => (
              <button
                key={neighbor.sweep_uuid}
                onClick={() => onNavigate(neighbor.sweep_uuid)}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  textAlign: 'left',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
                }}
              >
                {neighbor.sweep_name || `Sweep ${neighbor.index + 1}`}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: '12px', fontSize: '11px', opacity: 0.6 }}>
        Use arrow keys or drag to look around
        <br />
        Scroll to zoom
      </div>
    </div>
  )
}
