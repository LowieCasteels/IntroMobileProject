import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, Image, Modal, TouchableWithoutFeedback, Alert, KeyboardAvoidingView, Animated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '@/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserData } from './types';
import * as ImagePicker from 'expo-image-picker';

export default function EditProfileScreen() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [initials, setInitials] = useState('');
  const [profilePic, setProfilePic] = useState<string | undefined>();

  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<UserData['gender']>();
  const [birthDate, setBirthDate] = useState<Date | undefined>(undefined);
  const [description, setDescription] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isGenderSheetVisible, setIsGenderSheetVisible] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [besteHand, setBesteHand] = useState<UserData['beste_hand']>();
  const [baanpositie, setBaanpositie] = useState<UserData['baanpositie']>();
  const [typePartij, setTypePartij] = useState<UserData['type_partij']>();
  const [favorieteTijd, setFavorieteTijd] = useState<UserData['favoriete_tijd']>();

  const [showBesteHandSheet, setShowBesteHandSheet] = useState(false);
  const [showBaanpositieSheet, setShowBaanpositieSheet] = useState(false);
  const [showTypePartijSheet, setShowTypePartijSheet] = useState(false);
  const [showFavorieteTijdSheet, setShowFavorieteTijdSheet] = useState(false);

  const bottomSheetAnim = React.useRef(new Animated.Value(Dimensions.get('window').height)).current;

  const openSheet = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    setter(true);
    Animated.timing(bottomSheetAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
    }).start();
  };

  const closeSheet = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    Animated.timing(bottomSheetAnim, {
        toValue: Dimensions.get('window').height,
        duration: 250,
        useNativeDriver: true,
    }).start(() => {
        setter(false);
        bottomSheetAnim.setValue(Dimensions.get('window').height);
    });
  };
  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        const docRef = doc(db, "users", auth.currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as UserData;
          setUserData(data);

          setFullName(`${data.firstName} ${data.lastName}`);
          setGender(data.gender || 'Zeg ik liever niet');
          setDescription(data.description || '');
          if (data.birthDate) {
            setBirthDate(new Date(data.birthDate));
          }
          setBesteHand(data.beste_hand);
          setBaanpositie(data.baanpositie);
          setTypePartij(data.type_partij);
          setFavorieteTijd(data.favoriete_tijd);

          const firstInitial = data.firstName?.[0] || '';
          const lastInitial = data.lastName?.[0] || '';
          setInitials(`${firstInitial}${lastInitial}`.toUpperCase());
          setProfilePic(data.profilePictureUrl);
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
        currentBirthDate !== initialBirthDate ||
        besteHand !== userData.beste_hand ||
        baanpositie !== userData.baanpositie ||
        typePartij !== userData.type_partij ||
        favorieteTijd !== userData.favoriete_tijd ||
        profilePic !== userData.profilePictureUrl;

    setIsModified(hasChanged);

  }, [fullName, gender, birthDate, description, userData, besteHand, baanpositie, typePartij, favorieteTijd, profilePic]);


  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'set' && selectedDate) {
      setBirthDate(selectedDate);
    }
  };

  const handleImagePick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert('Toestemming vereist', 'Sorry, we hebben toegang tot je foto\'s nodig om dit te laten werken!');
        return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
        const asset = result.assets[0];
        const dataUri = `data:${asset.mimeType};base64,${asset.base64}`;
        setProfilePic(dataUri);
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
        beste_hand: besteHand || '',
        baanpositie: baanpositie || '',
        type_partij: typePartij || '',
        favoriete_tijd: favorieteTijd || '',
        profilePictureUrl: profilePic ?? '',
    };

    try {
        if (profilePic && profilePic.length > 750000) {
            Alert.alert("Afbeelding te groot", "De geselecteerde afbeelding is te groot. Kies een kleinere afbeelding of verlaag de kwaliteit.");
            setIsSaving(false);
            return;
        }

        const docRef = doc(db, "users", auth.currentUser.uid);
        await updateDoc(docRef, updatedData);
        setUserData(prev => ({ ...prev, ...updatedData } as UserData));
        Alert.alert("Succes", "Je profiel is bijgewerkt.");
        setIsModified(false);
    } catch (error: any) {
        console.error("Error updating document: ", error);
        const errorMessage = error.code === 'invalid-argument'
            ? "De afbeelding is te groot om op te slaan."
            : "Er is iets misgegaan bij het opslaan van je profiel.";
        Alert.alert("Fout", errorMessage);
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
        <TouchableOpacity onPress={handleImagePick}>
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
          <TouchableOpacity onPress={() => openSheet(setIsGenderSheetVisible)} style={styles.dateInputContainer}>
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
          <TouchableOpacity onPress={() => openSheet(setShowDatePicker)} style={styles.dateInputContainer}>
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
                  animationType="fade"
                  visible={showDatePicker}
                  onRequestClose={() => closeSheet(setShowDatePicker)}
                >
                  <TouchableWithoutFeedback onPress={() => closeSheet(setShowDatePicker)}>
                    <View style={styles.modalOverlay}>
                      <Animated.View style={[styles.datePickerIOSContainer, { transform: [{ translateY: bottomSheetAnim }] }]}>
                        <TouchableWithoutFeedback>
                          <View>
                            <DateTimePicker
                              value={birthDate || new Date()}
                              mode="date"
                              display="inline"
                              onChange={onDateChange}
                            />
                          </View>
                        </TouchableWithoutFeedback>
                      </Animated.View>
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

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Voorkeuren van de speler</Text>

        {/* Beste Hand */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Beste hand</Text>
          <TouchableOpacity onPress={() => openSheet(setShowBesteHandSheet)} style={styles.dateInputContainer}>
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: 'transparent', paddingRight: 0 }]}
              placeholder="Selecteer"
              value={besteHand || ''}
              editable={false}
              pointerEvents="none"
            />
            <Ionicons name="chevron-down" size={20} color="gray" style={styles.calendarIcon} />
          </TouchableOpacity>
        </View>

        {/* Baanpositie */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Baanpositie</Text>
          <TouchableOpacity onPress={() => openSheet(setShowBaanpositieSheet)} style={styles.dateInputContainer}>
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: 'transparent', paddingRight: 0 }]}
              placeholder="Selecteer"
              value={baanpositie || ''}
              editable={false}
              pointerEvents="none"
            />
            <Ionicons name="chevron-down" size={20} color="gray" style={styles.calendarIcon} />
          </TouchableOpacity>
        </View>

        {/* Type Partij */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Type partij</Text>
          <TouchableOpacity onPress={() => openSheet(setShowTypePartijSheet)} style={styles.dateInputContainer}>
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: 'transparent', paddingRight: 0 }]}
              placeholder="Selecteer"
              value={typePartij || ''}
              editable={false}
              pointerEvents="none"
            />
            <Ionicons name="chevron-down" size={20} color="gray" style={styles.calendarIcon} />
          </TouchableOpacity>
        </View>

        {/* Favoriete Tijd */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Favoriete tijd om te spelen</Text>
          <TouchableOpacity onPress={() => openSheet(setShowFavorieteTijdSheet)} style={styles.dateInputContainer}>
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: 'transparent', paddingRight: 0 }]}
              placeholder="Selecteer"
              value={favorieteTijd || ''}
              editable={false}
              pointerEvents="none"
            />
            <Ionicons name="chevron-down" size={20} color="gray" style={styles.calendarIcon} />
          </TouchableOpacity>
        </View>
      </View>
      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={isGenderSheetVisible}
        onRequestClose={() => closeSheet(setIsGenderSheetVisible)}
      >
        <TouchableWithoutFeedback onPress={() => closeSheet(setIsGenderSheetVisible)}>
          <View style={styles.modalOverlay}>
            <Animated.View style={[styles.bottomSheetContainer, { transform: [{ translateY: bottomSheetAnim }] }]}>
              <TouchableWithoutFeedback>
                <View>
                  <View style={styles.dragHandle} />
                  <Text style={styles.bottomSheetTitle}>Kies je geslacht</Text>
                  {['Mannelijk', 'Vrouwelijk', 'Zeg ik liever niet'].map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={styles.optionButton}
                      onPress={() => {
                        let valueToSet: UserData['gender'] = 'Zeg ik liever niet';
                        if (option === 'Mannelijk') valueToSet = 'Man';
                        else if (option === 'Vrouwelijk') valueToSet = 'Vrouw';
                        setGender(valueToSet);
                        closeSheet(setIsGenderSheetVisible);
                      }}
                    >
                      <Text style={styles.optionText}>{option}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableWithoutFeedback>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Beste Hand Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showBesteHandSheet}
        onRequestClose={() => closeSheet(setShowBesteHandSheet)}
      >
        <TouchableWithoutFeedback onPress={() => closeSheet(setShowBesteHandSheet)}>
          <View style={styles.modalOverlay}>
            <Animated.View style={[styles.bottomSheetContainer, { transform: [{ translateY: bottomSheetAnim }] }]}>
              <TouchableWithoutFeedback>
                <View>
                  <View style={styles.dragHandle} />
                  <Text style={styles.bottomSheetTitle}>Kies je beste hand</Text>
                  {['Rechtshandig', 'Linkshandig'].map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={styles.optionButton}
                      onPress={() => {
                        setBesteHand(option as UserData['beste_hand']);
                        closeSheet(setShowBesteHandSheet);
                      }}
                    >
                      <Text style={styles.optionText}>{option}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableWithoutFeedback>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Baanpositie Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showBaanpositieSheet}
        onRequestClose={() => closeSheet(setShowBaanpositieSheet)}
      >
        <TouchableWithoutFeedback onPress={() => closeSheet(setShowBaanpositieSheet)}>
          <View style={styles.modalOverlay}>
            <Animated.View style={[styles.bottomSheetContainer, { transform: [{ translateY: bottomSheetAnim }] }]}>
              <TouchableWithoutFeedback>
                <View>
                  <View style={styles.dragHandle} />
                  <Text style={styles.bottomSheetTitle}>Kies je baanpositie</Text>
                  {['Links', 'Rechts', 'Beide'].map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={styles.optionButton}
                      onPress={() => {
                        setBaanpositie(option as UserData['baanpositie']);
                        closeSheet(setShowBaanpositieSheet);
                      }}
                    >
                      <Text style={styles.optionText}>{option}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableWithoutFeedback>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Type Partij Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showTypePartijSheet}
        onRequestClose={() => closeSheet(setShowTypePartijSheet)}
      >
        <TouchableWithoutFeedback onPress={() => closeSheet(setShowTypePartijSheet)}>
          <View style={styles.modalOverlay}>
            <Animated.View style={[styles.bottomSheetContainer, { transform: [{ translateY: bottomSheetAnim }] }]}>
              <TouchableWithoutFeedback>
                <View>
                  <View style={styles.dragHandle} />
                  <Text style={styles.bottomSheetTitle}>Kies je type partij</Text>
                  {['Enkel', 'Dubbel', 'Competitief'].map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={styles.optionButton}
                      onPress={() => {
                        setTypePartij(option as UserData['type_partij']);
                        closeSheet(setShowTypePartijSheet);
                      }}
                    >
                      <Text style={styles.optionText}>{option}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableWithoutFeedback>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Favoriete Tijd Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showFavorieteTijdSheet}
        onRequestClose={() => closeSheet(setShowFavorieteTijdSheet)}
      >
        <TouchableWithoutFeedback onPress={() => closeSheet(setShowFavorieteTijdSheet)}>
          <View style={styles.modalOverlay}>
            <Animated.View style={[styles.bottomSheetContainer, { transform: [{ translateY: bottomSheetAnim }] }]}>
              <TouchableWithoutFeedback>
                <View>
                  <View style={styles.dragHandle} />
                  <Text style={styles.bottomSheetTitle}>Kies je favoriete speeltijd</Text>
                  {['Ochtend', 'Avond', 'Weekend'].map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={styles.optionButton}
                      onPress={() => {
                        setFavorieteTijd(option as UserData['favoriete_tijd']);
                        closeSheet(setShowFavorieteTijdSheet);
                      }}
                    >
                      <Text style={styles.optionText}>{option}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableWithoutFeedback>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      </SafeAreaView>
    </KeyboardAvoidingView>
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
