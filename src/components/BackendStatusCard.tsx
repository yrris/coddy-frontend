import { useQuery } from '@tanstack/react-query';
import { fetchHealthPing } from '../lib/api';
import { ApiError } from '../lib/http';

function BackendStatusCard() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['health-ping'],
    queryFn: fetchHealthPing
  });

  const resolvedError = error instanceof ApiError ? error.message : 'Backend is unreachable.';

  return (
    <section className="panel">
      <h2>Backend Status</h2>
      <p className="panel-subtitle">
        Connection to <code>/api/health/ping</code>
      </p>

      {isLoading && <p className="status loading">Checking backend status...</p>}

      {isError && <p className="status error">{resolvedError}</p>}

      {data && (
        <div className="status success">
          <div className="user-info-card">
            <div className="info-row">
              <span className="info-label">Service</span>
              <span className="info-value">{data.data.service}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Status</span>
              <span className="info-value">{data.data.status}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Time</span>
              <span className="info-value">{new Date(data.timestamp).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      <button className="ghost-btn" onClick={() => refetch()} type="button" style={{ marginTop: '0.75rem' }}>
        Refresh
      </button>
    </section>
  );
}

export default BackendStatusCard;
