import { signOut } from 'firebase/auth';
import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert, Image } from 'react-native';
import { auth, db } from '@/firebaseConfig';
import { useFocusEffect, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { UserData } from '../../types';

const PreferenceItem = ({ label, value }: { label: string, value: string | undefined | null }) => (
  <View style={styles.preferenceItem}>
    <Text style={styles.preferenceLabel}>{label}</Text>
    {value ? (
      <Text style={styles.preferenceValue}>{value}</Text>
    ) : (
      <Text style={styles.preferenceNotSet}>Niet beschreven</Text>
    )}
  </View>
);

const StatItem = ({ label, value }: { label: string, value: string | number | undefined | null }) => (
    <View style={styles.statItem}>
        <Text style={styles.statValue}>{value ?? '-'}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

export default function ProfileScreen() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);

  useFocusEffect(
    useCallback(() => {
      const fetchUserData = async () => {
        if (auth.currentUser) {
          const docRef = doc(db, "users", auth.currentUser.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setUserData(docSnap.data() as UserData);
          } else {
            console.log("User document not found!");
          }
        }
      }
      fetchUserData();
    }, [])
  );

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/login');
    } catch (error: any) {
      Alert.alert("Fout", `Uitloggen mislukt: ${error.message}`);
    }
  };

  const firstInitial = userData?.firstName?.[0] || '';
  const lastInitial = userData?.lastName?.[0] || '';
  const initials = `${firstInitial}${lastInitial}`.toUpperCase();

  return (
    <View style={styles.container}>
        <View style={styles.profileHeader}>
            <View style={styles.avatar}>
                {userData?.profilePictureUrl ? (
                    <Image source={{ uri: userData.profilePictureUrl }} style={styles.avatarImage} />
                ) : (
                    <Text style={styles.avatarInitials}>{initials}</Text>
                )}
            </View>
            <Text style={styles.title}>{userData ? `${userData.firstName} ${userData.lastName}` : 'Gebruiker'}</Text>
        </View>

        <TouchableOpacity style={styles.editProfileButton} onPress={() => router.push('/edit-profile')}>
            <Text style={styles.editProfileButtonText}>Profiel bewerken</Text>
        </TouchableOpacity>

        <View style={styles.statsSection}>
            <StatItem label="Rating" value={userData?.rating?.toFixed(2)} />
            <StatItem label="Gespeeld" value={userData?.gamesPlayed} />
            <StatItem label="Gewonnen" value={userData?.wins} />
            <StatItem label="Verloren" value={userData?.losses} />
        </View>

        <View style={styles.preferencesSection}>
          <View style={styles.preferencesHeader}>
              <Text style={styles.preferencesTitle}>Voorkeuren van de speler</Text>
          </View>
          <View style={styles.preferencesContainer}>
            <PreferenceItem label="Beste hand" value={userData?.beste_hand} />
            <PreferenceItem label="Baanpositie" value={userData?.baanpositie} />
            <PreferenceItem label="Type partij" value={userData?.type_partij} />
            <PreferenceItem label="Favoriete tijd" value={userData?.favoriete_tijd} />
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Log out</Text>
        </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'flex-start',
    marginBottom: 50,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0e2432',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 15,
    alignItems: 'center',
    position: 'absolute',
    bottom: 40,
    width: '90%',
  },
  logoutButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  editProfileButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 15,
    alignItems: 'center',
    width: '90%',
  },
  editProfileButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: '#f6f6f6',
    paddingVertical: 20,
    borderRadius: 10,
    marginTop: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0e2432',
  },
  statLabel: {
    fontSize: 14,
    color: 'gray',
    marginTop: 4,
  },
  preferencesSection: {
    width: '100%',
    marginTop: 20,
  },
  preferencesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  preferencesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  editButton: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  preferencesContainer: {
    backgroundColor: '#f6f6f6',
    borderRadius: 10,
    padding: 15,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e9e9e9',
  },
  preferenceLabel: {
    fontSize: 16,
    color: '#333',
  },
  preferenceValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  preferenceNotSet: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
});