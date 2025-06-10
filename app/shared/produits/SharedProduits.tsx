import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, Modal, Platform, Pressable, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { auth, db } from '../../../constants/firebaseConfig';

// ----------------- Fonction Haversine pour la distance -----------------
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c;
  return d;
}

// ----------- FILTRAGE DISPONIBILITÉ PRODUIT PAR DATE/HORAIRE -----------
function isProduitEncoreValable(produit: any) {
  // createdAt : Firestore Timestamp ou JS Date
  if (!produit.createdAt || !produit.horairePickup) return false;
  const createdAt = produit.createdAt.toDate ? produit.createdAt.toDate() : new Date(produit.createdAt);

  // horairePickup : ex "04:00 - 12:00"
  const horaireSplit = produit.horairePickup.split('-');
  if (horaireSplit.length !== 2) return false;
  const heureFin = horaireSplit[1].trim(); // "12:00"
  const [finH, finM] = heureFin.split(':').map(Number);

  const finCreneau = new Date(createdAt);
  finCreneau.setHours(finH, finM, 0, 0);

  // Produit affiché seulement si maintenant < finCreneau
  return new Date() < finCreneau;
}

// -------------------- Gestion des notifications --------------------
async function addNotificationForUser(uid: string, message: string) {
  try {
    const notifRef = doc(collection(db, 'users', uid, 'notifications'));
    await setDoc(notifRef, {
      message,
      createdAt: serverTimestamp(),
      read: false,
    });
    console.log('✅ Notification envoyée à', uid, message);
  } catch (e) {
    console.error('Erreur lors de lajout de la notification :', e);
  }
}

interface NotifyVendeurParams {
  idVendeur: string;
  nom: string;
  panier: { nom: string; quantiteAchat: number }[];
  produitNom: string;
  quantiteAchat: number;
}

async function notifyVendeurAchat({
  idVendeur,
  nom,
  panier,
  produitNom,
  quantiteAchat,
}: NotifyVendeurParams) {
  await addNotificationForUser(
    idVendeur,
    `Nouvelle commande : "${panier[0].nom}" réservée par ${nom}.`
  );
}

async function notifyLivreursLivraisonDisponible(commandes: any) {
  const usersSnap = await getDocs(collection(db, 'users'));
  usersSnap.forEach((userDoc) => {
    const data = userDoc.data();
    if (data.role === 'livreur') {
      addNotificationForUser(
        userDoc.id,
        `Une livraison est disponible pour la commande à ${commandes.adresse}.`
      );
    }
  });
}
async function notifyOnLivraisonAccepted(commandes: any, livreurAccepte: string) {
  await addNotificationForUser(
    commandes.uid,
    `Votre commande est en cours de livraison.`
  );
  await addNotificationForUser(
    livreurAccepte,
    `Vous avez accepté la livraison pour la commande à ${commandes.adresse}.`
  );
}
async function notifyOnCommandeLivree(commandes: any, livreurAccepte: string) {
  await addNotificationForUser(
    commandes.uid,
    `Votre commande a été livrée avec succès.`
  );
  await addNotificationForUser(
    commandes.idVendeur,
    `La commande a été livrée au client à ${commandes.adresse}.`
  );
  await addNotificationForUser(
    livreurAccepte,
    `Vous avez livré la commande avec succès.`
  );
}

// ---------------------------------------------------------

interface Product {
  id: string;
  ownerId: string;
  boutique?: string;
  boutiqueImage?: string;
  boutiqueLatitude?: number | null;
  boutiqueLongitude?: number | null;
  nom: string;
  description: string;
  prixPromotionnel: number;
  prixNormal: number;
  quantite: number;
  categorie: string;
  categorieIcon?: string;
  horairePickup: string;
  image: string;
  createdAt?: any; // <-- tu ajoutes ce champ pour le filtrage !
}

interface Boutique {
  id: string;
  nom: string;
  image?: string;
  role?: string;
  imageUri?: string;
  location?: { latitude: number; longitude: number } | null;
}

