import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Auth, signOut } from 'firebase/auth';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import MapComponent from '../../../components/Map';

import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db, storage } from '../../../constants/firebaseConfig';
import { GOOGLE_MAPS_API_KEY } from '../../../constants/keys';


interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta?: number;
  longitudeDelta?: number;
}

interface Marker {
  latitude: number;
  longitude: number;
}

// --- Fonction utilitaire pour formatter l'adresse ---
function getCustomAddress(components: any[], searchedName?: string): string {
  const place =
    components.find((c: any) => c.types.includes("premise"))?.long_name ||
    components.find((c: any) => c.types.includes("point_of_interest"))?.long_name ||
    components.find((c: any) => c.types.includes("establishment"))?.long_name ||
    components.find((c: any) => c.types.includes("route"))?.long_name ||
    components.find((c: any) => c.types.includes("neighborhood"))?.long_name;

  const sublocality = components.find((c: any) => c.types.includes("sublocality") || c.types.includes("sublocality_level_1"))?.long_name;

  const city =
    components.find((c: any) => c.types.includes("locality"))?.long_name ||
    components.find((c: any) => c.types.includes("administrative_area_level_2"))?.long_name;

  const parts = [place, sublocality, city].filter(Boolean);
  let customAddress = parts.join(', ');

  if (
    searchedName &&
    !customAddress.toLowerCase().includes(searchedName.trim().toLowerCase())
  ) {
    customAddress = `${searchedName.trim()}, ${customAddress}`;
  }

  return customAddress;
}

