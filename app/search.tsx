import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ImageBackground, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Club } from './types';

// Club Card Component
const ClubCard = ({ club }: { club: Club }) => (
  <View style={styles.card}>
    <ImageBackground source={{ uri: club.imageUrl }} style={styles.cardImage} imageStyle={{ borderRadius: 12 }}>
      <View style={styles.priceOverlay}>
        <Text style={styles.priceText}>Vanaf € {club.minPrice} per uur</Text>
      </View>
    </ImageBackground>
    <View style={styles.cardBody}>
      <Text style={styles.cardTitle}>{club.name}</Text>
      {/* TODO: Afstand berekenen op basis van de locatie van de gebruiker */}
      <Text style={styles.cardDistance}>{Math.floor(Math.random() * 10) + 1}km</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScrollView}>
        {/* TODO: Beschikbare tijden ophalen uit de 'bookings' collectie */}
        {['15:00', '15:30', '16:00', '16:30', '22:30', '23:00'].map((time, index) => (
          <TouchableOpacity key={index} style={styles.timeSlot}>
            <Text style={styles.timeText}>{time}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  </View>
);

export default function SearchScreen() {
  const router = useRouter();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const fetchClubs = async () => {
        setLoading(true);
        try {
          const clubsCollection = collection(db, 'clubs');
          const clubSnapshot = await getDocs(clubsCollection);
          const clubsList = clubSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Club));
          setClubs(clubsList);
        } catch (error) {
          console.error("Error fetching clubs: ", error);
        } finally {
          setLoading(false);
        }
      };
  
      fetchClubs();
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#0e2432" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Zoeken</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={20} color="gray" style={styles.searchIcon} />
        <TextInput
          placeholder="Zoek op club, stad, postcode..."
          style={styles.searchInput}
        />
      </View>

      {/* Filters
      <View style={styles.filterContainer}>
        <TouchableOpacity style={styles.settingsButton}>
          <Ionicons name="options-outline" size={24} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterText}>Sport: Padel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterText}>11 mrt</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterText}>00:00 - 23:59</Text>
        </TouchableOpacity>
      </View> */}

      {/* Results */}
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} />
      ) : (
        <ScrollView style={styles.resultsScrollView} contentContainerStyle={{ paddingBottom: 20 }}>
          {clubs.map(club => (
            <ClubCard key={club.id} club={club} />
          ))}
        </ScrollView>
      )}

      {/* Temporary button to add new clubs */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/add-club')}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    margin: 15,
    paddingHorizontal: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontSize: 16,
  },
  activityIndicator: {
    marginTop: 50,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 15,
    backgroundColor: '#fff',
  },
  settingsButton: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  resultsScrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 15,
    marginTop: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardImage: {
    width: '100%',
    height: 180,
    justifyContent: 'flex-end',
  },
  priceOverlay: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 8,
    position: 'absolute',
    bottom: 10,
    left: 10,
    borderRadius: 5,
  },
  priceText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardBody: {
    padding: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardDistance: {
    fontSize: 14,
    color: 'gray',
    marginTop: 4,
    marginBottom: 10,
  },
  timeScrollView: {
    marginHorizontal: -15,
    paddingHorizontal: 15,
  },
  timeSlot: {
    backgroundColor: '#e8f0fe',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    color: '#2F63FF',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 30,
    backgroundColor: '#007AFF',
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
  },
});
