import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import MapComponent from '../../components/Map';
import { notifyLivreursLivraisonDisponible } from '../../components/notificationsUtils';
import { auth, db } from '../../constants/firebaseConfig';
import { GOOGLE_MAPS_API_KEY } from '../../constants/keys';

interface AddressComponent {
  long_name: string;
  types: string[];
}

function getCustomAddress(components: AddressComponent[], searchedName: string) {
  const place =
    components.find((c) => c.types.includes("premise"))?.long_name ||
    components.find((c) => c.types.includes("point_of_interest"))?.long_name ||
    components.find((c) => c.types.includes("establishment"))?.long_name ||
    components.find((c) => c.types.includes("route"))?.long_name ||
    components.find((c) => c.types.includes("neighborhood"))?.long_name;
  const sublocality = components.find((c) => c.types.includes("sublocality") || c.types.includes("sublocality_level_1"))?.long_name;
  const city =
    components.find((c) => c.types.includes("locality"))?.long_name ||
    components.find((c) => c.types.includes("administrative_area_level_2"))?.long_name;
  const parts = [place, sublocality, city].filter(Boolean);
  let customAddress = parts.join(', ');
  if (searchedName && !customAddress.toLowerCase().includes(searchedName.trim().toLowerCase())) {
    customAddress = `${searchedName.trim()}, ${customAddress}`;
  }
  return customAddress;
}

// ======= Distance =========
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// === Prix livraison 100% logique demandée ===
function calculerPrixLivraisonParBoutique(distanceKm: number, livraisonFree: boolean) {
  if (livraisonFree) return 0;
  if (distanceKm <= 4) return 3;
  let prix = 3 + ((distanceKm - 4) * 0.5);
  return Math.round(prix * 10) / 10;
}

interface MarkerCoordinates {
  latitude: number;
  longitude: number;
  latitudeDelta?: number;
  longitudeDelta?: number;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
    marginBottom: 4,

  },
  placeholder: {
    width: 40,
  },

  // Main Content
  mainContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 20,
  },

  // Section Card
  sectionCard: {
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

  // Choice Buttons
  choicesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  choiceBtn: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  selectedChoice: {
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  choiceGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
  },
  choiceEmoji: {
    fontSize: 24,
  },
  choiceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  selectedText: {
    color: '#ffffff',
  },

  // Location Styles
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  gpsButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  gpsButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  gpsButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },

  // Search Styles
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
    borderRadius: 12,
    overflow: 'hidden',
  },
  searchButtonGradient: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },

  // Map Styles
  mapContainer: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
    marginBottom: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },

  // Address Card
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#22c55e',
    gap: 12,
  },
  addressIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: '#15803d',
    fontWeight: '500',
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
    minHeight: 56,
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },

  // Card Form Styles
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  cardHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },

  // Payment Button Styles
  paymentBtn: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  paymentGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  paymentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
    flex: 1,
  },

  // Boutique Card Styles
  boutiqueCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  boutiqueGradient: {
    padding: 16,
  },
  boutiqueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  boutiqueIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boutiqueName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#dc2626',
  },

  // Empty State
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 16,
  },
  emptyStateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
  },

  // Delivery Total Card
  deliveryTotalCard: {
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  deliveryTotalGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  deliveryTotalText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Total Card
  totalCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  totalGradient: {
    padding: 24,
  },
  totalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  totalTextContainer: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
  },

  // Message Cards
  errorCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  errorGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '500',
  },
  successCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  successGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  successText: {
    flex: 1,
    fontSize: 14,
    color: '#16a34a',
    fontWeight: '500',
  },

  // Floating Confirm Button
  confirmButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  confirmButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  confirmButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 8,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Additional utility styles
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  responsiveText: {
    fontSize: Platform.OS === 'ios' ? 16 : 14,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  fadeInView: {
    opacity: 1,
  },
  slideInView: {
    transform: [{ translateY: 0 }],
  },
});

