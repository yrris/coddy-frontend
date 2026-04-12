import type { AppVO } from '../types/app';

type AppCardProps = {
  app: AppVO;
  onViewChat: () => void;
  onViewSite?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onLike?: () => void;
  onUnlike?: () => void;
};

function AppCard({ app, onViewChat, onViewSite, onEdit, onDelete, onLike, onUnlike }: AppCardProps) {
  const ownerName = app.user?.displayName || 'Anonymous';
  const ownerAvatar = app.user?.avatarUrl;

  return (
    <article className="app-card">
      {app.cover ? (
        <img className="app-card-cover" src={app.cover} alt={app.appName} />
      ) : (
        <div className="app-card-cover app-card-cover-fallback" />
      )}

      <div className="app-card-body">
        <div className="app-card-title-row">
          <h3 title={app.appName}>{app.appName}</h3>
          {app.isFeatured ? <span className="badge badge-featured">Featured</span> : null}
        </div>
        <p className="app-card-meta">{app.codeGenType}</p>

        <div className="app-card-owner">
          {ownerAvatar ? (
            <img src={ownerAvatar} alt={ownerName} className="owner-avatar" />
          ) : (
            <div className="owner-avatar owner-avatar-fallback">{ownerName.slice(0, 1).toUpperCase()}</div>
          )}
          <span>{ownerName}</span>

          {(onLike || onUnlike) && app.likeCount != null ? (
            <button
              type="button"
              className={`like-btn ${app.hasLiked ? 'liked' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                if (app.hasLiked) {
                  onUnlike?.();
                } else {
                  onLike?.();
                }
              }}
            >
              {app.hasLiked ? '♥' : '♡'} {app.likeCount}
            </button>
          ) : app.likeCount != null && app.likeCount > 0 ? (
            <span className="like-count">♥ {app.likeCount}</span>
          ) : null}
        </div>

        <div className="app-card-actions">
          <button type="button" className="ghost-btn" onClick={onViewChat}>
            View Chat
          </button>
          {onViewSite ? (
            <button type="button" className="ghost-btn" onClick={onViewSite}>
              View Site
            </button>
          ) : null}
          {onEdit ? (
            <button type="button" className="ghost-btn" onClick={onEdit}>
              Edit
            </button>
          ) : null}
          {onDelete ? (
            <button type="button" className="ghost-btn danger-btn" onClick={onDelete}>
              Delete
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default AppCard;
