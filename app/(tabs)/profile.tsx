import { signOut } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert, Image } from 'react-native';
import { auth, db } from '@/firebaseConfig';
import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { UserData } from '../types';

export default function ProfileScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [initials, setInitials] = useState('');
  const [profilePic, setProfilePic] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        const docRef = doc(db, "users", auth.currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const userData = docSnap.data() as UserData;
          const { firstName, lastName, profilePictureUrl } = userData;
          setUserName(`${firstName} ${lastName}`);

          const firstInitial = firstName?.[0] || '';
          const lastInitial = lastName?.[0] || '';
          setInitials(`${firstInitial}${lastInitial}`.toUpperCase());

          if (profilePictureUrl) {
            setProfilePic(profilePictureUrl);
          }
        } else {
          console.log("User document not found!");
        }
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/login');
    } catch (error: any) {
      Alert.alert("Fout", `Uitloggen mislukt: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
        <View style={styles.profileHeader}>
            <View style={styles.avatar}>
                {profilePic ? (
                    <Image source={{ uri: profilePic }} style={styles.avatarImage} />
                ) : (
                    <Text style={styles.avatarInitials}>{initials}</Text>
                )}
            </View>
            <Text style={styles.title}>{userName || 'Gebruiker'}</Text>
        </View>

        <TouchableOpacity style={styles.editProfileButton} onPress={() => router.push('/edit-profile')}>
            <Text style={styles.editProfileButtonText}>Profiel bewerken</Text>
        </TouchableOpacity>

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
});