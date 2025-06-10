import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Image, Pressable, StyleSheet, Text, View } from "react-native";

export default function WelcomeScreen() {
  const router = useRouter();
  const { width, height } = Dimensions.get('window');
  
  // Animation references
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start animations when component mounts
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
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

  return (
    <>
      <StatusBar style="light" />
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
        <View style={styles.backgroundPattern} />

        <Animated.View style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}>
         <Animated.View
  style={[
    styles.logoContainer,
    { transform: [{ scale: scaleAnim }] } // Ajoute le scale à tout le bloc logo/texte
  ]}
>
  <View style={styles.logoImageContainer}>
    <View style={styles.imageGlow} />
    <Image
      source={require('../assets/images/logo.png')}
      style={styles.logoImage}
    />
    <View style={styles.imageShadow} />
  </View>
  <View style={styles.logoTextContainer}>
    <Text style={styles.logo}>Profiti</Text>
    <View style={styles.taglineContainer}>
      <Text style={styles.tagline}>Don't waste it, benefit from it!</Text>
      <View style={styles.taglineAccent} />
    </View>
    <Text style={styles.subtitle}>
      🌱 Reduce waste • 💰 Save money • 🌍 Help the planet
    </Text>
  </View>
</Animated.View>


          <Animated.View style={[
            styles.bottomSection,
            {
              transform: [{ translateY: slideAnim }]
            }
          ]}>
            {/* Floating elements */}
            <View style={styles.floatingElement1}>
              <Text style={styles.floatingEmoji}>🥖</Text>
            </View>
            <View style={styles.floatingElement2}>
              <Text style={styles.floatingEmoji}>🥗</Text>
            </View>
            <View style={styles.floatingElement3}>
              <Text style={styles.floatingEmoji}>🍎</Text>
            </View>

            <View style={styles.decorativeCircle} />
            <View style={styles.decorativeCircle2} />
            
            <View style={styles.buttonContainer}>
              <Pressable 
                style={({ pressed }) => [
                  styles.button,
                  pressed && styles.buttonPressed
                ]} 
                onPress={() => router.replace('/(auth)/login')}
                android_ripple={{ color: 'rgba(46,125,50,0.2)' }}
              >
                <LinearGradient
                  colors={['#ffffff', '#f8f9fa']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.buttonText}>Start Browsing</Text>
                  <Text style={styles.buttonSubtext}>🚀</Text>
                </LinearGradient>
              </Pressable>
              
              <View style={styles.disclaimerContainer}>
                <View style={styles.disclaimerLine} />
                <Text style={styles.disclaimer}>
                  By continuing, you agree to our Terms of Service
                </Text>
                <View style={styles.disclaimerLine} />
              </View>
            </View>
          </Animated.View>
        </Animated.View>

        {/* Bottom wave decoration */}
        <View style={styles.waveContainer}>
          <View style={styles.wave1} />
          <View style={styles.wave2} />
        </View>
      </LinearGradient>
    </>
  );
}

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
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.03,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 40,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    marginTop: 20,
    flex: 1,
  },
  
  logoImageContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageGlow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  logoImage: {
    width: 400,         // ← taille du logo, adapte à ce que tu veux
    height: 400,
    resizeMode: 'contain',
    marginBottom: -160, // ← règle ici ! Mets plus négatif si besoin
    zIndex: 2,
  },
  
  imageShadow: {
    position: 'absolute',
    bottom: -75,
    marginTop:20,
    width: 230,
    height: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  logoTextContainer: {
    marginTop:-60,
    alignItems: 'center',
    zIndex: 3,
  },
  logo: {
    fontSize: 46, // ou 48 si tu veux
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 4 },
    textShadowRadius: 8,
    letterSpacing: 1.5,
  },
  
  taglineContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
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
    fontSize: 15,
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  taglineAccent: {
    position: 'absolute',
    bottom: -2,
    left: '50%',
    marginLeft: -20,
    width: 40,
    height: 2,
    backgroundColor: '#ffeb3b',
    borderRadius: 1,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  bottomSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  floatingElement1: {
    position: 'absolute',
    top: -40,
    left: 20,
    zIndex: 1,
  },
  floatingElement2: {
    position: 'absolute',
    top: -30,
    right: 30,
    zIndex: 1,
  },
  floatingElement3: {
    position: 'absolute',
    top: -50,
    right: 80,
    zIndex: 1,
  },
  floatingEmoji: {
    fontSize: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },
  decorativeCircle: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    bottom: -125,
    zIndex: -1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    bottom: -75,
    right: -30,
    zIndex: -1,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  button: {
    width: '90%',
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
    overflow: 'hidden',
  },
  buttonPressed: {
    transform: [{ scale: 0.96 }],
    shadowOpacity: 0.2,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#2e7d32',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginRight: 6,
    letterSpacing: 0.5,
  },
  buttonSubtext: {
    fontSize: 16,
  },
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 16,
  },
  disclaimerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 10,
  },
  disclaimer: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '400',
    paddingHorizontal: 16,
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