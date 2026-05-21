/** Advanced Markers should use gmp-click instead of click (Maps JS API guidance). */
export function onAdvancedMarkerClick(
  marker: google.maps.marker.AdvancedMarkerElement,
  handler: () => void,
): google.maps.MapsEventListener {
  return marker.addListener("gmp-click", handler);
}
