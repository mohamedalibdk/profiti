import { GoogleMap, Libraries, LoadScript, Marker, Polyline } from '@react-google-maps/api';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GOOGLE_MAPS_API_KEY } from '../../constants/keys';

const libraries: Libraries = ['places', 'geocoding'];
const containerStyle = { width: '100%', height: '100%' };

interface MapProps {
  initialRegion?: { latitude: number; longitude: number };
  onMarkerChange?: (marker: { latitude: number; longitude: number }) => void;
  marker?: { latitude: number; longitude: number };
  livreurLocation?: { latitude: number; longitude: number; label?: string };
  boutiqueLocation?: { latitude: number; longitude: number; label?: string };
  boutiquesLocations?: { latitude: number; longitude: number; label?: string }[];
  livraisonLocation?: { latitude: number; longitude: number; label?: string };
  waypoints?: { latitude: number; longitude: number }[];
  showRoute?: boolean;
  onDirectionsData?: (data: any) => void;
}

const Map: React.FC<MapProps> = ({
  initialRegion,
  onMarkerChange,
  marker,
  livreurLocation,
  boutiqueLocation,
  boutiquesLocations,
  livraisonLocation,
  waypoints,
  showRoute,
  onDirectionsData,
}) => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [routePath, setRoutePath] = useState<{lat: number, lng: number}[]>([]);
  const [mapsLoaded, setMapsLoaded] = useState(false);

  const defaultCenter = livreurLocation
    ? { lat: livreurLocation.latitude, lng: livreurLocation.longitude }
    : boutiqueLocation
    ? { lat: boutiqueLocation.latitude, lng: boutiqueLocation.longitude }
    : livraisonLocation
    ? { lat: livraisonLocation.latitude, lng: livraisonLocation.longitude }
    : {
        lat: initialRegion?.latitude || 48.8566,
        lng: initialRegion?.longitude || 2.3522,
      };

  // رسم Polyline للمسار
  useEffect(() => {
    if (
      mapsLoaded &&
      showRoute &&
      waypoints &&
      waypoints.length >= 2 &&
      window.google &&
      window.google.maps
    ) {
      const [start, ...rest] = waypoints;
      const end = rest[rest.length - 1];
      const intermediateWaypoints = rest.slice(0, -1).map((wp: any) => ({
        location: { lat: wp.latitude, lng: wp.longitude },
        stopover: true,
      }));
      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: { lat: start.latitude, lng: start.longitude },
          destination: { lat: end.latitude, lng: end.longitude },
          waypoints: intermediateWaypoints,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result: any, status: any) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            // استخرج Polyline فقط!
            const overview_path = result.routes[0].overview_path.map(
              (point: google.maps.LatLng) => ({
                lat: point.lat(),
                lng: point.lng(),
              })
            );
            setRoutePath(overview_path);
            if (onDirectionsData) onDirectionsData(result);
          } else {
            setRoutePath([]);
            if (onDirectionsData) onDirectionsData(null);
          }
        }
      );
    } else {
      setRoutePath([]);
      if (onDirectionsData) onDirectionsData(null);
    }
  }, [waypoints, showRoute, onDirectionsData, mapsLoaded]);

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (onMarkerChange && e.latLng) {
        onMarkerChange({
          latitude: e.latLng.lat(),
          longitude: e.latLng.lng(),
        });
      }
    },
    [onMarkerChange]
  );

  // ----------- Icons/labels مخصصة لكل Marker -----------
  

  return (
    <View style={styles.container}>
      <LoadScript
        googleMapsApiKey={GOOGLE_MAPS_API_KEY}
        libraries={libraries}
        onLoad={() => setMapsLoaded(true)}
        onError={() => setMapsLoaded(false)}
      >
        {mapsLoaded ? (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={defaultCenter}
            zoom={15}
            onLoad={map => {
              mapRef.current = map;
            }}
            onClick={handleMapClick}
            options={{
              zoomControl: true,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
              gestureHandling: 'greedy',
              scrollwheel: true,
            }}
          >
            {/* ماركر livreur */}
            {livreurLocation && (
              <Marker
                position={{
                  lat: livreurLocation.latitude,
                  lng: livreurLocation.longitude,
                }}
                label={{
                  text: livreurLocation.label || "Livreur",
                  color: "white",
                  fontWeight: "bold",
                  fontSize: "13px"
                }}
                icon={window.google && window.google.maps ? {
                  url: "https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi2_hdpi.png",
                  labelOrigin: new window.google.maps.Point(15, 40),
                  scaledSize: new window.google.maps.Size(32, 32),
                } : undefined}
                title={livreurLocation.label || "Livreur"}
              />
            )}

            {/* ماركر boutique (قديم/واحد فقط للرجعية) */}
            {boutiqueLocation && (
              <Marker
                position={{
                  lat: boutiqueLocation.latitude,
                  lng: boutiqueLocation.longitude,
                }}
                label={{
                  text: boutiqueLocation.label || "Boutique",
                  color: "white",
                  fontWeight: "bold",
                  fontSize: "13px"
                }}
                icon={window.google && window.google.maps ? {
                  url: "https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi2_hdpi.png",
                  labelOrigin: new window.google.maps.Point(15, 40),
                  scaledSize: new window.google.maps.Size(32, 32),
                } : undefined}
                title={boutiqueLocation.label || "Boutique"}
              />
            )}

            {/* ماركرات boutiquesLocations (جميع البوتيكات) */}
            {boutiquesLocations &&
              boutiquesLocations.map((loc: any, idx: any) => (
                <Marker
                  key={`boutique-multi-${idx}`}
                  position={{
                    lat: loc.latitude,
                    lng: loc.longitude,
                  }}
                  label={{
                    text: loc.label || `Boutique`,
                    color: "white",
                    fontWeight: "bold",
                    fontSize: "13px"
                  }}
                  icon={window.google && window.google.maps ? {
                    url: "https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi2_hdpi.png",
                    labelOrigin: new window.google.maps.Point(15, 40),
                    scaledSize: new window.google.maps.Size(32, 32),
                  } : undefined}
                  title={loc.label || "Boutique"}
                />
              ))}

            {/* ماركر livraison (acheteur) */}
            {livraisonLocation && (
              <Marker
                position={{
                  lat: livraisonLocation.latitude,
                  lng: livraisonLocation.longitude,
                }}
                label={{
                  text: livraisonLocation.label || "Acheteur",
                  color: "white",
                  fontWeight: "bold",
                  fontSize: "13px"
                }}
                icon={window.google && window.google.maps ? {
                  url: "https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi2_hdpi.png",
                  labelOrigin: new window.google.maps.Point(15, 40),
                  scaledSize: new window.google.maps.Size(32, 32),
                } : undefined}
                title={livraisonLocation.label || "Acheteur"}
              />
            )}

            {/* Marker supplémentaire */}
            {marker && (
              <Marker
                position={{
                  lat: marker.latitude,
                  lng: marker.longitude,
                }}
              />
            )}

            {/* رسم المسار (Polyline يدوي فقط) */}
            {showRoute && routePath.length > 1 && (
              <Polyline
                path={routePath}
                options={{
                  strokeColor: '#2e7d32',
                  strokeOpacity: 0.9,
                  strokeWeight: 6,
                }}
              />
            )}
          </GoogleMap>
        ) : (
          <div style={{ width: "100%", height: "100%", textAlign: "center", paddingTop: 50 }}>
            Chargement de la carte...
          </div>
        )}
      </LoadScript>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});

export default Map;
