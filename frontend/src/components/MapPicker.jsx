import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';

function LocationMarker({ onChange }) {
  const [position, setPosition] = useState(null);
  const map = useMap();

  useMapEvents({
    click(e) {
      const newPos = { lat: e.latlng.lat, lng: e.latlng.lng };
      setPosition(newPos);
      onChange(newPos);
    },
  });

  // Try to get user's location on component mount
  useEffect(() => {
    map.locate().on("locationfound", function (e) {
      map.flyTo(e.latlng, map.getZoom());
      setPosition(e.latlng);
      onChange(e.latlng);
    });
  }, [map, onChange]);

  return position === null ? null : (
    <Marker position={position}>
      <Popup>Selected location</Popup>
    </Marker>
  );
}

export default function MapPicker({ center = [20, 0], zoom = 2, selected, onChange }) {
  return (
    <div className="relative h-64 border rounded overflow-hidden">
      <MapContainer 
        center={selected || center} 
        zoom={zoom} 
        style={{ height: '100%', width: '100%' }}
        className="z-10"
      >
        <TileLayer 
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <LocationMarker onChange={onChange} />
        {selected && !isNaN(selected.lat) && !isNaN(selected.lng) && (
          <Marker position={[selected.lat, selected.lng]}>
            <Popup>Selected location</Popup>
          </Marker>
        )}
      </MapContainer>
      <div className="absolute bottom-2 left-2 right-2 z-20 bg-white bg-opacity-90 p-2 rounded text-sm text-gray-600">
        Click on the map to select a location or allow location access to use your current position
      </div>
    </div>
  );
}
