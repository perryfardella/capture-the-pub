"use client";

// TODO
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ActivityFeed({ feed }: { feed: any[] }) {
  return (
    <div className="space-y-3 max-h-[60vh] overflow-y-auto">
      <h2 className="font-bold text-lg">Activity Feed</h2>

      {feed.map((item) => (
        <div
          key={item.id + item.type}
          className="flex flex-col p-2 border rounded space-y-1"
        >
          <p className="text-sm font-medium">
            {item.type === "capture" &&
              `${item.teams?.name} captured ${item.pub_id}`}
            {item.type === "challenge" &&
              `${item.teams?.name} ${
                item.step === "start"
                  ? "started"
                  : item.success
                  ? "succeeded"
                  : "failed"
              } a challenge at ${item.pub_id}`}
            {item.type === "bonus" &&
              `${item.teams?.name} earned a bonus point!`}
          </p>

          {item.media_url && (
            <>
              {item.media_url.endsWith(".mp4") ? (
                <video
                  src={item.media_url}
                  controls
                  className="w-full rounded"
                />
              ) : (
                // TODO: use Next image here instead of img
                <img
                  src={item.media_url}
                  alt="evidence"
                  className="w-full rounded"
                />
              )}
            </>
          )}

          <p className="text-xs text-muted-foreground">
            {new Date(item.created_at).toLocaleTimeString()}
          </p>
        </div>
      ))}
    </div>
  );
}
