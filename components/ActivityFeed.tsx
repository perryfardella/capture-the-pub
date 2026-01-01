"use client";

import Image from "next/image";

// TODO
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ActivityFeed({ feed }: { feed: any[] }) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold">Activity Feed</h2>

      {feed.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity yet</p>
      ) : (
        <div className="space-y-2">
          {feed.map((item) => (
            <div
              key={item.id + item.type}
              className="flex flex-col p-3 border rounded space-y-2"
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
                    <Image
                      src={item.media_url}
                      alt="evidence"
                      width={800}
                      height={600}
                      className="w-full rounded"
                      unoptimized
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
      )}
    </div>
  );
}
