import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";
import type { Row } from "./api";
export default function VideoRoom({
  room,
  onLeave,
  onError,
}: {
  room: Row;
  onLeave: () => void;
  onError: (message: string) => void;
}) {
  return (
    <LiveKitRoom
      serverUrl={room.url || room.server_url}
      token={room.token}
      connect
      audio={false}
      video={false}
      onDisconnected={onLeave}
      onError={(e) =>
        onError(
          `Consultation connection: ${e.message}. You can leave and rejoin the visit.`,
        )
      }
      data-lk-theme="default"
      style={{ flex: 1, minHeight: 0 }}
    >
      <VideoConference />
    </LiveKitRoom>
  );
}