interface Categorie {
  nom: string;
  icon: string;
}

interface Notification {
  id: string;
  message: string;
  createdAt: any;
  read: boolean;
}

const CATEGORY_ICONS: { [key: string]: string } = {
  "Légumes": "https://cdn-icons-png.flaticon.com/512/9559/9559480.png",
  "Produits laitiers": "https://cdn-icons-png.flaticon.com/512/12639/12639879.png",
  "Pâtisserie": "https://cdn-icons-png.flaticon.com/512/2484/2484472.png",
  "Boissons": "https://cdn-icons-png.flaticon.com/512/1046/1046784.png",
  "Fruits": "https://cdn-icons-png.flaticon.com/512/1625/1625048.png",
  "Fast Food": "https://cdn-icons-png.flaticon.com/512/1037/1037762.png",
};
// ... les autres fonctions (getDistanceFromLatLonInKm, isProduitEncoreValable, etc.)

function isProduitRetraitOuvert(produit: any) {
  if (!produit.createdAt || !produit.horairePickup) return false;
  const createdAt = produit.createdAt.toDate ? produit.createdAt.toDate() : new Date(produit.createdAt);

  const horaireSplit = produit.horairePickup.split('-');
  if (horaireSplit.length !== 2) return false;
  const heureDebut = horaireSplit[0].trim();
  const heureFin = horaireSplit[1].trim();
  const [debH, debM] = heureDebut.split(':').map(Number);
  const [finH, finM] = heureFin.split(':').map(Number);

  const now = new Date();
  const dateDebut = new Date(createdAt);
  const dateFin = new Date(createdAt);

  dateDebut.setHours(debH, debM, 0, 0);
  dateFin.setHours(finH, finM, 0, 0);

  return now >= dateDebut && now < dateFin;
}

// export default function SharedProduits() { ... }


