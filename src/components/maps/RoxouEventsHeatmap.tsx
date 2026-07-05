import RoxouNearbyEventsMap, { type NearbyEvent } from "./RoxouNearbyEventsMap";
import type { LatLng } from "@/shared/utils/geoUtils";

interface Props {
  events: NearbyEvent[];
  userLocation?: LatLng | null;
  height?: number | string;
}

export default function RoxouEventsHeatmap({ events, userLocation, height = 360 }: Props) {
  return (
    <RoxouNearbyEventsMap
      events={events}
      userLocation={userLocation}
      height={height}
      heatmap
    />
  );
}
