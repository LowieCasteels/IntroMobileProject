import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, Image, KeyboardAvoidingView, Platform, Modal, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // Keep SafeAreaView inside KeyboardAvoidingView
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, GeoPoint } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Court, ClubTimeSlot } from './types';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

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
  const [timeSlots, setTimeSlots] = useState<{ time: string; duration: string; price: string; }[]>([
    { time: '16:00', duration: '90', price: '42' }
  ]);
  const [pickerState, setPickerState] = useState<{
    show: boolean;
    index: number | null;
  }>({ show: false, index: null });

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

  const addDefaultCourts = async (clubId: string) => {
    const courts: Omit<Court, 'id'>[] = [
        { name: 'Court 1', type: 'indoor', surface: 'kunstgras' },
        { name: 'Court 2 | Pepsi Max', type: 'indoor', surface: 'kunstgras' },
        { name: 'Court 3', type: 'outdoor', surface: 'hardcourt' },
    ];

    for (const courtData of courts) {
        const courtColRef = collection(db, 'clubs', clubId, 'courts');
        await addDoc(courtColRef, courtData);
    }
  };

  const handleTimeSlotChange = (index: number, field: 'time' | 'duration' | 'price', value: string) => {
    const newTimeSlots = [...timeSlots];
    newTimeSlots[index][field] = value;
    setTimeSlots(newTimeSlots);
  };

  const handleAddTimeSlot = () => {
    setTimeSlots([...timeSlots, { time: '', duration: '90', price: '' }]);
  };

  const handleRemoveTimeSlot = (index: number) => {
    if (timeSlots.length > 1) {
        const newTimeSlots = timeSlots.filter((_, i) => i !== index);
        setTimeSlots(newTimeSlots);
    } else {
        Alert.alert("Fout", "Er moet minimaal één tijdslot zijn.");
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    const currentIndex = pickerState.index;
    // Altijd sluiten op Android, of bij 'dismiss'
    if (Platform.OS === 'android' || event.type === 'dismissed') {
      setPickerState({ show: false, index: null });
    }

    if (event.type === 'set' && selectedTime && currentIndex !== null) {
      const formattedTime = selectedTime.toLocaleTimeString('nl-BE', {
        hour: '2-digit',
        minute: '2-digit',
      }).replace('.', ':'); // Zorgt voor HH:MM formaat
      handleTimeSlotChange(currentIndex, 'time', formattedTime);
      // Op iOS moeten we de modal handmatig sluiten na selectie
      if (Platform.OS === 'ios') {
        setPickerState({ show: false, index: null });
      }
    }
  };

  const showTimePicker = (index: number) => setPickerState({ show: true, index });

  const getCurrentTimeForPicker = () => {
    if (pickerState.index !== null) {
        const timeString = timeSlots[pickerState.index].time;
        const [hours, minutes] = timeString.split(':').map(Number);
        if (!isNaN(hours) && !isNaN(minutes)) { const date = new Date(); date.setHours(hours, minutes); return date; }
    }
    return new Date();
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

      const docRef = await addDoc(collection(db, 'clubs'), newClub);

      // Save dynamic time slots
      for (const slot of timeSlots) {
        const duration = parseInt(slot.duration, 10);
        const price = parseFloat(slot.price);

        if (slot.time && !isNaN(duration) && !isNaN(price) && duration > 0 && price >= 0) {
            const newSlotData: Omit<ClubTimeSlot, 'id'> = {
                time: slot.time,
                duration: duration,
                price: price,
            };
            await addDoc(collection(db, 'clubs', docRef.id, 'timeSlots'), newSlotData);
        }
      }
      // Automatically add some default courts for testing
      await addDefaultCourts(docRef.id);

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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
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

          <View style={styles.timeSlotsSection}>
              <Text style={styles.sectionTitle}>Tijdsloten</Text>
              {timeSlots.map((slot, index) => (
                  <View key={index} style={styles.timeSlotRow}>
                      <TouchableOpacity onPress={() => showTimePicker(index)} style={[styles.timeSlotInput, styles.timePickerButton, { flex: 2 }]}>
                          <Text style={slot.time ? styles.timeSlotTextValue : styles.timeSlotTextPlaceholder}>
                              {slot.time || 'Tijd (HH:MM)'}
                          </Text>
                          <Ionicons name="time-outline" size={20} color="gray" />
                      </TouchableOpacity>
                      <TextInput style={[styles.timeSlotInput, { flex: 1.5 }]} placeholder="Duur (min)" value={slot.duration} onChangeText={(text) => handleTimeSlotChange(index, 'duration', text)} keyboardType="numeric" />
                      <TextInput style={[styles.timeSlotInput, { flex: 1 }]} placeholder="Prijs (€)" value={slot.price} onChangeText={(text) => handleTimeSlotChange(index, 'price', text)} keyboardType="numeric" />
                      <TouchableOpacity onPress={() => handleRemoveTimeSlot(index)} style={styles.removeButton}>
                          <Ionicons name="trash-outline" size={24} color="#ff3b30" />
                      </TouchableOpacity>
                  </View>
              ))}
              <TouchableOpacity onPress={handleAddTimeSlot} style={styles.addButton}>
                  <Text style={styles.addButtonText}>Tijdslot Toevoegen</Text>
              </TouchableOpacity>
          </View>
        </ScrollView>
        {pickerState.show && (
            <>
              {Platform.OS === 'android' ? (
                <DateTimePicker
                  value={getCurrentTimeForPicker()}
                  mode="time"
                  is24Hour={true}
                  display="default"
                  onChange={onTimeChange}
                />
              ) : (
                <Modal
                  transparent={true}
                  animationType="slide"
                  visible={pickerState.show}
                  onRequestClose={() => setPickerState({ show: false, index: null })}
                >
                  <TouchableWithoutFeedback onPress={() => setPickerState({ show: false, index: null })}>
                    <View style={styles.modalOverlay}>
                      <TouchableWithoutFeedback>
                        <View style={styles.datePickerIOSContainer}>
                          <DateTimePicker
                            value={getCurrentTimeForPicker()}
                            mode="time"
                            is24Hour={true}
                            display="spinner"
                            onChange={onTimeChange}
                          />
                        </View>
                      </TouchableWithoutFeedback>
                    </View>
                  </TouchableWithoutFeedback>
                </Modal>
              )}
            </>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
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
  timeSlotsSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0e2432',
    marginBottom: 15,
  },
  timeSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  timeSlotInput: {
    backgroundColor: '#f6f6f6',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
  },
  timePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeSlotTextValue: {
    fontSize: 14,
  },
  timeSlotTextPlaceholder: {
    fontSize: 14,
    color: '#C7C7CD',
  },
  removeButton: {
    padding: 5,
  },
  addButton: {
    backgroundColor: '#e8f0fe',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  addButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerIOSContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    paddingTop: 20,
    alignItems: 'center',
  },
});