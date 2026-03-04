import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, Image, Modal, TouchableWithoutFeedback, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '@/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserData } from './types';

export default function EditProfileScreen() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [initials, setInitials] = useState('');
  const [profilePic, setProfilePic] = useState<string | null>(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<UserData['gender']>();
  const [birthDate, setBirthDate] = useState<Date | undefined>(undefined);
  const [description, setDescription] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isGenderSheetVisible, setIsGenderSheetVisible] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        const docRef = doc(db, "users", auth.currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as UserData;
          setUserData(data);

          setFullName(`${data.firstName} ${data.lastName}`);
          // setEmail(data.email); // Het 'userData' state-object bevat nu de email
          setGender(data.gender || 'Zeg ik liever niet');
          setDescription(data.description || '');
          if (data.birthDate) {
            setBirthDate(new Date(data.birthDate));
          }

          const firstInitial = data.firstName?.[0] || '';
          const lastInitial = data.lastName?.[0] || '';
          setInitials(`${firstInitial}${lastInitial}`.toUpperCase());
          if (data.profilePictureUrl) {
            setProfilePic(data.profilePictureUrl);
          }
        } else {
          console.log("User document not found!");
        }
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    if (!userData) return;

    const initialFullName = `${userData.firstName} ${userData.lastName}`;
    const initialBirthDate = userData.birthDate ? new Date(userData.birthDate).getTime() : undefined;
    const currentBirthDate = birthDate ? birthDate.getTime() : undefined;

    const hasChanged =
        fullName !== initialFullName ||
        gender !== (userData.gender || 'Zeg ik liever niet') ||
        description !== (userData.description || '') ||
        currentBirthDate !== initialBirthDate;

    setIsModified(hasChanged);

  }, [fullName, gender, birthDate, description, userData]);


  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'set' && selectedDate) {
      setBirthDate(selectedDate);
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser || !isModified || isSaving) return;

    setIsSaving(true);

    const nameParts = fullName.split(' ');
    const firstName = nameParts.shift() || '';
    const lastName = nameParts.join(' ');

    const updatedData: Partial<UserData> = {
        firstName,
        lastName,
        gender,
        description,
        birthDate: birthDate ? birthDate.toISOString() : '',
    };

    try {
        const docRef = doc(db, "users", auth.currentUser.uid);
        await updateDoc(docRef, updatedData);
        Alert.alert("Succes", "Je profiel is bijgewerkt.");
        setIsModified(false);
    } catch (error) {
        console.error("Error updating document: ", error);
        Alert.alert("Fout", "Er is iets misgegaan bij het opslaan van je profiel.");
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
        <Text style={styles.headerTitle}>Profiel bewerken</Text>
        {isModified && (
            <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={isSaving}>
                <Text style={styles.saveButtonText}>{isSaving ? 'Opslaan...' : 'Opslaan'}</Text>
            </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContentContainer}>

        <View style={styles.profilePicSection}>
        <View style={styles.avatar}>
            {profilePic ? (
                <Image source={{ uri: profilePic }} style={styles.avatarImage} />
            ) : (
                <Text style={styles.avatarInitials}>{initials}</Text>
            )}
        </View>
        <TouchableOpacity>
          <Text style={styles.changePicText}>Profielfoto wijzigen</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Persoonlijke informatie</Text>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Naam en achternaam</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Naam en achternaam"
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, styles.disabledInput]}
            value={userData?.email || ''}
            keyboardType="email-address"
            placeholder="Email"
            editable={false}
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Geslacht</Text>
          <TouchableOpacity onPress={() => setIsGenderSheetVisible(true)} style={styles.dateInputContainer}>
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: 'transparent', paddingRight: 0 }]}
              placeholder="Selecteer geslacht"
              value={gender === 'Man' ? 'Mannelijk' : gender === 'Vrouw' ? 'Vrouwelijk' : (gender || '')}
              editable={false}
              pointerEvents="none"
            />
            <Ionicons name="chevron-down" size={20} color="gray" style={styles.calendarIcon} />
          </TouchableOpacity>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Geboortedatum</Text>
          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateInputContainer}>
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: 'transparent', paddingRight: 0 }]}
                placeholder="Geen waarde"
                value={birthDate ? birthDate.toLocaleDateString('nl-BE') : ''}
                editable={false}
                pointerEvents="none"
              />
              <Ionicons name="calendar-outline" size={24} color="gray" style={styles.calendarIcon} />
          </TouchableOpacity>
          {showDatePicker && (
            <>
              {Platform.OS === 'android' ? (
                <DateTimePicker
                  value={birthDate || new Date()}
                  mode="date"
                  display="calendar"
                  onChange={onDateChange}
                />
              ) : (
                <Modal
                  transparent={true}
                  animationType="slide"
                  visible={showDatePicker}
                  onRequestClose={() => setShowDatePicker(false)}
                >
                  <TouchableWithoutFeedback onPress={() => setShowDatePicker(false)}>
                    <View style={styles.modalOverlay}>
                      <TouchableWithoutFeedback>
                        <View style={styles.datePickerIOSContainer}>
                          <DateTimePicker
                            value={birthDate || new Date()}
                            mode="date"
                            display="inline"
                            onChange={onDateChange}
                          />
                        </View>
                      </TouchableWithoutFeedback>
                    </View>
                  </TouchableWithoutFeedback>
                </Modal>
              )}
            </>
          )}
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Beschrijving</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Geen waarde"
            multiline
            maxLength={160}
          />
          <Text style={styles.charCounter}>{160 - (description?.length || 0)} tekens over</Text>
        </View>
      </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isGenderSheetVisible}
        onRequestClose={() => setIsGenderSheetVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsGenderSheetVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.bottomSheetContainer}>
                <View style={styles.dragHandle} />
                <Text style={styles.bottomSheetTitle}>Kies je geslacht</Text>
                {['Mannelijk', 'Vrouwelijk', 'Zeg ik liever niet'].map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={styles.optionButton}
                    onPress={() => {
                      let valueToSet: UserData['gender'] = 'Zeg ik liever niet';
                      if (option === 'Mannelijk') {
                        valueToSet = 'Man';
                      } else if (option === 'Vrouwelijk') {
                        valueToSet = 'Vrouw';
                      }
                      setGender(valueToSet);
                      setIsGenderSheetVisible(false);
                    }}
                  >
                    <Text style={styles.optionText}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContentContainer: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    justifyContent: 'center',
    position: 'relative',
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
  profilePicSection: {
    alignItems: 'center',
    marginVertical: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3c4043',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
  },
  changePicText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  formSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#0e2432',
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: 'gray',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f6f6f6',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f6f6f6',
    borderRadius: 10,
  },
  disabledInput: {
    backgroundColor: '#e9e9e9',
    color: '#a1a1a1',
  },
  calendarIcon: {
    paddingHorizontal: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  charCounter: {
    textAlign: 'right',
    color: '#c7c7cd',
    fontSize: 12,
    marginTop: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#ccc',
    borderRadius: 3,
    alignSelf: 'center',
    marginVertical: 10,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#0e2432',
  },
  optionButton: {
    paddingVertical: 15,
  },
  optionText: {
    fontSize: 16,
    color: '#0e2432',
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