export default function SharedProduits() {
  const [userName, setUserName] = useState('Utilisateur');
  const [userImage, setUserImage] = useState('');
  const [produits, setProduits] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBoutique, setSelectedBoutique] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [panierIds, setPanierIds] = useState<string[]>([]);

  // Pour filtrer par distance
  const [userCoords, setUserCoords] = useState<{ latitude: number, longitude: number } | null>(null);

  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifModal, setNotifModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Profil utilisateur
  useEffect(() => {
    const fetchUserProfile = async () => {
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          setUserName(data.nom || 'Utilisateur');
          setUserImage(data.imageUri || '');
        }
      }
    };
    fetchUserProfile();
  }, []);

  // Localisation utilisateur
  const [locationText, setLocationText] = useState('Votre localisation');
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationText('Localisation refusée');
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setUserCoords({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.coords.latitude}&lon=${loc.coords.longitude}`
        );
        const data = await res.json();
        const address = data.address || {};
        const suburb =
          address.suburb ||
          address.neighbourhood ||
          address.quarter ||
          address.village ||
          address.county || '';
        const road =
          address.road ||
          address.residential ||
          address.pedestrian ||
          address.footway ||
          '';
        const city =
          address.city || address.town || address.municipality || '';
        const fullLocation = [suburb, road, city].filter(Boolean).join(', ');
        setLocationText(fullLocation || 'Votre localisation');
      } catch {
        setLocationText('Votre localisation');
      }
    })();
  }, []);

  // Chargement de toutes les données principales
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Catégories
        let fetchedCategories: Categorie[] = [];
        try {
          const catSnap = await getDocs(collection(db, 'categories'));
          fetchedCategories = catSnap.docs.map((d) => ({
            nom: d.data().nom,
            icon: d.data().icon || CATEGORY_ICONS[d.data().nom as keyof typeof CATEGORY_ICONS] || 'https://cdn-icons-png.flaticon.com/512/3595/3595455.png',
          }));
        } catch (e) { }

        // Boutiques
        const userSnap = await getDocs(collection(db, 'users'));
        const boutiquesData = userSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Boutique))
          .filter((b) => b.role === 'vendeur')
          .map((b) => ({
            id: b.id,
            nom: b.nom,
            image: b.imageUri || '',
            latitude: b.location?.latitude || null,
            longitude: b.location?.longitude || null,
          }));
        setBoutiques(boutiquesData);
        let filteredBoutiques = boutiquesData;
if (userCoords) {
  filteredBoutiques = boutiquesData.filter(b =>
    b.latitude != null &&
    b.longitude != null &&
    getDistanceFromLatLonInKm(
      userCoords.latitude,
      userCoords.longitude,
      b.latitude!,
      b.longitude!
    ) <= 10
  );
}
setBoutiques(filteredBoutiques);


        // Produits
        const produitsRef = collection(db, 'produits');
        const snap = await getDocs(produitsRef);
        const items: Product[] = [];
        for (const docSnap of snap.docs) {
          const data = docSnap.data();
          const produit: Product = {
            id: docSnap.id,
            ownerId: data.ownerId || '',
            nom: data.nom || '',
            description: data.description || '',
            prixPromotionnel: data.prixPromotionnel || 0,
            prixNormal: data.prixNormal || 0,
            quantite: data.quantite || 0,
            categorie: data.categorie || '',
            categorieIcon: CATEGORY_ICONS[data.categorie as keyof typeof CATEGORY_ICONS] || 'https://cdn-icons-png.flaticon.com/512/3595/3595455.png',
            horairePickup: data.horairePickup || '',
            image: data.image || '',
            boutique: '',
            boutiqueImage: '',
            boutiqueLatitude: null,
            boutiqueLongitude: null,
            createdAt: data.createdAt // <--- AJOUT pour le filtrage
          };
          // Liaison boutique (nom, image, latitude, longitude)
          const userDoc = userSnap.docs.find((u) => u.id === produit.ownerId);
          if (userDoc) {
            const userData = userDoc.data();
            produit.boutique = userData.nom;
            produit.boutiqueImage = userData.imageUri || '';
            produit.boutiqueLatitude = userData.location?.latitude || null;
            produit.boutiqueLongitude = userData.location?.longitude || null;
          }
          items.push(produit);
        }
        setProduits(items);

        // Catégories : fallback si Firestore vide
        let finalCategories: Categorie[] = [];
        if (fetchedCategories.length > 0) {
          finalCategories = fetchedCategories;
        } else {
          finalCategories = Array.from(new Set(items.map(p => p.categorie)))
            .filter(Boolean)
            .map(nom => ({
              nom,
              icon: CATEGORY_ICONS[nom as keyof typeof CATEGORY_ICONS] || 'https://cdn-icons-png.flaticon.com/512/3595/3595455.png',
            }));
        }
        setCategories(finalCategories);

      } catch (error) {
        Alert.alert('Erreur', 'Impossible de charger les données.');
      }
      setLoading(false);
    })();
  }, []);

  // Notifications realtime + suppression auto après 7 jours
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const notifRef = collection(db, 'users', user.uid, 'notifications');
    const unsubscribe = onSnapshot(notifRef, async (snap) => {
      let now = Date.now();
      let sevenDays = 7 * 24 * 60 * 60 * 1000;
      let newNotifs: Notification[] = [];
      let unread = 0;
      for (const docSnap of snap.docs) {
        const notif = { id: docSnap.id, ...docSnap.data() } as Notification;
        let created = notif.createdAt && notif.createdAt.toDate ? notif.createdAt.toDate() : null;
        if (created && (now - created.getTime() > sevenDays)) {
          await deleteDoc(docSnap.ref);
        } else {
          newNotifs.push(notif);
          if (!notif.read) unread++;
        }
      }
      setNotifications(newNotifs.sort((a, b) => {
        const da = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate().getTime() : 0;
        const db = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate().getTime() : 0;
        return db - da;
      }));
      setUnreadCount(unread);
      console.log('🔔 Notifications fetched:', newNotifs);
    });
    return () => unsubscribe();
  }, []);

  const markAllAsRead = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const notifRef = collection(db, 'users', user.uid, 'notifications');
    notifications.forEach(async (notif) => {
      if (!notif.read) {
        await setDoc(doc(notifRef, notif.id), { ...notif, read: true }, { merge: true });
      }
    });
  };

  // Panier (écoute realtime)
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const ref = doc(db, 'panier', user.uid);
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const items = snap.data().items || [];
        setPanierIds(items.map((item: { id: string }) => item.id));
      } else {
        setPanierIds([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // ----- Ajouter au panier + notifications -----
  const ajouterAuPanier = async (item: Product) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté pour réserver.');
      return;
    }
    try {
      const ref = doc(db, 'panier', user.uid);
      const snap = await getDoc(ref);
      let currentItems = snap.exists() ? snap.data().items || [] : [];

      if (currentItems.some((p: Product) => p.id === item.id)) {
        Alert.alert('Info', 'Ce produit est déjà dans votre panier.');
        return;
      }
      const productWithQuantity = {
        ...item,
      };
      const updatedItems = [...currentItems, productWithQuantity];
      await setDoc(ref, { items: updatedItems }, { merge: true });

      await addNotificationForUser(
        user.uid,
        `Votre commande de ${item.nom} a été ajoutée au panier.`
      );

      await notifyVendeurAchat({
        idVendeur: item.ownerId,
        nom: userName,
        panier: [{ nom: item.nom, quantiteAchat: updatedItems.find((p: Product) => p.id === item.id)?.quantiteAchat || 1 }],
        produitNom: item.nom,
        quantiteAchat: updatedItems.find((p: Product) => p.id === item.id)?.quantiteAchat || 1
      });

      Alert.alert('Succès', 'Produit ajouté au panier !');
    } catch (error) {
      Alert.alert("Erreur", "Impossible d'ajouter au panier.");
    }
  };

  // ---------------- FILTRAGE ----------------
  let produitsFiltres = produits;

  // Filtrage par distance <= 10km (doit être le premier)
  if (userCoords) {
    produitsFiltres = produitsFiltres.filter(p =>
      p.boutiqueLatitude != null &&
      p.boutiqueLongitude != null &&
      getDistanceFromLatLonInKm(
        userCoords.latitude,
        userCoords.longitude,
        p.boutiqueLatitude,
        p.boutiqueLongitude
      ) <= 10
    );
  }

  if (selectedCategory) produitsFiltres = produitsFiltres.filter(p => p.categorie === selectedCategory);
  if (selectedBoutique) produitsFiltres = produitsFiltres.filter(p => p.boutique === selectedBoutique);
  if (search.trim().length > 0) {
    const s = search.trim().toLowerCase();
    produitsFiltres = produitsFiltres.filter(
      p =>
        p.nom.toLowerCase().includes(s) ||
        (p.boutique && p.boutique.toLowerCase().includes(s))
    );
  }

  // 👉 FILTRE DISPONIBILITÉ PAR HORAIRE/DATE
  produitsFiltres = produitsFiltres.filter(p => p.quantite > 0);

  produitsFiltres = produitsFiltres.filter(isProduitEncoreValable);

  const defaultCatIcon = 'https://cdn-icons-png.flaticon.com/512/3595/3595455.png';
  const defaultBoutique = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';

  // Render
  return (
   
    <>
      {/* Modal notifications avec design amélioré */}
      <Modal
        visible={notifModal}
        animationType="slide"
        transparent
        onRequestClose={() => setNotifModal(false)}
      >
        <BlurView intensity={20} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <LinearGradient
                colors={['#00e676', '#22c55e']}
                style={styles.modalHeader}
              >
                <Text style={styles.modalTitle}>🔔 Notifications</Text>
              </LinearGradient>
              
              {notifications.length === 0 ? (
                <View style={styles.emptyNotifications}>
                  <Text style={styles.emptyNotificationsIcon}>📱</Text>
                  <Text style={styles.emptyNotificationsText}>Aucune notification</Text>
                </View>
              ) : (
                <ScrollView style={styles.notificationsList}>
                  {notifications.map((n) => (
                    <View key={n.id} style={[
                      styles.notificationItem,
                      { backgroundColor: n.read ? '#ffffff' : '#f0f4ff' }
                    ]}>
                      <View style={styles.notificationDot(n.read)} />
                      <View style={styles.notificationContent}>
                        <Text style={[styles.notificationText, { fontWeight: n.read ? '400' : '600' }]}>
                          {n.message}
                        </Text>
                        <Text style={styles.notificationTime}>
                          {n.createdAt && n.createdAt.toDate
                            ? n.createdAt.toDate().toLocaleString('fr-FR')
                            : '...'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}
              
              <TouchableOpacity onPress={() => setNotifModal(false)} style={styles.modalCloseButton}>
                <LinearGradient colors={['#00e676', '#22c55e']} style={styles.closeButtonGradient}>
                  <Text style={styles.closeButtonText}>Fermer</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header avec gradient */}
        <LinearGradient
          colors={['#10b981', '#22c55e']}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.hello}>Bonjour, {userName} ✨</Text>
              <Text style={styles.location}>📍 {locationText}</Text>
            </View>
            <View style={styles.headerActions}>
              {/* Notification avec badge amélioré */}
              <TouchableOpacity 
                onPress={() => { setNotifModal(true); markAllAsRead(); }}
                style={styles.notificationButton}
              >
                <View style={styles.notificationIconContainer}>
                  <Ionicons name="notifications" size={24} color="#ffffff" />
                  {unreadCount > 0 && (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              
              {userImage && (
                <View style={styles.avatarContainer}>
                  <Image source={{ uri: userImage }} style={styles.avatar} />
                  <View style={styles.avatarOnlineIndicator} />
                </View>
              )}
            </View>
          </View>
        </LinearGradient>

        {/* Barre de recherche améliorée */}
        <View style={styles.searchContainer}>
          <View style={styles.searchWrapper}>
            <Ionicons name="search" size={20} color="#00e676" style={styles.searchIcon} />
            <TextInput
              placeholder="Rechercher produits, boutiques..."
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholderTextColor="#9ca3af"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Catégories avec design moderne */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏷️ Catégories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            <Pressable
              onPress={() => { setSelectedCategory(null); setSelectedBoutique(null); }}
              style={styles.categoryContainer}
            >
              <LinearGradient
                colors={!selectedCategory ? ['#00e676', '#00bfae'] : ['#f8fafc', '#f1f5f9']}
                style={[styles.categoryCircle, styles.categoryElevation]}
              >
                <Image source={{ uri: defaultCatIcon }} style={styles.categoryIcon} />
              </LinearGradient>
              <Text style={[styles.categoryLabel, !selectedCategory && styles.categorySelectedLabel]}>
                Toutes
              </Text>
            </Pressable>
            
            {categories.map((cat) => (
              <Pressable
                key={cat.nom}
                onPress={() => { setSelectedCategory(cat.nom); setSelectedBoutique(null); }}
                style={styles.categoryContainer}
              >
                <LinearGradient
                  colors={selectedCategory === cat.nom ? ['#00e676', '#00bfae'] : ['#f8fafc', '#f1f5f9']}
                  style={[styles.categoryCircle, styles.categoryElevation]}
                >
                  <Image source={{ uri: cat.icon || defaultCatIcon }} style={styles.categoryIcon} />
                </LinearGradient>
                <Text style={[
                  styles.categoryLabel,
                  selectedCategory === cat.nom && styles.categorySelectedLabel
                ]}>
                  {cat.nom}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Boutiques avec design moderne */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏪 Boutiques</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            <Pressable
              onPress={() => setSelectedBoutique(null)}
              style={styles.shopContainer}
            >
              <LinearGradient
                colors={!selectedBoutique ? ['#f59e0b', '#f97316'] : ['#fef7ed', '#fed7aa']}
                style={[styles.shopCircle, styles.shopElevation]}
              >
                <Image source={{ uri: defaultBoutique }} style={styles.shopIcon} />
              </LinearGradient>
              <Text style={[styles.shopLabel, !selectedBoutique && styles.shopSelectedLabel]}>
                Toutes
              </Text>
            </Pressable>
            
            {boutiques.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => setSelectedBoutique(b.nom)}
                style={styles.shopContainer}
              >
                <LinearGradient
                  colors={selectedBoutique === b.nom ? ['#f59e0b', '#f97316'] : ['#fef7ed', '#fed7aa']}
                  style={[styles.shopCircle, styles.shopElevation]}
                >
                  <Image source={{ uri: b.image || defaultBoutique }} style={styles.shopIcon} />
                </LinearGradient>
                <Text style={[
                  styles.shopLabel,
                  selectedBoutique === b.nom && styles.shopSelectedLabel
                ]}>
                  {b.nom}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Statistiques produits */}
        <View style={styles.statsContainer}>
          <LinearGradient colors={['#10b981', '#059669']} style={styles.statsGradient}>
            <Text style={styles.statsText}>
              🎯 {produitsFiltres.length} produits disponibles
            </Text>
          </LinearGradient>
        </View>

        {/* Liste des produits avec design moderne */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00e676" />
            <Text style={styles.loadingText}>Chargement des produits...</Text>
          </View>
        ) : produitsFiltres.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>Aucun produit trouvé</Text>
            <Text style={styles.emptySubtitle}>Essayez de modifier vos filtres</Text>
          </View>
        ) : (
          <FlatList
            data={produitsFiltres}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.productCard}>
                <LinearGradient
                  colors={['#ffffff', '#f8fafc']}
                  style={styles.productGradient}
                >
                  {/* Image avec overlay */}
                  <View style={styles.imageContainer}>
                    <Image source={{ uri: item.image }} style={styles.productImage} />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.3)']}
                      style={styles.imageOverlay}
                    />
                    <View style={styles.priceTag}>
                      <Text style={styles.priceTagText}>{item.prixPromotionnel} TND</Text>
                    </View>
                  </View>

                  <View style={styles.productContent}>
                    <Text style={styles.productName}>{item.nom}</Text>
                    
                    <View style={styles.priceContainer}>
                      <Text style={styles.currentPrice}>💰 {item.prixPromotionnel} TND</Text>
                      <Text style={styles.originalPrice}>{item.prixNormal} TND</Text>
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>
                          -{Math.round(((item.prixNormal - item.prixPromotionnel) / item.prixNormal) * 100)}%
                        </Text>
                      </View>
                    </View>

                    <View style={styles.productDetails}>
                      <View style={styles.detailRow}>
                        <Ionicons name="cube-outline" size={16} color="#22c55e " />
                        <Text style={styles.detailText}>Quantité: {item.quantite}</Text>
                      </View>
                      
                      <View style={styles.detailRow}>
                        <Ionicons name="time-outline" size={16} color="#f59e0b" />
                        <Text style={styles.detailText}>Retrait: {item.horairePickup}</Text>
                      </View>
                      
                      <View style={styles.detailRow}>
                        <Ionicons name="storefront-outline" size={16} color="#10b981" />
                        <Text style={styles.detailText}>Boutique: {item.boutique}</Text>
                      </View>
                      
                      <View style={styles.detailRow}>
                        <Ionicons name="pricetag-outline" size={16} color="#22c55e " />
                        <Text style={styles.detailText}>Catégorie: {item.categorie}</Text>
                      </View>
                    
                    <View style={styles.detailRow}>
                    <Ionicons name="document-text-outline" size={16} color="#22c55e " />
                    <Text style={styles.detailText}>description:{item.description}</Text>
                    </View>
                    </View>

                    {/* Bouton d'action amélioré */}
                    {(() => {
                      const debutHoraire = item.horairePickup?.split('-')[0]?.trim();
                      if (!isProduitRetraitOuvert(item)) {
                        return (
                    <View style={styles.detailRow}>
                            <Ionicons name="time" size={20} color="#f59e0b" />
                            <Text style={styles.closedText}>
                              Ouverte à {debutHoraire || '--:--'}
                            </Text>
                          </View>
                        );
                      } else {
                        return (
                          <TouchableOpacity
                            onPress={() => ajouterAuPanier(item)}
                            disabled={panierIds.includes(item.id)}
                            style={styles.actionButton}
                          >
                            <LinearGradient
                              colors={panierIds.includes(item.id) 
                                ? ['#9ca3af', '#6b7280'] 
                                : ['#f59e0b', '#f97316']
                              }
                              style={styles.actionButtonGradient}
                            >
                              <Ionicons 
                                name={panierIds.includes(item.id) ? "checkmark-circle" : "bag-add"} 
                                size={20} 
                                color="#ffffff" 
                              />
                              <Text style={styles.actionButtonText}>
                                {panierIds.includes(item.id) ? 'Déjà réservé' : 'Réserver maintenant'}
                              </Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        );
                      }
                    })()}
                  </View>
                </LinearGradient>
              </View>
            )}
            contentContainerStyle={styles.productsList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </ScrollView>
    </>
  );
}

const CIRCLE_SIZE = 72;
const ICON_SIZE = 40;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    width: '100%',
    maxWidth: 380,
    maxHeight: '80%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 25,
  },
  modalHeader: {
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  emptyNotifications: {
    alignItems: 'center',
    padding: 40,
  },
  emptyNotificationsIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyNotificationsText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  notificationsList: {
    maxHeight: 400,
    padding: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  notificationDot: (read) => ({
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: read ? '#d1d5db' : '#22c55e',
    marginRight: 12,
    marginTop: 6,
  }),
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  modalCloseButton: {
    padding: 20,
  },
  closeButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },

  // Header styles
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hello: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginBottom: 4,
  
  },
  location: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationButton: {
    marginRight: 16,
  },
  notificationIconContainer: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    right: -6,
    top: -6,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  avatarOnlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#ffffff',
  },

  // Search styles
  searchContainer: {
    paddingHorizontal: 20,
    marginTop: -15,
    marginBottom: 20,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
  clearButton: {
    padding: 4,
  },

  // Section styles
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f2937',
    marginHorizontal: 20,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  horizontalScroll: {
    paddingHorizontal: 20,
  },

  // Category styles
  categoryContainer: {
    alignItems: 'center',
    marginRight: 20,
    width: CIRCLE_SIZE + 16,
  },
  categoryCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryElevation: {
    shadowColor: '#00e676',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  categoryIcon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    resizeMode: 'cover',
  },
  categoryLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
    textAlign: 'center',
  },
  categorySelectedLabel: {
    color: '#00e676',
    fontWeight: '800',
    fontSize: 14,
  },

  // Shop styles
  shopContainer: {
    alignItems: 'center',
    marginRight: 20,
    width: CIRCLE_SIZE + 16,
  },
  shopCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  shopElevation: {
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  shopIcon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    resizeMode: 'cover',
  },
  shopLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
    textAlign: 'center',
  },
  shopSelectedLabel: {
    color: '#f59e0b',
    fontWeight: '800',
    fontSize: 14,
  },

  // Stats styles
  statsContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  statsGradient: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  statsText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Loading & Empty styles
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },

  // Product styles
  productsList: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  productCard: {
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  productGradient: {
    padding: 0,
  },
  imageContainer: {
    position: 'relative',
    height: 200,
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  priceTag: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  priceTagText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  productContent: {
    padding: 20,
  },
  productName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  currentPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
    marginRight: 12,
  },
  originalPrice: {
    fontSize: 16,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  discountBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  productDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  closedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  closedText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#92400e',
    fontWeight: '600',
  },
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  actionButtonText: {
    marginLeft: 8,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});