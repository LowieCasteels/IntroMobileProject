import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    return (
        <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
        >
        <View style={styles.inner}>
            <Text style={styles.header}>Welkom terug</Text>
            <Text style={styles.subHeader}>Log in om verder te gaan</Text>

            <View style={styles.inputContainer}>
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

            <TouchableOpacity style={styles.button} onPress={() => console.log('Login geprobeerd')}>
            <Text style={styles.buttonText}>Inloggen</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.outlineButton} onPress={() => router.push('/register')}>
            <Text style={styles.outlineButtonText}>Account aanmaken</Text>
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
    backgroundColor: '#007AFF', // Apple Blauw
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