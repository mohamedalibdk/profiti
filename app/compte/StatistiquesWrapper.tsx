import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../constants/firebaseConfig';
import StatistiquesScreen from './StatistiquesScreen';

type Role = 'acheteur' | 'vendeur' | 'livreur';

type RootStackParamList = {
  Profil: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function StatistiquesSelector() {
  const navigation = useNavigation<NavigationProp>();
  const [role, setRole] = useState<Role | null>(null);
  const [choix, setChoix] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            setRole(snap.data().role);
          } else {
            setRole('acheteur');
          }
        } else {
          setRole('vendeur');
        }
      } catch {
        setRole('livreur');
      }
      setLoading(false);
    };
    fetchRole();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00897B" />
      </View>
    );
  }

  if (choix) {
    return (
      <StatistiquesScreen
        role={choix}
        onBack={() => setChoix(null)}
        onProfil={() => navigation.navigate('Profil')}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titre}>Voir mes statistiques</Text>
      {(role === 'acheteur' || role === 'vendeur' || role === 'livreur') && (
        <TouchableOpacity style={styles.btn} onPress={() => setChoix('acheteur')}>
          <Text style={styles.btnTxt}>Statistiques Achat</Text>
        </TouchableOpacity>
      )}
      {role === 'vendeur' && (
        <TouchableOpacity style={styles.btn} onPress={() => setChoix('vendeur')}>
          <Text style={styles.btnTxt}>Statistiques Vente</Text>
        </TouchableOpacity>
      )}
      {role === 'livreur' && (
        <TouchableOpacity style={styles.btn} onPress={() => setChoix('livreur')}>
          <Text style={styles.btnTxt}>Statistiques Livraison</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor:'#F8F8F8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  titre: { fontSize: 22, fontWeight: 'bold', marginBottom: 24 },
  btn: {
    backgroundColor: '#00897B',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginVertical: 12,
    width: 260,
    alignItems: 'center',
    elevation: 2
  },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
