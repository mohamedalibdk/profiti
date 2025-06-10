import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Auth, onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import {
  deleteObject,
  getStorage,
  ref as storageRef,
} from 'firebase/storage';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../../constants/firebaseConfig';

interface Product {
  id: string;
  createdAt: any; // Firestore Timestamp
  nom: string;
  description: string;
  prixPromotionnel: number;
  prixNormal: number;
  quantite: number;
  categorie: string;
  horairePickup: string;
  image: string;
  ownerId: string;
}

export default function MesProduitsScreen() {
  const [produits, setProduits] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const storage = getStorage();

  const fetchMesProduits = async (userId: string) => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'produits'),
        where('ownerId', '==', userId)
      );
      const snap = await getDocs(q);
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Product[];
  
      const sorted = data.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
  
      setProduits(sorted);
    } catch (error) {
      console.error('Erreur chargement produits :', error);
      Alert.alert('Erreur', 'Impossible de charger les produits.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth as Auth, (user) => {
      if (user) {
        fetchMesProduits(user.uid);
      } else {
        setProduits([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const deleteProduct = useCallback(async (id: string, imageUrl?: string) => {
    if (isDeleting) return false;
  
    try {
      setIsDeleting(true);
      console.log('--- 📦 DÉBUT DE SUPPRESSION ---');
      console.log('🧾 ID produit:', id);
      console.log('🖼️ Image URL:', imageUrl);
  
      // 🔥 1. Supprimer le document Firestore
      const docRef = doc(db, 'produits', id);
      await deleteDoc(docRef);
      console.log('✅ Document supprimé de Firestore');
  
      // 🧹 2. Supprimer l'image du Storage
      if (imageUrl) {
        try {
          const path = imageUrl.includes('/o/')
            ? decodeURIComponent(imageUrl.split('/o/')[1].split('?')[0])
            : imageUrl;
  
          console.log('🧩 Path extrait:', path);
  
          const imageRef = storageRef(storage, path);
          await deleteObject(imageRef);
          console.log('✅ Image supprimée du Storage');
        } catch (imageError) {
          console.error('❌ Erreur suppression image:', imageError);
        }
      } else {
        console.log('ℹ️ Aucune image à supprimer');
      }
  
      // 🧠 3. Mise à jour de l'état local
      setProduits((prev) => prev.filter((p) => p.id !== id));
      console.log('🧹 Produit supprimé du state local');
  
      return true;
    } catch (error) {
      console.error('🚫 Erreur lors de la suppression complète:', error);
      throw error;
    } finally {
      setIsDeleting(false);
      console.log('--- ✅ FIN DE SUPPRESSION ---');
    }
  }, [isDeleting]);

  const handleDelete = useCallback(async (id: string, imageUrl?: string) => {
    if (isDeleting || deletingId === id) return;
  
    console.log('🗑️ handleDelete appelé pour:', id);
  
    try {
      setDeletingId(id);
      const success = await deleteProduct(id, imageUrl);
      if (success) {
        Alert.alert('Succès', 'Produit supprimé avec succès.');
      }
    } catch (error) {
      console.error('💥 Erreur finale dans handleDelete:', error);
      Alert.alert('Erreur', 'Échec de la suppression du produit.');
    } finally {
      setDeletingId(null);
    }
  }, [deleteProduct, isDeleting, deletingId]);

  const calculateDiscount = (original: number, promo: number) => {
    return Math.round(((original - promo) / original) * 100);
  };
  
  const renderItem = useCallback(({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <LinearGradient
        colors={['#ffffff', '#f8fafc']}
        style={styles.productGradient}
      >
        {/* Image Container */}
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: item.image }} 
            style={styles.productImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)']}
            style={styles.imageOverlay}
          />
          
          {/* Price Tag */}
          <View style={styles.priceTag}>
            <Text style={styles.priceTagText}>{item.prixPromotionnel} TND</Text>
          </View>
        </View>

        {/* Product Content */}
        <View style={styles.productContent}>
          <Text style={styles.productName}>{item.nom}</Text>
          
          {/* Price Container */}
          <View style={styles.priceContainer}>
            <Text style={styles.currentPrice}>{item.prixPromotionnel} TND</Text>
            <Text style={styles.originalPrice}>{item.prixNormal} TND</Text>
            {item.prixNormal > item.prixPromotionnel && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>
                  -{calculateDiscount(item.prixNormal, item.prixPromotionnel)}%
                </Text>
              </View>
            )}
          </View>

          {/* Product Details */}
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
                        <Ionicons name="pricetag-outline" size={16} color="#22c55e " />
                        <Text style={styles.detailText}>Catégorie: {item.categorie}</Text>
                      </View>
                    
                    <View style={styles.detailRow}>
                    <Ionicons name="document-text-outline" size={16} color="#22c55e " />
                    <Text style={styles.detailText}>description:{item.description}</Text>
                    </View>
                    </View>

          {/* Description */}
          

          {/* Actions */}
          <View style={styles.actions}>
            {/* Edit Button */}
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '../edit/[id]',
                  params: { id: item.id },
                })
              }
              style={styles.actionButton}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#3b82f6', '#1d4ed8']}
                style={styles.actionButtonGradient}
              >
                <Text style={styles.editIcon}>✏️</Text>
                <Text style={styles.actionButtonText}>Modifier</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Delete Button */}
            <TouchableOpacity 
              onPress={() => {
                if (!isDeleting && deletingId !== item.id) {
                  console.log('Bouton de suppression cliqué pour:', item.id);
                  handleDelete(item.id, item.image);
                }
              }}
              disabled={isDeleting || deletingId === item.id}
              style={[
                styles.actionButton,
                { opacity: (isDeleting || deletingId === item.id) ? 0.6 : 1 }
              ]}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#ef4444', '#dc2626']}
                style={styles.actionButtonGradient}
              >
                {deletingId === item.id ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Text style={styles.deleteIcon}>🗑️</Text>
                    <Text style={styles.actionButtonText}>Supprimer</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
  ), [deletingId, isDeleting, handleDelete, router]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
                  colors={['#10b981', '#22c55e']}
                  style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>🧺 Mes Produits</Text>
            <Text style={styles.subtitle}>Gérez vos articles en vente</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Add Product Button */}
      <View style={styles.addButtonContainer}>
        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.8}
          onPress={() => router.push('../edit/AddProduitScreen')}
        >
          <LinearGradient
            colors={['#22c55e', '#22c55e']}
            style={styles.addButtonGradient}
          >
            <Text style={styles.addButtonIcon}>➕</Text>
            <Text style={styles.addButtonText}>Ajouter un produit</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Chargement de vos produits...</Text>
        </View>
      ) : (
        <FlatList
          data={produits}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.productsList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyTitle}>Aucun produit</Text>
              <Text style={styles.emptySubtitle}>
                Commencez par ajouter votre premier produit à vendre
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },

  // Add Button styles
  addButtonContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  addButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  addButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    
  },

  // Product Card styles
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

  // Product Content styles
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
  detailIcon: {
    fontSize: 16,
    marginRight: 8,
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

  // Action buttons
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  editIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  deleteIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Loading & Empty styles
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: 60,
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
    lineHeight: 22,
  },
});