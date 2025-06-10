import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

interface MapProps {
  livreurLocation?: {
    latitude: number;
    longitude: number;
  };
  boutiqueLocation?: {
    latitude: number;
    longitude: number;
  };
  livraisonLocation?: {
    latitude: number;
    longitude: number;
  };
}

export default function LivraisonMap({
  livreurLocation,
  boutiqueLocation,
  livraisonLocation,
}: MapProps) {
  const calculateRegion = () => {
    const locations = [
      livreurLocation,
      boutiqueLocation,
      livraisonLocation,
    ].filter(Boolean) as { latitude: number; longitude: number }[];

    if (locations.length === 0) {
      return {
        latitude: 36.8065,
        longitude: 10.1815,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
    }

    const latitudes = locations.map(loc => loc.latitude);
    const longitudes = locations.map(loc => loc.longitude);

    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.01),
      longitudeDelta: Math.max((maxLng - minLng) * 1.5, 0.01),
    };
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={calculateRegion()}
      >
        {livreurLocation && (
          <Marker
            coordinate={livreurLocation}
            title="Votre position"
            pinColor="blue"
          />
        )}
        {boutiqueLocation && (
          <Marker
            coordinate={boutiqueLocation}
            title="Boutique"
            pinColor="green"
          />
        )}
        {livraisonLocation && (
          <Marker
            coordinate={livraisonLocation}
            title="Adresse de livraison"
            pinColor="red"
          />
        )}
        {livreurLocation && boutiqueLocation && livraisonLocation && (
          <>
            <Polyline
              coordinates={[livreurLocation, boutiqueLocation]}
              strokeColor="#0000FF"
              strokeWidth={2}
            />
            <Polyline
              coordinates={[boutiqueLocation, livraisonLocation]}
              strokeColor="#FF0000"
              strokeWidth={2}
            />
          </>
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 200,
    marginVertical: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
}); 