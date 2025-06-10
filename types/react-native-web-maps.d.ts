declare module 'react-native-web-maps' {
  import { ComponentType } from 'react';
  
  interface MapViewProps {
    style?: any;
    region?: {
      latitude: number;
      longitude: number;
      latitudeDelta: number;
      longitudeDelta: number;
    };
    onRegionChangeComplete?: (region: any) => void;
    children?: React.ReactNode;
  }

  interface MarkerProps {
    coordinate: {
      latitude: number;
      longitude: number;
    };
  }

  const MapView: ComponentType<MapViewProps>;
  const Marker: ComponentType<MarkerProps>;

  export { MapView, Marker };
  export default MapView;
} 