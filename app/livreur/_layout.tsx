import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from '../../constants/firebaseConfig';
import { COLORS } from '../../constants/theme';

export default function LivreurTabsLayout() {
  const insets = useSafeAreaInsets();

  // Badge dynamique panier (comme acheteur)
  const [panierCount, setPanierCount] = useState(0);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setPanierCount(0);
      return;
    }

    const ref = doc(db, 'panier', user.uid);

    // Écoute en temps réel
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const items = data.items || [];
        setPanierCount(items.length);
      } else {
        setPanierCount(0);
      }
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          height: 70 + insets.bottom,
          borderTopWidth: 0,
          elevation: 5,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          paddingBottom: insets.bottom,
          paddingHorizontal: 10,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#A0A0A0',
        tabBarIcon: ({ color, focused }) => {
          let iconName: string = 'help-circle-outline';

          if (route.name === 'produits') {
            iconName = 'home-outline';
          } else if (route.name === 'panier') {
            iconName = 'cart-outline';
          } else if (route.name === 'livraison') {
            iconName = 'motorbike';
          } else if (route.name === 'profil') {
            iconName = 'account-circle-outline';
          }

          return (
            <View style={styles.tabIconContainer}>
              {focused && <View style={styles.activeBadge} />}
              <View style={[
                styles.iconWrapper,
                focused ? styles.activeIconWrapper : null
              ]}>
                <MaterialCommunityIcons name={iconName as any} size={26} color={color} />
                {/* Badge dynamique pour le panier */}
                {route.name === 'panier' && panierCount > 0 && (
                  <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>{panierCount}</Text>
                  </View>
                )}
              </View>
            </View>
          );
        },
      })}
    >
      <Tabs.Screen name="produits" />
      <Tabs.Screen name="panier" />
      <Tabs.Screen name="livraison" />
      <Tabs.Screen name="profil" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 48,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'transparent',
  },
  activeIconWrapper: {
    backgroundColor: `${COLORS.primary}15`,
  },
  activeBadge: {
    position: 'absolute',
    top: 0,
    width: 20,
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  badgeContainer: {
    position: 'absolute',
    right: 2,
    top: 2,
    backgroundColor: 'red',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
