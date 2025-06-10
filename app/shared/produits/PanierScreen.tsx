import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../../../constants/firebaseConfig';

export default function PanierScreen() {
  const [panier, setPanier] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [quantitesEdit, setQuantitesEdit] = useState<{ [key: number]: string }>({});
  const [alerted, setAlerted] = useState<{ [key: number]: boolean }>({});
  const router = useRouter();

  // ==========================
  // === Prix livraison =======
  // ==========================
  function calculerPrixLivraison(nombreBoutiques: number) {
    if (nombreBoutiques <= 1) return 5;
    return 5 + (nombreBoutiques - 1) * 2;
  }
  const boutiqueIds = [...new Set(panier.map(item => item.ownerId))];
  const prixLivraison = calculerPrixLivraison(boutiqueIds.length);

  // Écoute temps réel du panier
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const ref = doc(db, 'panier', user.uid);
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const items = data.items || [];
        setPanier(items);
        setTotal(
          items.reduce(
            (sum: number, item: any) =>
              sum + (item.prixPromotionnel || item.prix || 0) * (item.quantiteAchat || 1),
            0
          )
        );
        setQuantitesEdit({});
        setAlerted({});
      } else {
        setPanier([]);
        setTotal(0);
        setQuantitesEdit({});
        setAlerted({});
      }
    });

    return () => unsubscribe();
  }, []);

  // Saisie quantité
  const handleEditQuantite = (index: number, value: string) => {
    let onlyNumber = value.replace(/[^0-9]/g, '');
    // Permet la saisie vide
    if (onlyNumber === '') {
      setQuantitesEdit(prev => ({ ...prev, [index]: '' }));
      setAlerted(prev => ({ ...prev, [index]: false }));
      return;
    }
    let quantite = parseInt(onlyNumber) || 1;
    const max = panier[index]?.quantite || 1;
    // Blocage et alerte si dépassement
    if (quantite > max) {
      quantite = max;
      // Une seule alerte par saisie
      setAlerted(prev => {
        if (!prev[index]) {
          Alert.alert('تنبيه', `أقصى عدد متوفر: ${max}`);
        }
        return { ...prev, [index]: true };
      });
    } else {
      setAlerted(prev => ({ ...prev, [index]: false }));
    }
    setQuantitesEdit(prev => ({ ...prev, [index]: String(quantite) }));
  };

  // Validation à la sortie
  const handleEndEditQuantite = async (index: number) => {
    const user = auth.currentUser;
    if (!user) return;

    let value = quantitesEdit[index];
    let quantite = parseInt(value) || 1;
    const item = panier[index];
    const max = item.quantite;
    if (quantite > max) quantite = max;
    if (quantite < 1) quantite = 1;

    setQuantitesEdit(prev => {
      const edit = { ...prev };
      delete edit[index];
      return edit;
    });

    // Mise à jour local
    const updated = [...panier];
    updated[index].quantiteAchat = quantite;
    setPanier(updated);

    // Firestore
    const ref = doc(db, 'panier', user.uid);
    await setDoc(ref, { items: updated }, { merge: true });
  };

  // Supprimer produit du panier
  const handleRemove = async (index: number) => {
    const user = auth.currentUser;
    if (!user) return;
    const updated = [...panier];
    updated.splice(index, 1);
    const ref = doc(db, 'panier', user.uid);
    await setDoc(ref, { items: updated }, { merge: true });
  };

  // Enregistrer la commande et rediriger
  const handleConfirmerCommande = async () => {
    const user = auth.currentUser;
    if (!user) return;

    // Vérification sécurité
    const depassement = panier.find(item => (item.quantiteAchat || 1) > item.quantite);
    if (depassement) {
      Alert.alert(
        'Erreur',
        `Vous avez dépassé la quantité disponible pour ${depassement.nom} (max ${depassement.quantite}).`
      );
      return;
    }

    // Navigate to confirmation page with cart data
    router.push({ 
      pathname: '/commande/confirmation', 
      params: { 
        prixTotal: total,
        panier: JSON.stringify(panier)
      } 
    });
  };

  const calculateDiscount = (original: number, promo: number) => {
    return Math.round(((original - promo) / original) * 100);
  };

  const renderCartItem = ({ item, index }: { item: any, index: number }) => (
    <View style={styles.cartItem}>
      <LinearGradient
        colors={['#ffffff', '#f8fafc']}
        style={styles.cartItemGradient}
      >
        {/* Image Container */}
        <View style={styles.itemImageContainer}>
          <Image source={{ uri: item.image }} style={styles.itemImage} />
        </View>

        {/* Content */}
        <View style={styles.itemContent}>
          <Text style={styles.itemName}>{item.nom}</Text>
          
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

          {/* Description */}

          {/* Details */}
          <View style={styles.productDetails}>
                     
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
          {/* Quantity Controls */}
          <View style={styles.quantityContainer}>
            
          <View style={styles.detailRow}>
          <Ionicons name="cube-outline" size={16} color="#22c55e " />
          <Text style={styles.detailText}>Quantité: </Text>            
          </View>
            <View style={styles.quantityInputContainer}>
              <TextInput
                style={styles.quantityInput}
                value={
                  quantitesEdit[index] !== undefined
                    ? quantitesEdit[index]
                    : String(item.quantiteAchat || 1)
                }
                keyboardType="numeric"
                onChangeText={value => handleEditQuantite(index, value)}
                onEndEditing={() => handleEndEditQuantite(index)}
                onBlur={() => handleEndEditQuantite(index)}
                maxLength={String(item.quantite).length}
              />
              <Text style={styles.maxQuantity}>/ {item.quantite}</Text>
            </View>
          </View>
        </View>

        {/* Remove Button */}
        <TouchableOpacity 
          style={styles.removeButton} 
          onPress={() => handleRemove(index)}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#ef4444', '#dc2626']}
            style={styles.removeButtonGradient}
          >
            <Text style={styles.removeIcon}>🗑️</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
      colors={['#10b981', '#22c55e']}   
           style={styles.headerGradient}
      >
        <View style={styles.header}>
        <View>
          <Text style={styles.title}>🛒 Mon Panier</Text>
          <Text style={styles.subtitle}>
            {panier.length} article{panier.length > 1 ? 's' : ''}
          </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Cart Items */}
      <FlatList
        data={panier}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderCartItem}
        contentContainerStyle={styles.cartList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🛒</Text>
            <Text style={styles.emptyTitle}>Panier vide</Text>
            <Text style={styles.emptySubtitle}>
              Ajoutez des produits pour commencer vos achats
            </Text>
          </View>
        }
      />

      {/* Bottom Summary */}
      {panier.length > 0 && (
        <View style={styles.bottomContainer}>
          <LinearGradient
            colors={['#ffffff', '#f8fafc']}
            style={styles.summaryContainer}
          >
            {/* Delivery Info */}
          
             
              
              
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalPrice}>{(total).toFixed(2)} TND</Text>
              </View>
            

            {/* Confirm Button */}
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirmerCommande}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#22c55e', '#22c55e']}
                style={styles.confirmButtonGradient}
              >
                <Text style={styles.confirmButtonIcon}>✅</Text>
                <Text style={styles.confirmButtonText}>Confirmer la commande</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
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

  // Cart List styles
  cartList: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  cartItem: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  cartItemGradient: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  // Item Image styles
  itemImageContainer: {
    marginRight: 16,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
  },

  // Item Content styles
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
    marginRight: 8,
  },
  originalPrice: {
    fontSize: 14,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
    marginRight: 6,
  },
  discountBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  discountText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  itemDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },

  // Quantity styles
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  quantityInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityInput: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    width: 50,
    height: 36,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: '#ffffff',
    color: '#374151',
  },
  maxQuantity: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },

  // Remove Button styles
  removeButton: {
    marginLeft: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  removeButtonGradient: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeIcon: {
    fontSize: 16,
  },
  productDetails: {
    marginBottom: 16,
  },

  // Empty state styles
  emptyContainer: {
    alignItems: 'center',
    padding: 60,
    marginTop: 40,
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

  // Bottom Container styles
  bottomContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 12,
  },
  summaryContainer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },

  // Delivery Info styles
  deliveryInfo: {
    marginBottom: 20,
  },
  deliveryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  deliveryLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  deliveryPrice: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  subtotalLabel: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
  },
  subtotalPrice: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 20,
    color: '#1f2937',
    fontWeight: '800',
  },
  totalPrice: {
    fontSize: 20,
    color: '#22c55e',
    fontWeight: '800',
  },

  // Confirm Button styles
  confirmButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  confirmButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  confirmButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});