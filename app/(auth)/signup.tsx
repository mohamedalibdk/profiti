import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { auth, db } from '../../constants/firebaseConfig';

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

export default function SignUpScreen() {
  const router = useRouter();
  const [nom, setNom] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [prenom, setPrenom] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [nomError, setNomError] = useState('');
  const [prenomError, setPrenomError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [roleError, setRoleError] = useState('');

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

  const handleSignUp = async () => {
    setNomError('');
    setPrenomError('');
    setPhoneError('');
    setEmailError('');
    setPasswordError('');
    setConfirmError('');
    setRoleError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordStrengthRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

    let hasError = false;

    if (!nom.trim()) {
      setNomError("Le nom est requis.");
      hasError = true;
    }
    if (!prenom.trim()) {
      setPrenomError("Le prénom est requis.");
      hasError = true;
    }
    if (!phone.trim()) {
      setPhoneError("Le numéro de téléphone est requis.");
      hasError = true;
    } else if (!/^\d{8}$/.test(phone.trim())) {
      setPhoneError("Numéro de téléphone invalide (8 chiffres requis).");
      hasError = true;
    }
    if (!email) {
      setEmailError("L'email est requis.");
      hasError = true;
    } else if (!emailRegex.test(email)) {
      setEmailError("Adresse email invalide.");
      hasError = true;
    }
    if (!password) {
      setPasswordError("Mot de passe requis.");
      hasError = true;
    } else if (!passwordStrengthRegex.test(password)) {
      setPasswordError("Min. 8 caractères, majuscule, minuscule, chiffre, symbole.");
      hasError = true;
    }
    if (!confirmPassword) {
      setConfirmError("Confirmez le mot de passe.");
      hasError = true;
    } else if (password !== confirmPassword) {
      setConfirmError("Les mots de passe ne correspondent pas.");
      hasError = true;
    }
    if (!role) {
      setRoleError("Veuillez sélectionner un rôle.");
      hasError = true;
    }

    if (hasError) return;

    try {
      setLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        nom,
        prenom,
        phone,
        role,
        email: user.email,
        createdAt: new Date(),
      });

      await sendEmailVerification(user);

      setLoading(false);
      Alert.alert(
        'Vérification email',
        "Un email de vérification a été envoyé. Veuillez vérifier votre boîte de réception."
      );

      router.replace('./login');
    } catch (error: any) {
      setLoading(false);
      if (error.code === 'auth/email-already-in-use') {
        setEmailError("Cet email est déjà utilisé.");
      } else {
        Alert.alert("Erreur d'inscription", error.message);
      }
    }
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
                  <Text style={styles.tagline}>Join Our Community!</Text>
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
              <Text style={styles.floatingEmoji}>🚀</Text>
            </View>
            <View style={styles.floatingElement2}>
              <Text style={styles.floatingEmoji}>✨</Text>
            </View>
            <View style={styles.floatingElement3}>
              <Text style={styles.floatingEmoji}>🌟</Text>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.title}>Créer un compte</Text>
              <Text style={styles.subtitle}>Rejoignez Profiti en quelques étapes</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>👤 Nom</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Votre nom"
                    placeholderTextColor="rgba(46, 125, 50, 0.5)"
                    value={nom}
                    onChangeText={setNom}
                    returnKeyType="next"
                  />
                </View>
                {nomError !== '' && (
                  <Animated.View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{nomError}</Text>
                  </Animated.View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>👤 Prénom</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Votre prénom"
                    placeholderTextColor="rgba(46, 125, 50, 0.5)"
                    value={prenom}
                    onChangeText={setPrenom}
                    returnKeyType="next"
                  />
                </View>
                {prenomError !== '' && (
                  <Animated.View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{prenomError}</Text>
                  </Animated.View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>📱 Téléphone</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Votre numéro de téléphone"
                    placeholderTextColor="rgba(46, 125, 50, 0.5)"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    returnKeyType="next"
                  />
                </View>
                {phoneError !== '' && (
                  <Animated.View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{phoneError}</Text>
                  </Animated.View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>📧 Email</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Votre adresse email"
                    placeholderTextColor="rgba(46, 125, 50, 0.5)"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    returnKeyType="next"
                  />
                </View>
                {emailError !== '' && (
                  <Animated.View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{emailError}</Text>
                  </Animated.View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>🔒 Mot de passe</Text>
                <View style={styles.inputContainer}>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Votre mot de passe"
                      placeholderTextColor="rgba(46, 125, 50, 0.5)"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                      returnKeyType="next"
                    />
                    <TouchableOpacity
                      style={styles.toggleButton}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Text style={styles.toggleText}>
                        {showPassword ? '👁️' : '👁️‍🗨️'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {passwordError !== '' && (
                  <Animated.View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{passwordError}</Text>
                  </Animated.View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>🔒 Confirmer le mot de passe</Text>
                <View style={styles.inputContainer}>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Confirmez votre mot de passe"
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
                {confirmError !== '' && (
                  <Animated.View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{confirmError}</Text>
                  </Animated.View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>👥 Je suis :</Text>
                <View style={styles.rolesContainer}>
                  {['vendeur', 'acheteur', 'livreur'].map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.roleButton, role === r && styles.roleSelected]}
                      onPress={() => setRole(r)}
                    >
                      <Text style={[styles.roleText, role === r && styles.roleTextSelected]}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {roleError !== '' && (
                  <Animated.View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{roleError}</Text>
                  </Animated.View>
                )}
              </View>

              <TouchableOpacity
                style={styles.signupButton}
                onPress={handleSignUp}
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
                      <Text style={styles.signupButtonText}>S'inscrire</Text>
                      <Text style={styles.buttonEmoji}>🚀</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => router.replace('./login')}
              >
                <Text style={styles.loginButtonText}>Déjà un compte ? Se connecter</Text>
                <Text style={styles.loginEmoji}>✨</Text>
              </TouchableOpacity>
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
    top: 30,
    right: 80,
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
    marginBottom: 40,
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
  },
  inputGroup: {
    marginBottom: 16,
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
  input: {
    borderWidth: 2,
    borderColor: 'rgba(46, 125, 50, 0.2)',
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 16,
    fontSize: 16,
    color: '#2e7d32',
    fontWeight: '500',
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
  },
  errorContainer: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: 15,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.2)',
  },
  errorText: {
    color: '#d32f2f',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  rolesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 8,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: 'rgba(46, 125, 50, 0.3)',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(46, 125, 50, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  roleSelected: {
    backgroundColor: '#2e7d32',
    borderColor: '#2e7d32',
    shadowColor: '#2e7d32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  roleText: {
    color: '#2e7d32',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  roleTextSelected: {
    color: '#ffffff',
  },
  signupButton: {
    borderRadius: 20,
    marginTop: 20,
    marginBottom: 16,
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
  signupButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 0.5,
    marginRight: 8,
  },
  buttonEmoji: {
    fontSize: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(46, 125, 50, 0.2)',
  },
  dividerText: {
    marginHorizontal: 15,
    color: 'rgba(46, 125, 50, 0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    borderWidth: 2,
    borderColor: '#2e7d32',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(46, 125, 50, 0.05)',
    shadowColor: '#2e7d32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    color: '#2e7d32',
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 0.5,
    marginRight: 8,
  },
  loginEmoji: {
    fontSize: 16,
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