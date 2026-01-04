import type { Sweep } from '../types/matterport'
import type { TextureResolution } from '../utils/textureLoader'

interface NavigationControlsProps {
  sweeps: Sweep[]
  currentSweep: Sweep
  onNavigate: (sweepUuid: string) => void
  resolution: TextureResolution
  resolutionMode: 'auto' | TextureResolution
  onResolutionModeChange: (mode: 'auto' | TextureResolution) => void
}

/**
 * Navigation UI component showing current position, resolution controls, and neighbor options
 */
export function NavigationControls({
  sweeps,
  currentSweep,
  onNavigate,
  resolution,
  resolutionMode,
  onResolutionModeChange,
}: NavigationControlsProps) {
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

      <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', opacity: 0.8 }}>Resolution</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              padding: '4px 8px',
              backgroundColor: resolutionMode === 'auto' ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            {resolutionMode === 'auto' ? `${resolution} (Auto)` : resolution}
          </div>
          <select
            value={resolutionMode}
            onChange={(e) => onResolutionModeChange(e.target.value as 'auto' | TextureResolution)}
            style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <option value="auto">Auto (FOV-based)</option>
            <option value="512">512px (Low)</option>
            <option value="1k">1k (Medium)</option>
            <option value="2k">2k (High)</option>
          </select>
        </div>
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
