import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css'; // Ensure CSS is loaded as a safeguard

function LocationMarker({ onChange }) {
  const [position, setPosition] = useState(null);

  useMapEvents({
    click(e) {
      const newPos = { lat: e.latlng.lat, lng: e.latlng.lng };
      setPosition(newPos);
      onChange(newPos);
    },
  });

  return position === null ? null : (
    <Marker position={position}>
      <Popup>Selected location</Popup>
    </Marker>
  );
}

export default function MapPicker({ selected, onChange }) {
  // Default to a central location if no location is selected yet
  const mapCenter = selected ? [selected.lat, selected.lng] : [51.505, -0.09];
  const zoom = selected ? 13 : 3;

  return (
    <div className="h-80 w-full border rounded">
      <MapContainer 
        center={mapCenter}
        zoom={zoom} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false} // Common practice for maps in forms
      >
        <TileLayer 
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <LocationMarker onChange={onChange} />
        {/* The LocationMarker now handles showing the selected position */}
      </MapContainer>
      <div className="p-2 bg-gray-100 text-center text-sm text-gray-700">
        Click on the map to select a precise location.
      </div>
    </div>
  );
}
