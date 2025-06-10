import * as Location from 'expo-location';
import { doc, updateDoc } from 'firebase/firestore';
import { Alert } from 'react-native';
import { auth, db } from '../constants/firebaseConfig';

export const useLocation = () => {
  const askAndSaveLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission refusée", "L'accès à la localisation est requis.");
        return null;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, "users", user.uid), {
          location: {
            latitude,
            longitude,
            updatedAt: new Date(),
          },
        });
      }

      return { latitude, longitude };
    } catch (error: any) {
      Alert.alert("Erreur", error.message || "Impossible de récupérer la localisation.");
      return null;
    }
  };

  return { askAndSaveLocation };
};
