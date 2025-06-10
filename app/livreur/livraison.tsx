import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useRouter } from "expo-router";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import MapComponent from '../../components/Map';
import { notifyOnCommandeLivree, notifyOnLivraisonAccepted } from '../../components/notificationsUtils';
import { auth, db } from '../../constants/firebaseConfig';

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function groupProduitsParBoutique(panier: any[]) {
  const groups: { [ownerId: string]: any[] } = {};
  panier.forEach(p => {
    if (!groups[p.ownerId]) groups[p.ownerId] = [];
    groups[p.ownerId].push(p);
  });
  return groups;
}

function getLivraisonsProches(commandes: any[], livreurCoords: any) {
  let livraisons: any[] = [];
  commandes.forEach(cmd => {
    if (!cmd.panier || !Array.isArray(cmd.panier)) return;
    const produitsGroupes = groupProduitsParBoutique(cmd.panier);
    Object.entries(produitsGroupes).forEach(([ownerId, produits]) => {
      const first = produits[0];
      if (
        typeof first.boutiqueLatitude === 'number' &&
        typeof first.boutiqueLongitude === 'number' &&
        livreurCoords
      ) {
        const distance = getDistanceKm(
          livreurCoords.latitude,
          livreurCoords.longitude,
          first.boutiqueLatitude,
          first.boutiqueLongitude
        );
        if (distance <= 3) {
          livraisons.push({
            boutiqueId: ownerId,
            boutiqueNom: first.boutique,
            boutiqueLatitude: first.boutiqueLatitude,
            boutiqueLongitude: first.boutiqueLongitude,
            produits,
            distance,
            commandeId: cmd.id,
            acheteur: cmd.nom,
            adresse: cmd.adresse,
            telephone: cmd.telephone,
            fullCommande: cmd,
          });
        }
      }
    });
  });
  return livraisons;
}

