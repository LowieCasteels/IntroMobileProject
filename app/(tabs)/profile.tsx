import { signOut } from 'firebase/auth';
import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { auth } from '@/firebaseConfig';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/auth/login');
    } catch (error: any) {
      Alert.alert("Fout", `Uitloggen mislukt: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
        <Text style={styles.title}>Profiel</Text>
        <Text>Hier komt de profielinformatie.</Text>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Uitloggen</Text>
        </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 40,
  },
  logoutButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});