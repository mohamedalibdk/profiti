// app/(auth)/layout.tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ title: 'Connexion' }} />
      <Stack.Screen name="signup" options={{ title: 'Créer un compte' }} />
      <Stack.Screen name="reset-password" options={{ title: 'Mot de passe oublié' }} />
    </Stack>
  );
}


