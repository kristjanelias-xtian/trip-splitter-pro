import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Stay } from '@/types/stay'
import { Card } from '@/components/ui/card'

const MARKER_COLORS = [
  '#fbbf24', // amber-400
  '#38bdf8', // sky-400
  '#fb7185', // rose-400
  '#34d399', // emerald-400
  '#a78bfa', // violet-400
  '#818cf8', // indigo-400
]

function createColoredIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 24px;
      height: 24px;
      background: ${color};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  })
}

interface FitBoundsProps {
  bounds: L.LatLngBoundsExpression
}

function FitBounds({ bounds }: FitBoundsProps) {
  const map = useMap()
  useEffect(() => {
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 })
  }, [map, bounds])
  return null
}

interface StayMapProps {
  stays: Stay[]
}

function StayMap({ stays }: StayMapProps) {
  const staysWithCoords = stays.filter(
    (s): s is Stay & { latitude: number; longitude: number } =>
      s.latitude != null && s.longitude != null
  )

  if (staysWithCoords.length === 0) return null

  const bounds = L.latLngBounds(
    staysWithCoords.map((s) => [s.latitude, s.longitude] as L.LatLngTuple)
  )

  // Use center of first marker for initial position
  const center: L.LatLngTuple = [staysWithCoords[0].latitude, staysWithCoords[0].longitude]

  return (
    <Card className="overflow-hidden">
      <MapContainer
        center={center}
        zoom={10}
        scrollWheelZoom={false}
        style={{ height: 300, width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds bounds={bounds} />
        {staysWithCoords.map((stay, index) => (
          <Marker
            key={stay.id}
            position={[stay.latitude, stay.longitude]}
            icon={createColoredIcon(MARKER_COLORS[index % MARKER_COLORS.length])}
          >
            <Popup>
              <strong>{stay.name}</strong>
              <br />
              {stay.check_in_date} — {stay.check_out_date}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </Card>
  )
}

export default StayMap
