import React, { useEffect, useState } from "react";
import { View } from "react-native";
import {
  AudioSession,
  LiveKitRoom,
  VideoTrack,
  registerGlobals,
  useTracks,
  useLocalParticipant,
  useConnectionState,
} from "@livekit/react-native";
import { Track } from "livekit-client";
import type { Join } from "./types";
import { Button, Card, Copy, ErrorText, styles, useT } from "./ui";
registerGlobals();
function RoomControls({
  leave,
  onError,
}: {
  leave: () => void;
  onError: (message: string) => void;
}) {
  const t = useT();
  const tracks = useTracks([Track.Source.Camera]);
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } =
    useLocalParticipant();
  const connection = useConnectionState();
  return (
    <View style={{ gap: 12 }}>
      <Copy>{`${t("Connection:")} ${connection}`}</Copy>
      {tracks.length ? (
        tracks.map((track) => (
          <VideoTrack
            key={track.publication.trackSid}
            trackRef={track}
            style={{ width: "100%", height: 240, borderRadius: 18 }}
          />
        ))
      ) : (
        <Copy>Waiting for the other participant. Camera and microphone start off.</Copy>
      )}
      <View style={styles.wrap}>
        <Button
          title={isMicrophoneEnabled ? "Mute microphone" : "Enable microphone"}
          onPress={() =>
            void localParticipant
              .setMicrophoneEnabled(!isMicrophoneEnabled)
              .catch((e) => onError(e.message))
          }
        />
        <Button
          quiet
          title={isCameraEnabled ? "Turn camera off" : "Enable camera"}
          onPress={() =>
            void localParticipant
              .setCameraEnabled(!isCameraEnabled)
              .catch((e) => onError(e.message))
          }
        />
        <Button danger title="Leave consultation" onPress={leave} />
      </View>
    </View>
  );
}
export function Consultation({
  join,
  onRejoin,
  onLeave,
}: {
  join: Join;
  onRejoin: () => Promise<Join>;
  onLeave: () => void;
}) {
  const [currentJoin, setCurrentJoin] = useState(join);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const serverUrl = currentJoin.url || currentJoin.server_url || "";
  const validServer = (__DEV__ ? /^wss?:\/\// : /^wss:\/\//).test(serverUrl);
  useEffect(() => {
    if (!validServer) return;
    AudioSession.startAudioSession().catch((e) => setError(e.message));
    return () => {
      void AudioSession.stopAudioSession();
    };
  }, [validServer]);
  if (!validServer)
    return (
      <Card title="Consultation">
        <Copy>A secure consultation server is required.</Copy>
        <Button title="Close" onPress={onLeave} />
      </Card>
    );
  return (
    <Card title="Consultation">
      {!!error && <ErrorText>{error}</ErrorText>}
      <LiveKitRoom
        key={attempt}
        serverUrl={serverUrl}
        token={currentJoin.token}
        connect
        audio={false}
        video={false}
        onError={(e) => setError(e.message)}
        onDisconnected={() =>
          setError("Disconnected. Rejoin or leave the consultation.")
        }
      >
        <RoomControls leave={onLeave} onError={setError} />
      </LiveKitRoom>
      {!!error && (
        <Button
          quiet
          title="Rejoin"
          onPress={() =>
            void onRejoin()
              .then((value) => {
                setCurrentJoin(value);
                setError("");
                setAttempt((a) => a + 1);
              })
              .catch((e) => setError(e.message))
          }
        />
      )}
    </Card>
  );
}
