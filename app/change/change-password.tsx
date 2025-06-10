import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, User } from 'firebase/auth';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { auth } from '../../constants/firebaseConfig';

const passwordStrengthRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Animation references
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start animations when component mounts
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous rotation for decorative elements
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  async function reauthenticate(currentPassword: string) {
    const user = auth.currentUser;
    if (!user) throw new Error('Aucun utilisateur connecté');
    const cred = EmailAuthProvider.credential(user.email as string, currentPassword);
    await reauthenticateWithCredential(user as User, cred);
  }

  const validate = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Tous les champs sont obligatoires.');
      return false;
    }
    if (!passwordStrengthRegex.test(newPassword)) {
      setError("Le nouveau mot de passe doit contenir min. 8 caractères, majuscule, minuscule, chiffre, symbole.");
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return false;
    }
    setError('');
    return true;
  };

  const handleChangePassword = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await reauthenticate(currentPassword);
      await updatePassword(auth.currentUser as User, newPassword);
      Alert.alert('Succès', 'Mot de passe modifié !');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Erreur lors du changement du mot de passe');
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={['#1a5d1a', '#2e7d32', '#4caf50', '#66bb6a']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Animated background elements */}
        <Animated.View 
          style={[
            styles.backgroundCircle1,
            { transform: [{ rotate }] }
          ]} 
        />
        <Animated.View 
          style={[
            styles.backgroundCircle2,
            { transform: [{ rotate: rotate }] }
          ]} 
        />

        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          onTouchStart={Keyboard.dismiss}
          showsVerticalScrollIndicator={false}
        >
          {/* Header with Logo */}
          <Animated.View style={[
            styles.headerContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}>
            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.1)']}
                style={styles.backButtonGradient}
              >
                <Text style={styles.backButtonText}>←</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.logoContainer}>
              <View style={styles.logoImageContainer}>
                <View style={styles.imageGlow} />
                <Image
                  source={require('@/assets/images/logo.png')}
                  style={styles.logoImage}
                />
                <View style={styles.imageShadow} />
              </View>
              <View style={styles.logoTextContainer}>
                <Text style={styles.appName}>Profiti</Text>
                <View style={styles.taglineContainer}>
                  <Text style={styles.tagline}>Change Password</Text>
                  <View style={styles.taglineAccent} />
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Form Container */}
          <Animated.View style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}>
            {/* Floating elements */}
            <View style={styles.floatingElement1}>
              <Text style={styles.floatingEmoji}>🔐</Text>
            </View>
            <View style={styles.floatingElement2}>
              <Text style={styles.floatingEmoji}>🔒</Text>
            </View>
            <View style={styles.floatingElement3}>
              <Text style={styles.floatingEmoji}>✨</Text>
            </View>
            <View style={styles.floatingElement4}>
              <Text style={styles.floatingEmoji}>🛡️</Text>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.title}>Changer le mot de passe</Text>
              <Text style={styles.subtitle}>
                Sécurisez votre compte Profiti avec un nouveau mot de passe
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>🔒 Mot de passe actuel</Text>
                <View style={styles.inputContainer}>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Mot de passe actuel"
                      placeholderTextColor="rgba(46, 125, 50, 0.5)"
                      secureTextEntry={!showCurrentPassword}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      returnKeyType="next"
                    />
                    <TouchableOpacity
                      style={styles.toggleButton}
                      onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      <Text style={styles.toggleText}>
                        {showCurrentPassword ? '👁️' : '👁️‍🗨️'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>🔐 Nouveau mot de passe</Text>
                <View style={styles.inputContainer}>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Nouveau mot de passe"
                      placeholderTextColor="rgba(46, 125, 50, 0.5)"
                      secureTextEntry={!showNewPassword}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      returnKeyType="next"
                    />
                    <TouchableOpacity
                      style={styles.toggleButton}
                      onPress={() => setShowNewPassword(!showNewPassword)}
                    >
                      <Text style={styles.toggleText}>
                        {showNewPassword ? '👁️' : '👁️‍🗨️'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>🛡️ Confirmer le nouveau mot de passe</Text>
                <View style={styles.inputContainer}>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Confirmer nouveau mot de passe"
                      placeholderTextColor="rgba(46, 125, 50, 0.5)"
                      secureTextEntry={!showConfirmPassword}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      returnKeyType="done"
                    />
                    <TouchableOpacity
                      style={styles.toggleButton}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <Text style={styles.toggleText}>
                        {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {error !== '' && (
                <Animated.View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </Animated.View>
              )}

              <TouchableOpacity
                style={styles.changeButton}
                onPress={handleChangePassword}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#2e7d32', '#4caf50']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Text style={styles.changeButtonText}>Changer le mot de passe</Text>
                      <Text style={styles.buttonEmoji}>🔄</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Password strength indicator */}
              <View style={styles.strengthContainer}>
                <Text style={styles.strengthTitle}>Exigences du mot de passe:</Text>
                <View style={styles.strengthItem}>
                  <Text style={styles.strengthEmoji}>✓</Text>
                  <Text style={styles.strengthText}>Au moins 8 caractères</Text>
                </View>
                <View style={styles.strengthItem}>
                  <Text style={styles.strengthEmoji}>✓</Text>
                  <Text style={styles.strengthText}>Une majuscule et une minuscule</Text>
                </View>
                <View style={styles.strengthItem}>
                  <Text style={styles.strengthEmoji}>✓</Text>
                  <Text style={styles.strengthText}>Un chiffre et un symbole</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Bottom wave decoration */}
        <View style={styles.waveContainer}>
          <View style={styles.wave1} />
          <View style={styles.wave2} />
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  backgroundCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    top: -150,
    right: -150,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  backgroundCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    bottom: -100,
    left: -100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerContainer: {
    paddingTop: 60,
    paddingBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 65,
    zIndex: 10,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  backButtonGradient: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  backButtonText: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImageContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  logoImage: {
    width: 280,
    height: 280,
    resizeMode: 'contain',
    marginBottom: -120,
    zIndex: 2,
  },
  imageShadow: {
    position: 'absolute',
    bottom: -60,
    width: 180,
    height: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  logoTextContainer: {
    marginTop: -40,
    alignItems: 'center',
    zIndex: 3,
  },
  appName: {
    fontSize: 36,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 4 },
    textShadowRadius: 8,
    letterSpacing: 1.5,
  },
  taglineContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  tagline: {
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  taglineAccent: {
    position: 'absolute',
    bottom: -2,
    left: '50%',
    marginLeft: -15,
    width: 30,
    height: 2,
    backgroundColor: '#ffeb3b',
    borderRadius: 1,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
    position: 'relative',
    marginTop: 20,
  },
  floatingElement1: {
    position: 'absolute',
    top: 20,
    left: 30,
    zIndex: 1,
  },
  floatingElement2: {
    position: 'absolute',
    top: 10,
    right: 40,
    zIndex: 1,
  },
  floatingElement3: {
    position: 'absolute',
    top: 60,
    right: 80,
    zIndex: 1,
  },
  floatingElement4: {
    position: 'absolute',
    top: 50,
    left: 70,
    zIndex: 1,
  },
  floatingEmoji: {
    fontSize: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 30,
    padding: 24,
    marginTop: 40,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#2e7d32',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(46, 125, 50, 0.8)',
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontWeight: '700',
    color: '#2e7d32',
    marginBottom: 8,
    fontSize: 16,
    letterSpacing: 0.3,
  },
  inputContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  passwordContainer: {
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: 'rgba(46, 125, 50, 0.2)',
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#2e7d32',
    fontWeight: '500',
  },
  toggleButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 15,
    backgroundColor: 'rgba(46, 125, 50, 0.05)',
  },
  toggleText: {
    fontSize: 18,
    color: '#2e7d32',
  },
  errorContainer: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: 15,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.2)',
  },
  errorText: {
    color: '#d32f2f',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  changeButton: {
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#2e7d32',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 0.5,
    marginRight: 8,
  },
  buttonEmoji: {
    fontSize: 16,
  },
  strengthContainer: {
    backgroundColor: 'rgba(46, 125, 50, 0.05)',
    borderRadius: 15,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 50, 0.1)',
  },
  strengthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2e7d32',
    marginBottom: 12,
    textAlign: 'center',
  },
  strengthItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  strengthEmoji: {
    fontSize: 14,
    color: '#4caf50',
    marginRight: 8,
    fontWeight: 'bold',
  },
  strengthText: {
    fontSize: 14,
    color: 'rgba(46, 125, 50, 0.8)',
    fontWeight: '500',
  },
  waveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: -2,
  },
  wave1: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
  },
  wave2: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderTopLeftRadius: 80,
    borderTopRightRadius: 80,
  },
});