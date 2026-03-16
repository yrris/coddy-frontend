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
      <h2>Backend Link Check</h2>
      <p className="panel-subtitle">This verifies connection to <code>/api/health/ping</code>.</p>

      {isLoading && <p className="status loading">Checking backend status...</p>}

      {isError && (
        <p className="status error">
          {resolvedError}
        </p>
      )}

      {data && (
        <div className="status success">
          <div>Service: {data.data.service}</div>
          <div>Status: {data.data.status}</div>
          <div>Time: {new Date(data.timestamp).toLocaleString()}</div>
        </div>
      )}

      <button className="primary-btn" onClick={() => refetch()} type="button">
        Refresh
      </button>
    </section>
  );
}

export default BackendStatusCard;