export default function ConfirmationCommandeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const prixTotal = Number(params.prixTotal) || 0;
  const panier = params.panier ? JSON.parse(params.panier as string) : [];

  const [choix, setChoix] = useState<string | null>(null);
  const [paiement, setPaiement] = useState<string | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [region, setRegion] = useState<MarkerCoordinates | null>(null);
  const [marker, setMarker] = useState<MarkerCoordinates | null>(null);
  const [adresseLisible, setAdresseLisible] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [prixLivraisons, setPrixLivraisons] = useState<{ [boutiqueId: string]: number }>({});
  
  useEffect(() => { fetchUserInfos(); }, []);
  useEffect(() => {
    if (choix === 'sur_place' && (!nom || !prenom || !telephone)) {
      fetchUserInfos();
    }
    if (choix === 'livraison' && region && marker) {
      reverseGeocode(marker.latitude, marker.longitude, searchInput);
    }
    if (choix === 'livraison' && !region && !marker) {
      handleGetCurrentLocation();
    }
  }, [choix]);

  useEffect(() => {
    async function fetchPrixLivraisonParBoutique() {
      if (choix === 'livraison' && marker && panier.length > 0) {
        let prixByBoutique: { [boutiqueId: string]: number } = {};
        let promises = panier.map(async (item: any) => {
          if (!item.ownerId) return;
          const boutiqueRef = doc(db, 'users', item.ownerId);
          const boutiqueSnap = await getDoc(boutiqueRef);
          if (boutiqueSnap.exists() && boutiqueSnap.data().location) {
            const boutique = boutiqueSnap.data();
            const dist = getDistanceFromLatLonInKm(
              marker.latitude,
              marker.longitude,
              boutique.location.latitude,
              boutique.location.longitude
            );
            const livraisonFree = boutique.livraisonFree || false;
            const prix = calculerPrixLivraisonParBoutique(dist, livraisonFree);
            prixByBoutique[item.ownerId] = prix;
          }
        });
        await Promise.all(promises);
        setPrixLivraisons(prixByBoutique);
      }
    }
    fetchPrixLivraisonParBoutique();
  }, [choix, marker, panier]);

  useEffect(() => {
    // debug
    console.log('MARKER:', marker);
    console.log('panier:', panier);
  }, [marker, panier]);

  function getTotalLivraison() {
    const uniqueIds = [...new Set(panier.map((item: any) => item.ownerId))] as string[];
    let sum = 0;
    for (let id of uniqueIds) {
      sum += prixLivraisons[id] || 0;
    }
    return sum;
  }

  // ------- NOUVEAU : Détails par boutique (pour l'affichage et l'enregistrement)
  function getDetailsParBoutique() {
    // On regroupe le panier par ownerId (id du vendeur)
    const boutiqueIds = [...new Set(panier.map((item: any) => item.ownerId))];
    return boutiqueIds.map((id) => {
      const items = panier.filter((item: any) => item.ownerId === id);
      const nom = items[0]?.boutique || "Boutique";
      const prixProduits = items.reduce(
        (acc: number, item: any) => acc + ((item.prixPromotionnel || item.prixNormal || 0) * (item.quantiteAchat || 1)),
        0
      );
      const prixLivraison = prixLivraisons[id as string] || 0;
      return {
        id,
        nom,
        prixProduits,
        prixLivraison,
        prixTotalVendeur: prixProduits + prixLivraison,
      };
    });
  }
  

  async function fetchUserInfos() {
    try {
      const user = auth.currentUser;
      if (user) {
        const ref = doc(db, 'users', user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setNom(data.nom || '');
          setPrenom(data.prenom || '');
          setTelephone(data.phone || '');
        }
      }
    } catch (err) {}
  }

  const handleGetCurrentLocation = async () => {
    setGpsLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission GPS refusée.');
        setGpsLoading(false);
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setMarker({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      reverseGeocode(location.coords.latitude, location.coords.longitude, searchInput);
    } catch (err) {
      setErrorMsg("Impossible d'obtenir la position.");
    }
    setGpsLoading(false);
  };

  const handleLocationSearch = async (searchText: string) => {
    if (!searchText || searchText.trim() === "") return;
    setIsSearching(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchText)}&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
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
        const components = data.results[0].address_components;
        const customAddress = getCustomAddress(components, searchText);
        setAdresseLisible(customAddress || data.results[0].formatted_address);
      } else {
        setErrorMsg('Aucun résultat trouvé pour ce lieu.');
      }
    } catch (error) {
      setErrorMsg('Échec de la recherche de lieu.');
    }
    setIsSearching(false);
  };

  const reverseGeocode = async (latitude: number, longitude: number, searchedName: string) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const components = data.results[0].address_components;
        const customAddress = getCustomAddress(components, searchedName);
        setAdresseLisible(customAddress || data.results[0].formatted_address);
      } else {
        setAdresseLisible('');
      }
    } catch (err) {
      setAdresseLisible('');
    }
  };

  const decrementProductsQuantities = async () => {
    for (let item of panier) {
      if (!item.id || !item.quantiteAchat) continue;
      const prodRef = doc(db, 'produits', item.id);
      const prodSnap = await getDoc(prodRef);
      if (!prodSnap.exists()) continue;
      const prodData = prodSnap.data();
      const newQte = Math.max(0, (prodData.quantite || 0) - (item.quantiteAchat || 1));
      await updateDoc(prodRef, { quantite: newQte });
    }
  };

  const handleConfirmer = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!choix) {
      setErrorMsg('Veuillez choisir un mode de réception.');
      return;
    }
    if (!paiement) {
      setErrorMsg('Veuillez choisir la méthode de paiement.');
      return;
    }
    if (choix === 'livraison') {
      if (!marker || !adresseLisible) {
        setErrorMsg('Veuillez sélectionner votre adresse sur la carte.');
        return;
      }
      if (!nom.trim() || !prenom.trim() || !telephone.trim()) {
        setErrorMsg('Veuillez remplir vos informations.');
        return;
      }
    }
    if (choix === 'sur_place' && (!nom.trim() || !prenom.trim() || !telephone.trim())) {
      setErrorMsg('Veuillez remplir tous les champs pour sur place.');
      return;
    }
    if (paiement === 'd17') {
      if (!cardNumber || !expiry || !cvv) {
        setErrorMsg('Veuillez remplir toutes les informations de la carte.');
        return;
      }
    }

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Utilisateur non connecté.");

      const depassement = panier.find((item: any) => (item.quantiteAchat || 1) > item.quantite);
      if (depassement) {
        setErrorMsg(`Vous avez dépassé la quantité disponible pour ${depassement.nom} (max ${depassement.quantite}).`);
        return;
      }

      if (choix === 'livraison') {
        let horsZone = false;
        for (let item of panier) {
          if (!item.ownerId) continue;
          const boutiqueRef = doc(db, 'users', item.ownerId);
          const boutiqueSnap = await getDoc(boutiqueRef);
          if (boutiqueSnap.exists() && boutiqueSnap.data().localisation && marker) {
            const loc = boutiqueSnap.data().localisation;
            const dist = getDistanceFromLatLonInKm(
              marker.latitude,
              marker.longitude,
              loc.latitude,
              loc.longitude
            );
            if (dist > 10) {
              horsZone = true;
              setErrorMsg(
                `Le produit "${item.nom}" n'est pas disponible pour la livraison (distance boutique > 10km).`
              );
              break;
            }
          }
        }
        if (horsZone) return;
      }

      let prixLivraisonTotal = 0;
      if (choix === "livraison") prixLivraisonTotal = getTotalLivraison();

      const detailsBoutiques = getDetailsParBoutique();

      const docRef = await addDoc(collection(db, 'commandes'), {
        uid: user.uid,
        nom,
        prenom,
        telephone,
        choix,
        paiement,
        commentaire,
        prixTotal: prixTotal, // SANS livraison
        totalAPayer: (choix === 'livraison'
          ? prixTotal + prixLivraisonTotal
          : prixTotal
        ),
        prixLivraisons: choix === 'livraison' ? prixLivraisons : {},
        adresse: choix === 'livraison' ? adresseLisible : '',
        localisation: choix === 'livraison' ? marker : null,
        date: new Date().toISOString(),
        carte: paiement === 'd17' ? { cardNumber, expiry, cvv } : null,
        panier,
        statut: 'en_attente',
        idVendeur: panier[0]?.ownerId || null,
        detailsBoutiques, // <---- ENREGISTRE LES DETAILS !
      });

      if (choix === "livraison") {
        const nouvelleCommande = {
          adresse: adresseLisible,
          panier,
          uid: user.uid,
          idVendeur: panier[0]?.ownerId || null,
          localisation: marker,
        };
        await notifyLivreursLivraisonDisponible(nouvelleCommande);
      }

      await decrementProductsQuantities();
      const panierRef = doc(db, 'panier', user.uid);
      await setDoc(panierRef, { items: [] });
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      let role = "acheteur";
      if (userSnap.exists() && userSnap.data().role) {
        role = userSnap.data().role;
      }
      setSuccessMsg('✅ Commande confirmée avec succès !');
      setTimeout(() => {
        if (role === "vendeur") router.replace("/vendeur/produits");
        else if (role === "livreur") router.replace("/livreur/produits");
        else router.replace("/acheteur/produits");
      }, 2000);
    } catch (err) {
      setErrorMsg((err as Error).message || "Erreur lors de l'enregistrement.");
    }
  };
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Gradient */}
        <LinearGradient
          colors={['#10b981', '#22c55e']}
         
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Confirmation de la commande</Text>
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>
  
        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Reception Mode Selection */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Mode de réception</Text>
            <View style={styles.choicesRow}>
              <TouchableOpacity
                style={[styles.choiceBtn, choix === 'sur_place' && styles.selectedChoice]}
                onPress={() => setChoix('sur_place')}
              >
                <LinearGradient
                  colors={choix === 'sur_place' ? ['#10b981', '#22c55e'] : ['#f8fafc', '#f1f5f9']}
                  style={styles.choiceGradient}
                >
                  <Text style={styles.choiceEmoji}>🏪</Text>
                  <Text style={[styles.choiceText, choix === 'sur_place' && styles.selectedText]}>
                    Sur place
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.choiceBtn, choix === 'livraison' && styles.selectedChoice]}
                onPress={() => setChoix('livraison')}
              >
                <LinearGradient
                  colors={choix === 'livraison' ? ['#10b981', '#22c55e'] : ['#f8fafc', '#f1f5f9']}
                  style={styles.choiceGradient}
                >
                  <Text style={styles.choiceEmoji}>🚚</Text>
                  <Text style={[styles.choiceText, choix === 'livraison' && styles.selectedText]}>
                    Livraison
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
  
          {/* Delivery Location (if livraison selected) */}
          {choix === 'livraison' && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Position de livraison</Text>
              
              {/* Location Header */}
              <View style={styles.locationHeader}>
                <View style={styles.locationTitleContainer}>
                  <LinearGradient
                    colors={['#3b82f6', '#2563eb']}
                    style={styles.locationIcon}
                  >
                    <Ionicons name="location" size={16} color="#ffffff" />
                  </LinearGradient>
                  <Text style={styles.locationTitle}>Ma localisation</Text>
                </View>
                <TouchableOpacity
                  style={styles.gpsButton}
                  onPress={handleGetCurrentLocation}
                  disabled={gpsLoading}
                >
                  <LinearGradient
                    colors={['#f59e0b', '#f97316']}
                    style={styles.gpsButtonGradient}
                  >
                    {gpsLoading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons name="locate" size={16} color="#ffffff" />
                        <Text style={styles.gpsButtonText}>Ma position</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              
              {/* Search Container */}
              <View style={styles.searchWrapper}>
                <Ionicons name="search-outline" size={20} color="#6b7280" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Rechercher un lieu"
                  value={searchInput}
                  onChangeText={setSearchInput}
                  onSubmitEditing={({ nativeEvent }) => {
                    if (!isSearching && nativeEvent.text.trim() !== "") {
                      handleLocationSearch(nativeEvent.text.trim());
                    }
                  }}
                  editable={!isSearching}
                  returnKeyType="search"
                  placeholderTextColor="#9ca3af"
                />
                <TouchableOpacity
                  style={styles.searchButton}
                  onPress={() => {
                    if (!isSearching && searchInput.trim() !== "") {
                      handleLocationSearch(searchInput.trim());
                    }
                  }}
                  disabled={isSearching}
                >
                  <LinearGradient
                    colors={isSearching ? ['#94a3b8', '#cbd5e1'] : ['#10b981', '#22c55e']}
                    style={styles.searchButtonGradient}
                  >
                    <Text style={styles.searchButtonText}>
                      {isSearching ? 'Recherche...' : 'Rechercher'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
  
              {/* Map Container */}
              <View style={styles.mapContainer}>
                {isSearching ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#10b981" />
                    <Text style={styles.loadingText}>Chargement...</Text>
                  </View>
                ) : (
                  <MapComponent
                    initialRegion={region || undefined}
                    marker={marker || undefined}
                    onMarkerChange={(coords) => setMarker(coords)}
                  />
                )}
              </View>
  
              {adresseLisible && (
                <View style={styles.addressCard}>
                  <LinearGradient
                    colors={['#10b981', '#22c55e']}
                    style={styles.addressIcon}
                  >
                    <Ionicons name="location" size={16} color="#ffffff" />
                  </LinearGradient>
                  <Text style={styles.addressText}>{adresseLisible}</Text>
                </View>
              )}
            </View>
          )}
  
          {/* Personal Information */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Informations personnelles</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nom</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Votre nom"
                  value={nom}
                  onChangeText={setNom}
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
                  placeholder="Votre prénom"
                  value={prenom}
                  onChangeText={setPrenom}
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>
  
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Téléphone</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Votre numéro"
                  keyboardType="phone-pad"
                  value={telephone}
                  onChangeText={setTelephone}
                  maxLength={8}
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>
          </View>
  
          {/* Delivery Details (if livraison selected) */}
          {choix === 'livraison' && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Détails par boutique</Text>
              {getDetailsParBoutique().length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <LinearGradient
                    colors={['#f59e0b', '#f97316']}
                    style={styles.emptyStateIcon}
                  >
                    <Ionicons name="location-outline" size={24} color="#ffffff" />
                  </LinearGradient>
                  <Text style={styles.emptyStateText}>
                    Sélectionnez votre position pour voir les prix
                  </Text>
                </View>
              ) : (
                <>
                  {getDetailsParBoutique().map((b) => (
                    <View key={b.id as string} style={styles.boutiqueCard}>
                      <LinearGradient
                        colors={['#f8fafc', '#f1f5f9']}
                        style={styles.boutiqueGradient}
                      >
                        <View style={styles.boutiqueHeader}>
                          <LinearGradient
                            colors={['#3b82f6', '#2563eb']}
                            style={styles.boutiqueIcon}
                          >
                            <Ionicons name="storefront" size={16} color="#ffffff" />
                          </LinearGradient>
                          <Text style={styles.boutiqueName}>{b.nom}</Text>
                        </View>
                        
                        <View style={styles.priceRow}>
                          <Text style={styles.priceLabel}>Produits:</Text>
                          <Text style={styles.priceValue}>{b.prixProduits} DT</Text>
                        </View>
                        <View style={styles.priceRow}>
                          <Text style={styles.priceLabel}>Livraison:</Text>
                          <Text style={styles.priceValue}>{b.prixLivraison} DT</Text>
                        </View>
                        <View style={[styles.priceRow, styles.totalRow]}>
                          <Text style={styles.totalLabel}>Total:</Text>
                          <Text style={styles.totalValue}>{b.prixTotalVendeur} DT</Text>
                        </View>
                      </LinearGradient>
                    </View>
                  ))}
                  
                  <View style={styles.deliveryTotalCard}>
                    <LinearGradient
                      colors={['#10b981', '#22c55e']}
                      style={styles.deliveryTotalGradient}
                    >
                      <Text style={styles.deliveryTotalText}>
                        Prix de livraison total: {getTotalLivraison().toFixed(2)} DT
                      </Text>
                    </LinearGradient>
                  </View>
                </>
              )}
            </View>
          )}
  
          {/* Payment Method */}
          {choix && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Mode de paiement</Text>
              <View style={styles.choicesRow}>
                <TouchableOpacity
                  style={[styles.paymentBtn, paiement === 'cash' && styles.selectedChoice]}
                  onPress={() => setPaiement('cash')}
                >
                  <LinearGradient
                    colors={paiement === 'cash' ? ['#10b981', '#22c55e'] : ['#f8fafc', '#f1f5f9']}
                    style={styles.paymentGradient}
                  >
                    <Ionicons 
                      name="cash-outline" 
                      size={20} 
                      color={paiement === 'cash' ? '#ffffff' : '#6b7280'} 
                    />
                    <Text style={[styles.paymentText, paiement === 'cash' && styles.selectedText]}>
                      Paiement à la livraison
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.paymentBtn, paiement === 'd17' && styles.selectedChoice]}
                  onPress={() => setPaiement('d17')}
                >
                  <LinearGradient
                    colors={paiement === 'd17' ? ['#10b981', '#22c55e'] : ['#f8fafc', '#f1f5f9']}
                    style={styles.paymentGradient}
                  >
                    <Ionicons 
                      name="card-outline" 
                      size={20} 
                      color={paiement === 'd17' ? '#ffffff' : '#6b7280'} 
                    />
                    <Text style={[styles.paymentText, paiement === 'd17' && styles.selectedText]}>
                      Carte bancaire D17
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}
  
          {/* Card Form (if D17 selected) */}
          {paiement === 'd17' && (
            <View style={styles.sectionCard}>
              <View style={styles.cardHeader}>
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  style={styles.cardHeaderIcon}
                >
                  <Ionicons name="card" size={20} color="#ffffff" />
                </LinearGradient>
                <Text style={styles.sectionTitle}>Informations bancaires</Text>
              </View>
  
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Numéro de carte</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="card-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="1234 5678 9012 3456"
                    keyboardType="numeric"
                    value={cardNumber}
                    onChangeText={setCardNumber}
                    maxLength={19}
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>
  
              <View style={styles.cardRow}>
                <View style={[styles.inputGroup, styles.halfInput]}>
                  <Text style={styles.inputLabel}>Expiration</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="calendar-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="MM/AA"
                      value={expiry}
                      onChangeText={setExpiry}
                      maxLength={5}
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                </View>
  
                <View style={[styles.inputGroup, styles.halfInput]}>
                  <Text style={styles.inputLabel}>CVV</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="shield-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="123"
                      keyboardType="numeric"
                      value={cvv}
                      onChangeText={setCvv}
                      maxLength={3}
                      secureTextEntry
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                </View>
              </View>
            </View>
          )}
  
          {/* Comments */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Commentaire (optionnel)</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="chatbubble-outline" size={20} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Notes ou préférences..."
                value={commentaire}
                onChangeText={setCommentaire}
                multiline
                numberOfLines={3}
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>
  
          {/* Total Summary */}
          <View style={styles.totalCard}>
            <LinearGradient
              colors={['#22c55e', '#22c55e']}
              style={styles.totalGradient}
            >
              <View style={styles.totalContent}>
                <Ionicons name="receipt-outline" size={24} color="#ffffff" />
                <View style={styles.totalTextContainer}>
                  <Text style={styles.totalLabel}>Total à payer</Text>
                  <Text style={styles.totalAmount}>
                    {(choix === 'livraison'
                      ? (prixTotal + getTotalLivraison()).toFixed(2)
                      : prixTotal.toFixed(2)
                    )} DT
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>
  
          {/* Error/Success Messages */}
          {!!errorMsg && (
            <View style={styles.errorCard}>
              <LinearGradient
                colors={['#fef2f2', '#fee2e2']}
                style={styles.errorGradient}
              >
                <Ionicons name="alert-circle-outline" size={24} color="#dc2626" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </LinearGradient>
            </View>
          )}
  
          {!!successMsg && (
            <View style={styles.successCard}>
              <LinearGradient
                colors={['#f0fdf4', '#dcfce7']}
                style={styles.successGradient}
              >
                <Ionicons name="checkmark-circle-outline" size={24} color="#16a34a" />
                <Text style={styles.successText}>{successMsg}</Text>
              </LinearGradient>
            </View>
          )}
        </View>
      </ScrollView>
  
      {/* Floating Confirm Button */}
      <View style={styles.confirmButtonContainer}>
        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmer}>
          <LinearGradient
            colors={['#22c55e', '#22c55e']}
            style={styles.confirmButtonGradient}
          >
            <Ionicons name="checkmark-outline" size={20} color="#ffffff" />
            <Text style={styles.confirmButtonText}>Confirmer la commande</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