export default function LivraisonScreen() {
  const router = useRouter();
  const [showMap, setShowMap] = useState(false);
  const [commandes, setCommandes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLivraison, setSelectedLivraison] = useState<any | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [livreurCoords, setLivreurCoords] = useState<any | null>(null);
  const [acheteurCoords, setAcheteurCoords] = useState<any | null>(null);
  const [waypoints, setWaypoints] = useState<any[] | undefined>(undefined);
  const [directionsData, setDirectionsData] = useState<any>(null);

  useEffect(() => {
    fetchCommandes();
    fetchLivreurLocation();
  }, []);

  const fetchLivreurLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      let location = await Location.getCurrentPositionAsync({});
      setLivreurCoords({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    }
  };

  const fetchCommandes = async () => {
    setLoading(true);
    try {
      const livreurId = auth.currentUser?.uid;
      if (!livreurId) {
        Alert.alert('Erreur', 'Aucun livreur connecté.');
        setCommandes([]);
        setLoading(false);
        return;
      }
      const q = query(
        collection(db, 'commandes'),
        where('statut', '==', 'en_attente'),
        where('choix', '==', 'livraison')
      );
      const querySnapshot = await getDocs(q);
      const commandesList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const commandesFiltrees = commandesList.filter((cmd: any) => {
        if (cmd.livreurAccepte) {
          return cmd.livreurAccepte === livreurId;
        }
        return !cmd.livreursRefuses || !cmd.livreursRefuses.includes(livreurId);
      });
      setCommandes(commandesFiltrees);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les commandes');
    } finally {
      setLoading(false);
    }
  };

  const handleAccepterLivraison = async (livraison: any) => {
    const livreurId = auth.currentUser?.uid;
    if (!livreurId) {
      Alert.alert("Erreur", "Aucun livreur connecté.");
      return;
    }
    try {
      await updateDoc(doc(db, 'commandes', livraison.commandeId), {
        livreurAccepte: livreurId
      });
      await notifyOnLivraisonAccepted(livraison.fullCommande, livreurId);

      fetchCommandes();
      setSelectedLivraison(livraison);

      setAcheteurCoords(undefined);
      setWaypoints(undefined);
      setDirectionsData(null);

      setTimeout(() => {
        setWaypoints([
          livreurCoords,
          { latitude: livraison.boutiqueLatitude, longitude: livraison.boutiqueLongitude },
          livraison.fullCommande.localisation
        ]);
      }, 500);

      setAcheteurCoords(livraison.fullCommande.localisation);

      setShowMap(true);
    } catch (e) {
      Alert.alert("Erreur", "Impossible d'accepter la livraison.");
    }
  };

  const handleRefuserLivraison = async (livraison: any) => {
    const livreurId = auth.currentUser?.uid;
    if (!livreurId) {
      Alert.alert("Erreur", "Aucun livreur connecté.");
      return;
    }
    try {
      await updateDoc(doc(db, 'commandes', livraison.commandeId), {
        livreursRefuses: arrayUnion(livreurId)
      });
      setCommandes(prev => prev.filter(cmd => cmd.id !== livraison.commandeId));
    } catch (e) {
      Alert.alert("Erreur Firestore", String(e));
    }
  };

  const handleConfirmDelivery = async () => {
    if (!selectedLivraison) {
      Alert.alert("Erreur", "Aucune livraison sélectionnée !");
      return;
    }
    setLoading(true);
    try {
      const commandeRef = doc(db, 'commandes', selectedLivraison.commandeId);
      const commandeSnap = await getDoc(commandeRef);
      if (!commandeSnap.exists()) {
        Alert.alert("Erreur", "Commande introuvable !");
        setLoading(false);
        return;
      }
      const commande = commandeSnap.data();

      const nouveauPanier = (commande.panier || []).filter(
        (p: any) => p.ownerId !== selectedLivraison.boutiqueId
      );

      if (nouveauPanier.length > 0) {
        await updateDoc(commandeRef, {
          panier: nouveauPanier
        });
      } else {
        await updateDoc(commandeRef, {
          statut: 'livree',
          dateLivraison: new Date().toISOString(),
        });
      }

      await notifyOnCommandeLivree(selectedLivraison.fullCommande, auth.currentUser?.uid || '');
      await addDoc(collection(db, 'notifications'), {
        ...selectedLivraison.fullCommande,
        dateNotification: new Date().toISOString(),
        type: "livraison_confirmee",
      });

      setShowConfirmModal(false);
      setShowMap(false);
      fetchCommandes();
      setSelectedLivraison(null);
    } catch (e) {
      Alert.alert("Erreur", "Impossible de confirmer la livraison");
    }
    setLoading(false);
  };

  const livraisons = getLivraisonsProches(commandes, livreurCoords);

  if (loading && !showConfirmModal) {
    return (
      <View style={styles.screenBackground}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (!showMap) {
    return (
      <ScrollView style={styles.screenBackground}>
        {livraisons.length === 0 ? (
          <View style={styles.modernCard}>
            <LinearGradient
              colors={['#f59e0b', '#f97316']}
              style={styles.emptyStateIcon}
            >
              <Ionicons name="car-outline" size={32} color="#ffffff" />
            </LinearGradient>
            <Text style={styles.emptyStateTitle}>Aucune livraison disponible</Text>
            <Text style={styles.emptyStateSubtitle}>Aucune livraison dans votre position</Text>
          </View>
        ) : (
          livraisons.map((liv, idx) => (
            <View key={liv.commandeId + '-' + liv.boutiqueId} style={styles.modernCard}>
              <View style={styles.cardHeader}>
                <LinearGradient
                  colors={['#10b981', '#22c55e']}
                  style={styles.storeIcon}
                >
                  <Ionicons name="storefront-outline" size={20} color="#ffffff" />
                </LinearGradient>
                <View style={styles.headerInfo}>
                  <Text style={styles.storeName}>{liv.boutiqueNom}</Text>
                  <Text style={styles.distance}>{liv.distance.toFixed(2)} km</Text>
                </View>
              </View>

              <View style={styles.infoSection}>
                <View style={styles.infoRow}>
                  <View style={styles.infoIconContainer}>
                    <Ionicons name="location-outline" size={16} color="#6b7280" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Adresse acheteur</Text>
                    <Text style={styles.infoValue}>{liv.adresse}</Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoIconContainer}>
                    <Ionicons name="call-outline" size={16} color="#6b7280" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Téléphone</Text>
                    <Text style={styles.infoValue}>{liv.telephone}</Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoIconContainer}>
                    <Ionicons name="car-outline" size={16} color="#6b7280" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Prix Livraison</Text>
                    <Text style={styles.infoValue}>
                      {(() => {
                        const detailB = liv.fullCommande.detailsBoutiques?.find(
                          (b: any) => b.id === liv.boutiqueId
                        );
                        return detailB ? `${detailB.prixLivraison} TND` : '...';
                      })()}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoIconContainer}>
                    <Ionicons name="bag-outline" size={16} color="#6b7280" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Produits</Text>
                    <Text style={styles.infoValue}>
                      {liv.produits
                        .map(
                          (p: any) =>
                            `${p.nom} (x${p.quantiteAchat || p.quantite}) X ${p.prixPromotionnel} TND`
                        )
                        .join(', ')}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoIconContainer}>
                    <Ionicons name="card-outline" size={16} color="#6b7280" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Prix Produits</Text>
                    <Text style={styles.infoValue}>
                      {(() => {
                        const detailB = liv.fullCommande.detailsBoutiques?.find(
                          (b: any) => b.id === liv.boutiqueId
                        );
                        return detailB ? `${detailB.prixProduits} TND` : '...';
                      })()}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => handleAccepterLivraison(liv)}
                >
                  <LinearGradient
                    colors={['#10b981', '#22c55e']}
                    style={styles.buttonGradient}
                  >
                    <Ionicons name="checkmark-outline" size={20} color="#ffffff" />
                    <Text style={styles.buttonText}>Accepter</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.refuseButton}
                  onPress={() => handleRefuserLivraison(liv)}
                >
                  <LinearGradient
                    colors={['#dc2626', '#b91c1c']}
                    style={styles.buttonGradient}
                  >
                    <Ionicons name="close-outline" size={20} color="#ffffff" />
                    <Text style={styles.buttonText}>Refuser</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    );
  }

  return (
    <View style={styles.screenBackground}>
      <View style={styles.modernCard}>
        <View style={styles.mapHeader}>
          <LinearGradient
            colors={['#3b82f6', '#2563eb']}
            style={styles.mapHeaderIcon}
          >
            <Ionicons name="navigate-outline" size={24} color="#ffffff" />
          </LinearGradient>
          <Text style={styles.mapTitle}>Navigation vers la destination</Text>
        </View>

        <View style={styles.mapContainer}>
          <MapComponent
            livreurLocation={livreurCoords || undefined}
            boutiquesLocations={
              selectedLivraison
                ? [{
                  latitude: selectedLivraison.boutiqueLatitude,
                  longitude: selectedLivraison.boutiqueLongitude,
                  label: selectedLivraison.boutiqueNom
                }]
                : []
            }
            livraisonLocation={acheteurCoords || undefined}
            waypoints={waypoints}
            showRoute={true}
            onDirectionsData={setDirectionsData}
          />
          {directionsData?.routes?.[0]?.legs?.[0]?.steps?.[0]?.instructions && (
            <View style={styles.directionBox}>
              <LinearGradient
                colors={['#10b981', '#22c55e']}
                style={styles.directionGradient}
              >
                <Text style={styles.directionText}>
                  {directionsData.routes[0].legs[0].steps[0].instructions.replace(/<[^>]*>?/gm, '')}
                </Text>
              </LinearGradient>
            </View>
          )}
          {directionsData?.routes?.[0] && (
            <View style={styles.infoBox}>
              <View style={styles.routeInfo}>
                <Ionicons name="time-outline" size={16} color="#6b7280" />
                <Text style={styles.infoLabel}>
                  {Math.round(
                    directionsData.routes[0].legs.reduce((a: number, l: any) => a + l.duration.value, 0) / 60
                  )} min
                </Text>
              </View>
              <View style={styles.routeInfo}>
                <Ionicons name="location-outline" size={16} color="#6b7280" />
                <Text style={styles.infoLabel}>
                  {Math.round(
                    directionsData.routes[0].legs.reduce((a: number, l: any) => a + l.distance.value, 0) / 1000
                  )} km
                </Text>
              </View>
            </View>
          )}
        </View>

        {showMap && selectedLivraison && (
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={() => setShowConfirmModal(true)}
            disabled={loading}
          >
            <LinearGradient
              colors={['#10b981', '#22c55e']}
              style={styles.confirmButtonGradient}
            >
              <Ionicons 
                name="checkmark-circle-outline" 
                size={24} 
                color="#ffffff" 
                style={{ marginRight: 8 }}
              />
              <Text style={styles.confirmButtonText}>
                Confirmer la livraison
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      {/* Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showConfirmModal}
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#10b981', '#22c55e']}
              style={styles.modalHeader}
            >
              <Ionicons name="checkmark-circle-outline" size={28} color="#ffffff" />
              <Text style={styles.modalTitle}>Confirmer la livraison</Text>
            </LinearGradient>
            
            <View style={styles.modalBody}>
              <Text style={styles.modalMessage}>
                Êtes-vous sûr de vouloir confirmer cette livraison ? Cette action est irréversible.
              </Text>
              
              <View style={styles.modalButtons}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => setShowConfirmModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </Pressable>
                <Pressable
                  style={styles.confirmModalButton}
                  onPress={handleConfirmDelivery}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#10b981', '#22c55e']}
                    style={styles.confirmModalGradient}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-outline" size={16} color="#ffffff" />
                        <Text style={styles.confirmModalText}>Confirmer</Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenBackground: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  modernCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  
  // Empty State
  emptyStateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },

  // Card Header
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  storeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  distance: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },

  // Info Section
  infoSection: {
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    lineHeight: 22,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  refuseButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Map Section
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  mapHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  mapContainer: {
    width: '100%',
    height: 320,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    position: 'relative',
    marginBottom: 24,
  },
  directionBox: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  directionGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  directionText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  infoBox: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  // Confirm Button
  confirmButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  confirmButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 18,
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
    paddingVertical: 24,
    paddingHorizontal: 24,
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
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
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontWeight: '600',
    fontSize: 16,
  },
  confirmModalButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  confirmModalGradient: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmModalText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
});