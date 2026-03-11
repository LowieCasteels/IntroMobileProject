import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, GeoPoint } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import * as ImagePicker from 'expo-image-picker';

export default function AddClubScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [facilities, setFacilities] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleImagePick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert('Toestemming vereist', 'Sorry, we hebben toegang tot je foto\'s nodig om dit te laten werken!');
        return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.5,
        base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
        const asset = result.assets[0];
        const dataUri = `data:${asset.mimeType};base64,${asset.base64}`;
        setImageUrl(dataUri);
    }
  };

  const handleSave = async () => {
    if (!name || !minPrice) {
      Alert.alert('Fout', 'Vul minimaal naam en prijs in.');
      return;
    }
    setIsSaving(true);

    if (imageUrl && imageUrl.length > 750000) {
        Alert.alert("Afbeelding te groot", "De geselecteerde afbeelding is te groot. Kies een kleinere afbeelding of verlaag de kwaliteit.");
        setIsSaving(false);
        return;
    }

    try {
      const newClub = {
        name,
        imageUrl,
        minPrice: parseFloat(minPrice),
        address: {
          street,
          city,
          postalCode,
        },
        location: new GeoPoint(0, 0),
        facilities: facilities.split(',').map(f => f.trim()).filter(f => f),
      };

      await addDoc(collection(db, 'clubs'), newClub);

      Alert.alert('Succes', 'Club succesvol toegevoegd!');
      router.back();
    } catch (error: any) {
      console.error("Error adding club: ", error);
      const errorMessage = error.code === 'invalid-argument'
          ? "De afbeelding is te groot om op te slaan."
          : "Er is iets misgegaan bij het toevoegen van de club.";
      Alert.alert('Fout', errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#0e2432" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nieuwe Club Toevoegen</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={isSaving}>
          <Text style={styles.saveButtonText}>{isSaving ? 'Opslaan...' : 'Opslaan'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.formContainer}>
        <Text style={styles.label}>Naam</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="bv. Padelclub De Mep" />

        <Text style={styles.label}>Cover Afbeelding</Text>
        <TouchableOpacity style={styles.imagePicker} onPress={handleImagePick}>
            {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.coverImage} />
            ) : (
                <View style={styles.imagePlaceholder}>
                    <Ionicons name="camera" size={40} color="#ccc" />
                    <Text style={styles.imagePlaceholderText}>Kies een afbeelding</Text>
                </View>
            )}
        </TouchableOpacity>

        <Text style={styles.label}>Minimumprijs</Text>
        <TextInput style={styles.input} value={minPrice} onChangeText={setMinPrice} placeholder="bv. 25" keyboardType="numeric" />

        <Text style={styles.label}>Straat</Text>
        <TextInput style={styles.input} value={street} onChangeText={setStreet} placeholder="bv. Padelstraat 1" />

        <Text style={styles.label}>Stad</Text>
        <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="bv. Antwerpen" />

        <Text style={styles.label}>Postcode</Text>
        <TextInput style={styles.input} value={postalCode} onChangeText={setPostalCode} placeholder="bv. 2000" />

        <Text style={styles.label}>Faciliteiten (komma-gescheiden)</Text>
        <TextInput style={styles.input} value={facilities} onChangeText={setFacilities} placeholder="bv. indoor, bar, parking" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    justifyContent: 'center',
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    position: 'absolute',
    left: 15,
    padding: 5,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0e2432',
  },
  saveButton: {
    position: 'absolute',
    right: 15,
    padding: 5,
  },
  saveButtonText: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: '600',
  },
  formContainer: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    color: 'gray',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#f6f6f6',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
  },
  imagePicker: {
    width: '100%',
    height: 200,
    backgroundColor: '#f6f6f6',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: 8,
    color: '#aaa',
    fontSize: 16,
  },
});