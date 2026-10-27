import React from "react";
import type { Join } from "./types";
import { Button, Card, Copy, useT } from "./ui";
export function Consultation({
  onLeave,
}: {
  join: Join;
  onRejoin: () => Promise<Join>;
  onLeave: () => void;
}) {
  const t = useT();
  return (
    <Card title="Consultation">
      <Copy>
        {t(
          "Open this consultation in the Android/iOS development build. The web clinician portal supports browser video.",
        )}
      </Copy>
      <Button title="Close" onPress={onLeave} />
    </Card>
  );
}