export default function ProfilScreen() {
  const currentUser = auth.currentUser;
  const userId = currentUser?.uid;
  const router = useRouter();

  const [, forceUpdate] = useState(0); // Force re-render à chaque modification marker/livraison
  const [loading, setLoading] = useState(true);
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [role, setRole] = useState('');
  const [region, setRegion] = useState<Region | null>(null);
  const [marker, setMarker] = useState<Marker | null>(null);
  const markerRef = useRef<Marker | null>(null); // ref pour marker
  const [adresseLisible, setAdresseLisible] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [mapError, setMapError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [livraisonFree, setLivraisonFree] = useState<boolean | null>(null);
  const livraisonFreeRef = useRef<boolean | null>(null); // ref pour livraisonFree
  const [showCustomAlert, setShowCustomAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertType, setAlertType] = useState<'delete' | 'error' | 'success'>('delete');

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', "L'application a besoin d'accéder à vos photos.");
      }
    })();
  }, []);
  
  useEffect(() => {
    if (!userId) return;
    const fetchProfil = async () => {
      setLoading(true);
      try {
        const userRef = doc(db, 'users', userId);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setNom(data.nom || '');
          setPrenom(data.prenom || '');
          setEmail(data.email || '');
          setTelephone(data.phone || '');
          setRole(data.role || '');
          if (typeof data.livraisonFree === 'boolean') {
            setLivraisonFree(data.livraisonFree);
            livraisonFreeRef.current = data.livraisonFree;
          }
          if (data.imageUri?.startsWith('http')) setPhotoURL(data.imageUri);
          if (data.location) {
            const { latitude, longitude } = data.location;
            setRegion({ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });
            setMarker({ latitude, longitude });
            markerRef.current = { latitude, longitude };
            if (data.adresse) setAdresseLisible(data.adresse);
            else reverseGeocode(latitude, longitude, searchInput);
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        Alert.alert('Erreur', "Impossible de charger le profil");
      }
      setLoading(false);
    };
    fetchProfil();
  }, [userId]);

  const reverseGeocode = async (latitude: number, longitude: number, searchedName?: string) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const components = data.results[0].address_components as any[];
        const customAddress = getCustomAddress(components, searchedName);
        setAdresseLisible(customAddress || data.results[0].formatted_address);
      } else {
        setAdresseLisible('');
      }
    } catch (err) {
      setAdresseLisible('');
    }
  };

  useEffect(() => {
    if (marker) reverseGeocode(marker.latitude, marker.longitude, searchInput);
  }, [marker]);

  const handleLogout = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const ref = doc(db, 'panier', user.uid);
        await setDoc(ref, { items: [] }, { merge: true });
      }
      await signOut(auth as Auth);
      router.replace('/(auth)/login');
    } catch {
      Alert.alert('Erreur', "Échec de la déconnexion");
    }
  };

  const pickImage = async () => {
    try {
      console.log('Starting image picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });
      
      console.log('Image picker result:', result);
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        console.log('Selected image details:', {
          uri: selectedImage.uri,
          width: selectedImage.width,
          height: selectedImage.height,
          type: selectedImage.type,
        });
        
        if (!selectedImage.uri) {
          throw new Error('No image URI received');
        }
        
        // Set the photo URL
        setPhotoURL(selectedImage.uri);
        console.log('Photo URL set to:', selectedImage.uri);
      } else {
        console.log('Image selection was canceled');
      }
    } catch (error) {
      console.error('Error in pickImage:', error);
      Alert.alert(
        'Erreur',
        "Impossible de sélectionner l'image. Veuillez réessayer."
      );
    }
  };
  

  // --- handleMarkerChange avec forceUpdate ---
  function handleMarkerChange(coords: Marker) {
    setMarker(coords);
    markerRef.current = coords;
    forceUpdate(x => x + 1); // Force le render pour avoir le dernier marker dans handleSave
  }

  // --- handleLivraisonChange avec forceUpdate ---
  function handleLivraisonChange(value: boolean) {
    setLivraisonFree(value);
    livraisonFreeRef.current = value;
    forceUpdate(x => x + 1); // Force le render pour avoir la dernière valeur dans handleSave
  }

  const handleSave = async () => {
    if (!userId) {
      console.error('No user ID found');
      return Alert.alert('Erreur', "Utilisateur non connecté");
    }
    
    if (telephone && !/^[0-9]{8}$/.test(telephone)) {
      return Alert.alert('Erreur', "Téléphone invalide");
    }
    
    setLoading(true);
    try {
      let imageUrl = photoURL;
      
      // Handle image upload if a new image was selected
      if (photoURL?.startsWith('data:image')) {
        try {
          console.log('Starting image upload process...');
          
          // Convert base64 to blob
          const response = await fetch(photoURL);
          const blob = await response.blob();
          
          if (blob.size === 0) {
            throw new Error('Image blob is empty');
          }
          
          // Create storage reference with proper path
          const timestamp = Date.now();
          const filename = `profileImages/${userId}/${timestamp}.jpg`;
          console.log('Storage path:', filename);
          
          // Create a reference to the file location
          const storageRef = ref(storage, filename);
          
          // Create file metadata including the content type
          const metadata = {
            contentType: 'image/jpeg',
          };
          
          // Upload the file and metadata
          console.log('Uploading to Firebase Storage...');
          const uploadResult = await uploadBytes(storageRef, blob, metadata);
          console.log('Upload result:', uploadResult);
          
          // Get download URL
          console.log('Getting download URL...');
          imageUrl = await getDownloadURL(uploadResult.ref);
          console.log('Download URL:', imageUrl);
          
          if (!imageUrl) {
            throw new Error('Failed to get download URL');
          }
          
        } catch (uploadError: any) {
          console.error('Detailed upload error:', uploadError);
          Alert.alert(
            'Erreur Upload',
            `Échec de l'upload de l'image: ${uploadError.message || 'Erreur inconnue'}`
          );
          setLoading(false);
          return;
        }
      } else {
        console.log('No new image to upload, using existing URL:', photoURL);
      }
      
      // Prepare user data
      const userData = {
        nom,
        prenom,
        email,
        telephone,
        imageUri: imageUrl,
        location: markerRef.current,
        adresse: adresseLisible,
        updatedAt: new Date().toISOString(),
        ...(role === 'vendeur' && livraisonFreeRef.current !== null 
          ? { livraisonFree: livraisonFreeRef.current } 
          : {})
      };
      
      console.log('Saving user data to Firestore:', userData);
      
      // Save to Firestore
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, userData, { merge: true });
      
      // Update local state
      setAdresseLisible(adresseLisible);
      Alert.alert('Succès', 'Profil mis à jour avec succès');
      
    } catch (err: any) {
      console.error('Detailed save error:', err);
      Alert.alert(
        'Erreur',
        `Échec de mise à jour du profil: ${err.message || 'Erreur inconnue'}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSearch = async (searchText: string) => {
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          searchText
        )}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        setRegion({
          latitude: location.lat,
          longitude: location.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        setMarker({
          latitude: location.lat,
          longitude: location.lng,
        });
        markerRef.current = {
          latitude: location.lat,
          longitude: location.lng,
        };

        const components = data.results[0].address_components as any[];
        const customAddress = getCustomAddress(components, searchText);

        setAdresseLisible(customAddress || data.results[0].formatted_address);
      } else {
        Alert.alert('Erreur', 'Aucun résultat trouvé pour ce lieu');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Échec de la recherche de lieu');
    }
    setIsSearching(false);
  };

  const handleDeleteAccount = async () => {
    console.log('Delete account button clicked');
    const user = auth.currentUser;
    console.log('Current user:', user?.uid);
    
    if (!user) {
      console.log('No user found');
      setAlertTitle('Erreur');
      setAlertMessage("Utilisateur non connecté");
      setAlertType('error');
      setShowCustomAlert(true);
      return;
    }

    // Vérifier l'état de l'authentification
    try {
      await user.reload();
      console.log('User reloaded successfully');
    } catch (error) {
      console.error('Error reloading user:', error);
      setAlertTitle('Erreur');
      setAlertMessage("Session expirée. Veuillez vous reconnecter.");
      setAlertType('error');
      setShowCustomAlert(true);
      return;
    }

    setAlertTitle("Suppression du compte");
    setAlertMessage("Êtes-vous sûr de vouloir supprimer définitivement votre compte ? Cette action est irréversible.");
    setAlertType('delete');
    setShowCustomAlert(true);
  };

  const handleConfirmDelete = async () => {
    const user = auth.currentUser;
    if (!user) return;

    console.log('Delete confirmed, starting deletion process');
    try {
      // Vérifier que l'utilisateur existe toujours
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        throw new Error("L'utilisateur n'existe plus dans la base de données");
      }

      // Supprimer l'image de profil si elle existe
      if (photoURL?.startsWith('https://')) {
        console.log('Deleting profile image');
        try {
          const url = new URL(photoURL);
          const pathname = decodeURIComponent(url.pathname);
          const filePath = pathname.split('/o/')[1]?.split('?')[0];
          if (filePath) {
            console.log('Deleting file from storage:', filePath);
            const storageRef = ref(storage, filePath);
            await deleteObject(storageRef);
            console.log('Profile image deleted successfully');
          }
        } catch (error) {
          console.error('Error deleting profile image:', error);
          // Continue with deletion even if image deletion fails
        }
      }

      // Supprimer les données Firestore
      console.log('Deleting Firestore data');
      await deleteDoc(doc(db, 'users', user.uid));
      console.log('Firestore data deleted successfully');

      // Supprimer le compte Firebase Auth
      console.log('Deleting Firebase Auth account');
      await user.delete();
      console.log('Firebase Auth account deleted successfully');

      setAlertTitle('Succès');
      setAlertMessage('Compte supprimé avec succès');
      setAlertType('success');
      setShowCustomAlert(true);
      
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 1500);
    } catch (error: any) {
      console.error('Error in delete account process:', error);
      setAlertTitle('Erreur');
      if (error.code === 'auth/requires-recent-login') {
        setAlertMessage('Veuillez vous reconnecter avant de supprimer votre compte pour des raisons de sécurité.');
      } else if (error.code === 'auth/network-request-failed') {
        setAlertMessage('Erreur de connexion. Veuillez vérifier votre connexion internet.');
      } else {
        setAlertMessage(`Impossible de supprimer le compte: ${error.message || 'Erreur inconnue'}`);
      }
      setAlertType('error');
      setShowCustomAlert(true);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header with Gradient */}
        <LinearGradient
         colors={['#10b981', '#22c55e']}
          
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}> Mon Profil ✨</Text>
            <Text style={styles.subtitle}>  Gérez votre profil</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Profile Picture Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper}>
              <Image 
                source={
                  photoURL 
                    ? { uri: photoURL } 
                    : { uri: 'https://via.placeholder.com/120x120/10b981/ffffff?text=JD' }
                } 
                style={styles.avatar}
              />
              <LinearGradient
                colors={['rgba(16, 185, 129, 0.9)', 'rgba(34, 197, 94, 0.9)']}
                style={styles.avatarOverlay}
              >
                <Ionicons name="camera" size={20} color="#ffffff" />
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.changePhotoText}>Changer la photo</Text>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.replace('../../change/change-password')}>
              <LinearGradient
                colors={['#f59e0b', '#f97316']}
                style={styles.actionCardGradient}
              >
                <Ionicons name="key-outline" size={20} color="#ffffff" />
              </LinearGradient>
              <Text style={styles.actionCardText}>Mot de passe</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={() => router.replace('../../compte/StatistiquesWrapper')}>
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                style={styles.actionCardGradient}
              >
                <Ionicons name="bar-chart-outline" size={20} color="#ffffff" />
              </LinearGradient>
              <Text style={styles.actionCardText}>Statistiques</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={handleLogout}>
              <LinearGradient
                colors={['#dc2626', '#b91c1c']}
                style={styles.actionCardGradient}
              >
                <Ionicons name="log-out-outline" size={20} color="#ffffff" />
              </LinearGradient>
              <Text style={styles.actionCardText}>Déconnexion</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Informations personnelles</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nom</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  value={nom} 
                  onChangeText={setNom}
                  placeholder="Votre nom"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Prénom</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  value={prenom} 
                  onChangeText={setPrenom}
                  placeholder="Votre prénom"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={[styles.inputWrapper, styles.disabledInput]}>
                <Ionicons name="mail-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput 
                  style={[styles.input, styles.disabledText]} 
                  value={email} 
                  editable={false}
                  placeholder="Votre email"
                  placeholderTextColor="#9ca3af"
                />
                <Ionicons name="lock-closed-outline" size={16} color="#9ca3af" />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Téléphone</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={telephone}
                  onChangeText={text => setTelephone(text.replace(/[^0-9]/g, '').slice(0, 8))}
                  keyboardType="numeric"
                  maxLength={8}
                  placeholder="Votre téléphone"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>
          </View>

          {/* Vendor-specific settings */}
          {role === 'vendeur' && (
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Paramètres vendeur</Text>
              
              <View style={styles.switchGroup}>
                <View style={styles.switchContent}>
                  <View style={styles.switchIconContainer}>
                    <LinearGradient
                      colors={livraisonFree ? ['#10b981', '#22c55e'] : ['#6b7280', '#9ca3af']}
                      style={styles.switchIcon}
                    >
                      <Ionicons 
                        name="car-outline" 
                        size={20} 
                        color="#ffffff" 
                      />
                    </LinearGradient>
                  </View>
                  <View style={styles.switchTextContainer}>
                    <Text style={styles.switchTitle}>Livraison gratuite</Text>
                    <Text style={styles.switchSubtitle}>
                      {livraisonFree ? 'Activée pour vos clients' : 'Payante pour vos clients'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={livraisonFree ?? false}
                  onValueChange={setLivraisonFree}
                  trackColor={{ false: '#e5e7eb', true: '#10b981' }}
                  thumbColor={livraisonFree ? '#ffffff' : '#f4f3f4'}
                />
              </View>

              <View style={styles.locationSection}>
                <Text style={styles.locationTitle}>Localisation du magasin</Text>
                <View style={styles.searchWrapper}>
                  <Ionicons name="search-outline" size={20} color="#6b7280" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Rechercher un lieu"
                    value={searchInput}
                    onChangeText={setSearchInput}
                    onSubmitEditing={() => handleLocationSearch(searchInput)}
                    editable={!isSearching}
                    placeholderTextColor="#9ca3af"
                  />
                  <TouchableOpacity 
                    style={styles.searchButton}
                    onPress={() => handleLocationSearch(searchInput)}

                    disabled={isSearching}
                  >
                    {isSearching ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Ionicons name="location-outline" size={16} color="#ffffff" />
                    )}
                  </TouchableOpacity>
                </View>

                {adresseLisible && (
                  <View style={styles.currentLocationCard}>
                    <LinearGradient
                      colors={['#f59e0b', '#f97316']}
                      style={styles.locationIcon}
                    >
                      <Ionicons name="location" size={16} color="#ffffff" />
                    </LinearGradient>
                    <Text style={styles.currentLocationText}>{adresseLisible}</Text>
                  </View>
                )}

                <View style={styles.mapPlaceholder}>
                  <LinearGradient
                    colors={['#e5e7eb', '#f3f4f6']}
                    style={styles.mapGradient}
                  >
                    <Ionicons name="map-outline" size={48} color="#9ca3af" />
                  </LinearGradient>
                  {mapError && (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>{mapError}</Text>
                    </View>
                  )}

                  <View style={styles.mapContainer}>
                    {!GOOGLE_MAPS_API_KEY ? (
                      <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>Google Maps API key is not configured</Text>
                      </View>
                    ) : (
                      <MapComponent
                        initialRegion={region || undefined}
                        marker={marker || undefined}
                        onMarkerChange={handleMarkerChange}
                      />
                    )}
                  </View>

                  {adresseLisible && (
                    <View style={styles.addressContainer}>
                      <Text style={styles.addressText}>📍 {adresseLisible}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Danger Zone */}
          <View style={styles.dangerZone}>
            <Text style={styles.dangerTitle}>Zone de danger</Text>
            <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount}>
              <LinearGradient
                colors={['rgba(239, 68, 68, 0.1)', 'rgba(220, 38, 38, 0.1)']}
                style={styles.deleteButtonGradient}
              >
                <Ionicons name="trash-outline" size={20} color="#dc2626" />
                <Text style={styles.deleteButtonText}>Supprimer le compte</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
          <LinearGradient
            colors={['#10b981', '#22c55e']}
            style={styles.saveButtonGradient}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-outline" size={20} color="#ffffff" />
                <Text style={styles.saveButtonText}>Enregistrer les modifications</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Custom Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showCustomAlert}
        onRequestClose={() => setShowCustomAlert(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={
                alertType === 'delete' ? ['#dc2626', '#b91c1c'] :
                alertType === 'success' ? ['#10b981', '#22c55e'] :
                ['#3b82f6', '#2563eb']
              }
              style={styles.modalHeader}
            >
              <Ionicons 
                name={
                  alertType === 'delete' ? 'warning-outline' :
                  alertType === 'success' ? 'checkmark-circle-outline' :
                  'information-circle-outline'
                } 
                size={24} 
                color="#ffffff" 
              />
              <Text style={styles.modalTitle}>{alertTitle}</Text>
            </LinearGradient>
            
            <View style={styles.modalBody}>
              <Text style={styles.modalMessage}>{alertMessage}</Text>
              
              <View style={styles.modalButtons}>
                {alertType === 'delete' ? (
                  <>
                    <Pressable
                      style={styles.cancelButton}
                      onPress={() => setShowCustomAlert(false)}
                    >
                      <Text style={styles.cancelButtonText}>Annuler</Text>
                    </Pressable>
                    <Pressable
                      style={styles.confirmDeleteButton}
                      onPress={() => {
                        setShowCustomAlert(false);
                        console.log('Account deleted');
                      }}
                    >
                      <LinearGradient
                        colors={['#dc2626', '#b91c1c']}
                        style={styles.confirmDeleteGradient}
                      >
                        <Text style={styles.confirmDeleteText}>Supprimer</Text>
                      </LinearGradient>
                    </Pressable>
                  </>
                ) : (
                  <Pressable
                    style={styles.okButton}
                    onPress={() => setShowCustomAlert(false)}
                  >
                    <LinearGradient
                      colors={['#10b981', '#22c55e']}
                      style={styles.okButtonGradient}
                    >
                      <Text style={styles.okButtonText}>OK</Text>
                    </LinearGradient>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  
  // Header Styles
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',},
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#ffffff',
    letterSpacing: 0.5,
    marginBottom: 2,
    marginTop:-17,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },

  // Profile Section
  profileSection: {
    alignItems: 'center' as const,
    paddingHorizontal: 20,
    marginTop: -30,
    marginBottom: 20,
  },
  avatarContainer: {
    alignItems: 'center' as const,
    marginBottom: 20,
  },
  avatarWrapper: {
    position: 'relative' as const,
    marginBottom: 10,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  avatarOverlay: {
    position: 'absolute' as const,
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  changePhotoText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500' as const,
  },
  
  // Quick Actions
  quickActions: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    width: '100%',
    gap: 10,
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  actionCardGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionCardText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },

  // Form Section
  formSection: {
    paddingHorizontal: 20,
    gap: 20,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  
  // Input Styles
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    height: 56,
  },
  disabledInput: {
    backgroundColor: '#f3f4f6',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  disabledText: {
    color: '#9ca3af',
  },

  // Switch Styles
  switchGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  switchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  switchIconContainer: {
    marginRight: 16,
  },
  switchIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchTextContainer: {
    flex: 1,
  },
  switchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  switchSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },

  // Location Styles
  locationSection: {
    marginTop: 20,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  searchButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLocationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  locationIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  currentLocationText: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
    fontWeight: '500',
  },
  mapPlaceholder: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
  },
  mapGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPlaceholderText: {
    fontSize: 16,
    color: '#9ca3af',
    fontWeight: '500',
    marginTop: 8,
  },

  // Danger Zone
  dangerZone: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 16,
  },
  deleteAccountButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  deleteButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  deleteButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#dc2626',
    fontWeight: '600',
  },

  // Save Button
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  saveButtonText: {
    marginLeft: 8,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 25,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalBody: {
    padding: 24,
  },
  modalMessage: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontWeight: '600',
    fontSize: 16,
  },
  confirmDeleteButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  confirmDeleteGradient: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  confirmDeleteText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  okButton: {
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: 120,
  },
  okButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  okButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  errorContainer: {
    padding: 10,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    marginVertical: 8,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 8,
  },
  addressContainer: {
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginTop: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#374151',
  },
});