import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  Alert
} from 'react-native';

import { auth, db } from "../../firebaseConfig";
import { createUserWithEmailAndPassword, deleteUser } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { UserData } from '../types';

export default function RegisterScreen() {
    const router = useRouter()
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');

    const handleRegister = async () => {
        if (!firstName || !lastName || !email || !password) {
            Alert.alert("Fout", "Vul alstublieft alle velden in.");
            return;
        }
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            try {
                const newUser: UserData = {
                    firstName: firstName,
                    lastName: lastName,
                    email: email.toLowerCase(),
                    gender: 'Zeg ik liever niet',
                    birthDate: '',
                    description: '',
                    profilePictureUrl: '',
                    beste_hand: '',
                    baanpositie: '',
                    type_partij: '',
                    favoriete_tijd: '',
                    createdAt: serverTimestamp(),
                    rating: 1.5,
                };

                await setDoc(doc(db, "users", user.uid), newUser);
                router.replace('/');

            } catch (firestoreError: any) {
                await deleteUser(user);
                Alert.alert("Registratie mislukt", "Er is iets misgegaan bij het aanmaken van je profiel. Probeer het opnieuw.");
            }
        } catch (authError: any) {
            Alert.alert("Fout bij registratie", authError.message);
        }
    };

    return (
        <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
        >
        <View style={styles.inner}>
            <Text style={styles.header}>Welkom bij Padel</Text>
            <Text style={styles.subHeader}>Maak een account aan om verder te gaan</Text>

            <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Voornaam</Text>
            <TextInput
                placeholder="Voornaam"
                value={firstName}
                onChangeText={setFirstName}
                style={styles.input}
                autoCapitalize="words"
            />
            <Text style={styles.inputLabel}>Achternaam</Text>
            <TextInput
                placeholder="Achternaam"
                value={lastName}
                onChangeText={setLastName}
                style={styles.input}
                autoCapitalize="words"
            />
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
            />
            <Text style={styles.inputLabel}>Wachtwoord</Text>
            <TextInput
                placeholder="Wachtwoord"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                secureTextEntry
            />
            </View>

            <TouchableOpacity style={styles.button} onPress={handleRegister}>
            <Text style={styles.buttonText}>Registreer</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.outlineButton} onPress={() => router.replace('/login')}>
            <Text style={styles.outlineButtonText}>Ik heb al een account</Text>
            </TouchableOpacity>
        </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  inner: {
    padding: 24,
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subHeader: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 16,
    color: '#1A1A1A',
    marginBottom: 8,
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  outlineButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  outlineButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});