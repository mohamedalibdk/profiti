import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref as storageRef, uploadBytes } from 'firebase/storage';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../../constants/firebaseConfig';

interface TimeState {
  hours: string;
  minutes: string;
  focusHours: boolean;
  focusMinutes: boolean;
}

export default function AddProduitScreen() {
  const router = useRouter();
  const storage = getStorage();
  const currentUser = auth.currentUser;

  const [nom, setNom] = useState('');
  const [prix, setPrix] = useState('');
  const [prixNormal, setPrixNormal] = useState('');
  const [quantite, setQuantite] = useState('');
  const [description, setDescription] = useState('');
  const [categorie, setCategorie] = useState('');
  const [horaireDebut, setHoraireDebut] = useState<TimeState>({
    hours: '',
    minutes: '',
    focusHours: false,
    focusMinutes: false
  });
  const [horaireFin, setHoraireFin] = useState<TimeState>({
    hours: '',
    minutes: '',
    focusHours: false,
    focusMinutes: false
  });
  const [newImage, setNewImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const modalRef = useRef<View>(null);

  const uploadImage = async () => {
    if (!newImage) return null;
    try {
      const response = await fetch(newImage);
      const blob = await response.blob();
      const filename = `produits/${Date.now()}.jpg`;
      const imageRef = storageRef(storage, filename);
      await uploadBytes(imageRef, blob);
      return await getDownloadURL(imageRef);
    } catch (error) {
      console.error('Erreur upload image:', error);
      return null;
    }
  };

  const categories = ['Fruits', 'Légumes', 'Pâtisserie', 'Boissons', 'Produits laitiers','Fast Food'];

  const validateTime = (hours: string, minutes: string) => {
    const hoursNum = parseInt(hours);
    const minutesNum = parseInt(minutes);
    return hoursNum >= 0 && hoursNum <= 23 && minutesNum >= 0 && minutesNum <= 59;
  };

  const handleImageSelection = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setNewImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erreur sélection image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image.');
    }
    setIsModalVisible(false);
  };

  const handleNumericInput = (text: string, setter: (value: string) => void) => {
    const numericValue = text.replace(/[^0-9.]/g, '');
    const parts = numericValue.split('.');
    if (parts.length > 2) {
      setter(parts[0] + '.' + parts.slice(1).join(''));
    } else {
      setter(numericValue);
    }
  };

  const handleTimeChange = (text: string, setter: (value: string) => void) => {
    const timeValue = text.replace(/[^0-9:]/g, '');
    setter(timeValue);
  };

  const handleTimeFocus = (setter: (value: boolean) => void) => {
    setter(true);
  };

  const handleTimeBlur = (setter: (value: boolean) => void) => {
    setter(false);
  };

  const handleAdd = async () => {
    if (!nom || !prix || !prixNormal || !description || !categorie || !quantite) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs.");
      return;
    }

    if (!currentUser) {
      Alert.alert("Erreur", "Vous devez être connecté pour ajouter un produit.");
      return;
    }

    if (Number(prixNormal) < Number(prix)) {
      Alert.alert("Erreur", "Le prix promotionnel doit être inférieur au prix normal.");
      return;
    }

    const startTime = `${horaireDebut.hours}:${horaireDebut.minutes}`;
    const endTime = `${horaireFin.hours}:${horaireFin.minutes}`;

    if (!validateTime(horaireDebut.hours, horaireDebut.minutes) || 
        !validateTime(horaireFin.hours, horaireFin.minutes)) {
      Alert.alert("Erreur", "Format d'heure invalide. Heures: 00-23, Minutes: 00-59");
      return;
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = parseInt(horaireDebut.hours) * 60 + parseInt(horaireDebut.minutes);
    const endMinutes = parseInt(horaireFin.hours) * 60 + parseInt(horaireFin.minutes);

    if (startMinutes < currentMinutes) {
      Alert.alert("Erreur", "L'heure de début ne peut pas être dans le passé.");
      return;
    }

    if (startMinutes >= endMinutes) {
      Alert.alert("Erreur", "L'heure de fin doit être après l'heure de début.");
      return;
    }

    setUploading(true);

    try {
      let imageURL = '';
      if (newImage) {
        const uploaded = await uploadImage();
        if (uploaded) imageURL = uploaded;
      }

      await addDoc(collection(db, 'produits'), {
        nom,
        description,
        prixPromotionnel: Number(prix),
        prixNormal: Number(prixNormal),
        quantite: Number(quantite),
        categorie,
        horairePickup: `${startTime} - ${endTime}`,
        image: imageURL,
        ownerId: currentUser.uid,
        createdAt: serverTimestamp(),
      });

      setUploading(false);
      Alert.alert("Succès", "Produit ajouté !");
      router.replace('/vendeur/ajouter');
    } catch (error) {
      console.error(error);
      setUploading(false);
      Alert.alert("Erreur", "Ajout échoué.");
    }
  };

  const handleReturn = () => {
    if (nom || prix || prixNormal || quantite || description || categorie || newImage) {
      Alert.alert(
        "Confirmation",
        "Voulez-vous vraiment quitter ? Les modifications non enregistrées seront perdues.",
        [
          {
            text: "Annuler",
            style: "cancel"
          },
          {
            text: "Quitter",
            style: "destructive",
            onPress: () => router.replace('/vendeur/ajouter')
          }
        ]
      );
    } else {
      router.replace('/vendeur/ajouter');
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{
        headerShown: false,
      }} />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <LinearGradient
        colors={['#10b981', '#22c55e']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>➕ Ajouter un produit</Text>
            <Text style={styles.subtitle}>Créez votre nouvelle offre</Text>
          </View>
        </View>
      </LinearGradient>

        {/* Image Section */}
        <View style={styles.imageSection}>
          <Pressable 
            onPress={() => setIsModalVisible(true)} 
            style={styles.imageContainer}
            accessibilityRole="button"
            accessibilityLabel="Sélectionner une image"
            accessibilityHint="Ouvre la galerie pour choisir une image"
          >
            <LinearGradient
              colors={['#ffffff', '#f8fafc']}
              style={styles.imageGradient}
            >
              <Image
                source={
                  newImage ? { uri: newImage } : require('@/assets/images/png.png')
                }
                style={styles.productImage}
                accessibilityLabel={newImage ? "Image du produit" : "Image par défaut"}
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.3)']}
                style={styles.imageOverlay}
              />
              <View style={styles.editIconContainer}>
                <Text style={styles.editIcon}>📷</Text>
              </View>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Form Container */}
        <View style={styles.formContainer}>
          <LinearGradient
            colors={['#ffffff', '#f8fafc']}
            style={styles.formGradient}
          >
            <Text style={styles.sectionTitle}>📝 Informations du produit</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>🏷️ Nom du produit</Text>
              <TextInput 
                style={styles.input} 
                value={nom} 
                onChangeText={setNom} 
                placeholder="Entrez le nom du produit"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.priceRow}>
              <View style={styles.priceInputHalf}>
                <Text style={styles.label}>💰 Prix normal</Text>
                <TextInput 
                  style={styles.input} 
                  value={prixNormal} 
                  onChangeText={(value) => handleNumericInput(value, setPrixNormal)}
                  keyboardType="numeric"
                  placeholder="Prix normal"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.priceInputHalf}>
                <Text style={styles.label}>💸 Prix promo</Text>
                <TextInput 
                  style={styles.input} 
                  value={prix} 
                  onChangeText={(value) => handleNumericInput(value, setPrix)}
                  keyboardType="numeric"
                  placeholder="Prix promo"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>📦 Quantité disponible</Text>
              <TextInput 
                style={styles.input} 
                value={quantite} 
                onChangeText={(value) => handleNumericInput(value, setQuantite)}
                keyboardType="numeric"
                placeholder="Nombre d'unités disponibles"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>📝 Description</Text>
              <TextInput 
                style={[styles.input, styles.textArea]} 
                value={description} 
                onChangeText={setDescription} 
                multiline 
                numberOfLines={4}
                placeholder="Décrivez votre produit en détail..."
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>🕒 Horaire de retrait</Text>
              <View style={styles.timeContainer}>
                <View style={styles.timeInputGroup}>
                  <Text style={styles.timeLabel}>Début</Text>
                  <View style={styles.timeInputRow}>
                    <TextInput
                      style={[styles.timeInput, styles.input]}
                      value={horaireDebut.hours}
                      onChangeText={(text) => handleTimeChange(text, (value) => setHoraireDebut({ ...horaireDebut, hours: value }))}
                      onFocus={() => handleTimeFocus((value) => setHoraireDebut({ ...horaireDebut, focusHours: value }))}
                      onBlur={() => handleTimeBlur((value) => setHoraireDebut({ ...horaireDebut, focusHours: value }))}
                      placeholder="HH"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                      maxLength={2}
                    />
                    <Text style={styles.timeSeparator}>:</Text>
                    <TextInput
                      style={[styles.timeInput, styles.input]}
                      value={horaireDebut.minutes}
                      onChangeText={(text) => handleTimeChange(text, (value) => setHoraireDebut({ ...horaireDebut, minutes: value }))}
                      onFocus={() => handleTimeFocus((value) => setHoraireDebut({ ...horaireDebut, focusMinutes: value }))}
                      onBlur={() => handleTimeBlur((value) => setHoraireDebut({ ...horaireDebut, focusMinutes: value }))}
                      placeholder="MM"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                </View>

                <Text style={styles.timeRangeSeparator}>-</Text>

                <View style={styles.timeInputGroup}>
                  <Text style={styles.timeLabel}>Fin</Text>
                  <View style={styles.timeInputRow}>
                    <TextInput
                      style={[styles.timeInput, styles.input]}
                      value={horaireFin.hours}
                      onChangeText={(text) => handleTimeChange(text, (value) => setHoraireFin({ ...horaireFin, hours: value }))}
                      onFocus={() => handleTimeFocus((value) => setHoraireFin({ ...horaireFin, focusHours: value }))}
                      onBlur={() => handleTimeBlur((value) => setHoraireFin({ ...horaireFin, focusHours: value }))}
                      placeholder="HH"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                      maxLength={2}
                    />
                    <Text style={styles.timeSeparator}>:</Text>
                    <TextInput
                      style={[styles.timeInput, styles.input]}
                      value={horaireFin.minutes}
                      onChangeText={(text) => handleTimeChange(text, (value) => setHoraireFin({ ...horaireFin, minutes: value }))}
                      onFocus={() => handleTimeFocus((value) => setHoraireFin({ ...horaireFin, focusMinutes: value }))}
                      onBlur={() => handleTimeBlur((value) => setHoraireFin({ ...horaireFin, focusMinutes: value }))}
                      placeholder="MM"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                </View>
              </View>
              <Text style={styles.timeHint}>Format: Heures (00-23) : Minutes (00-59)</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>📂 Catégorie</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
                {categories.map((cat) => (
                  <TouchableOpacity 
                    key={cat} 
                    onPress={() => setCategorie(cat)} 
                    style={[styles.categoryButton, categorie === cat && styles.selectedCategory]}
                  >
                    <LinearGradient
                      colors={categorie === cat ? ['#22c55e', '#22c55e'] : ['#f8fafc', '#f1f5f9']}
                      style={styles.categoryGradient}
                    >
                      <Text style={[styles.categoryText, categorie === cat && styles.selectedCategoryText]}>
                        {cat}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </LinearGradient>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, uploading && styles.actionButtonDisabled]} 
            onPress={handleAdd} 
            disabled={uploading}
          >
            <LinearGradient
              colors={['#22c55e', '#22c55e']}
              style={styles.actionButtonGradient}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.actionButtonIcon}>✅</Text>
                  <Text style={styles.actionButtonText}>Ajouter le produit</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleReturn}
          >
            <LinearGradient
              colors={['#6b7280', '#4b5563']}
              style={styles.actionButtonGradient}
            >
              <Text style={styles.actionButtonIcon}>🔙</Text>
              <Text style={styles.actionButtonText}>Retour</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Modal */}
        <Modal
          visible={isModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsModalVisible(false)}
          accessibilityViewIsModal={true}
        >
          <View style={styles.modalOverlay}>
            <LinearGradient
              colors={['#ffffff', '#f8fafc']}
              style={styles.modalContent}
            >
              <Text style={styles.modalTitle}>📷 Choisir une image</Text>
              
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleImageSelection}
                accessibilityRole="button"
                accessibilityLabel="Choisir depuis la galerie"
              >
                <LinearGradient
                  colors={['#22c55e', '#22c55e']}
                  style={styles.modalButtonGradient}
                >
                  <Text style={styles.modalButtonIcon}>🖼️</Text>
                  <Text style={styles.modalButtonText}>Galerie</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setIsModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Annuler"
              >
                <LinearGradient
                  colors={['#6b7280', '#4b5563']}
                  style={styles.modalButtonGradient}
                >
                  <Text style={styles.modalButtonIcon}>❌</Text>
                  <Text style={styles.modalButtonText}>Annuler</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc' 
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
    marginTop:-12,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },

  scrollView: { 
    flex: 1 
  },

  // Image section
  imageSection: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    
  },
  imageContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  imageGradient: {
    position: 'relative',
    height: 220,
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
  editIconContainer: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    backgroundColor: '#22c55e',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  editIcon: { 
    fontSize: 24,
    color: '#ffffff'
  },

  // Form styles
  formContainer: { 
    paddingHorizontal: 20,
    marginBottom: 20
  },
  formGradient: {
    borderRadius: 24,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 25,
    letterSpacing: -0.3,
  },
  inputGroup: { 
    marginBottom: 20 
  },
  label: {
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
    fontSize: 16,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 16,
  },

  // Price row
  priceRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  priceInputHalf: {
    flex: 1,
  },

  // Time inputs
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  timeInputGroup: {
    flex: 1,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    fontWeight: '600',
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeInput: {
    width: 55,
    height: 55,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
  },
  timeSeparator: {
    fontSize: 20,
    color: '#6b7280',
    marginHorizontal: 8,
    fontWeight: 'bold',
  },
  timeRangeSeparator: {
    fontSize: 24,
    color: '#22c55e',
    marginHorizontal: 10,
    fontWeight: 'bold',
  },
  timeHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Categories
  categoriesContainer: { 
    paddingVertical: 12 
  },
  categoryButton: {
    marginRight: 12,
    borderRadius: 20,
    overflow: 'hidden',
  },
  categoryGradient: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  selectedCategory: {},
  categoryText: {
    color: '#6b7280',
    fontWeight: '700',
    fontSize: 14,
  },
  selectedCategoryText: { 
    color: '#ffffff' 
  },

  // Actions
  actionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 15,
  },
  actionButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  actionButtonDisabled: {
    opacity: 0.7,
    shadowOpacity: 0.1,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  actionButtonIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 24,
    padding: 25,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 25,
  },
  modalButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 15,
  },
  modalButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  modalButtonIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});