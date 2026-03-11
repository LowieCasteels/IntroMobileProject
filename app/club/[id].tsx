import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ImageBackground, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig'; // Adjusted import path
import { Club, Court } from '../types'; // Adjusted import path and added Court
import { collection, getDocs } from 'firebase/firestore';

const getNext7Days = () => {
    const days = ['ZO', 'MA', 'DI', 'WO', 'DO', 'VR', 'ZA'];
    const months = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
    let result = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        result.push({
            day: days[d.getDay()],
            date: d.getDate(),
            month: months[d.getMonth()],
        });
    }
    return result;
};

const availableTimes = ['16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '22:30', '23:00'];

const CourtAccordionItem = ({ court, isExpanded, onToggle }: { court: Court, isExpanded: boolean, onToggle: () => void }) => {
    const features = `${court.type === 'indoor' ? 'Binnen' : 'Buiten'} | Glas | Dubbelspel`;
    return (
        <View style={styles.courtContainer}>
            <TouchableOpacity style={styles.courtHeader} onPress={onToggle} activeOpacity={0.7}>
                <View>
                    <Text style={styles.courtTitle}>{court.name}</Text>
                    <Text style={styles.courtFeatures}>{features}</Text>
                </View>
                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={24} color="gray" />
            </TouchableOpacity>
            {isExpanded && (
                <View style={styles.courtBody}>
                    <TouchableOpacity style={styles.bookingCard} activeOpacity={0.8}><Text style={styles.bookingPrice}>€ 42</Text><Text style={styles.bookingDuration}>90 min</Text></TouchableOpacity>
                </View>
            )}
        </View>
    );
};

export default function ClubDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [club, setClub] = useState<Club | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(0);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [showAvailable, setShowAvailable] = useState(false);
    const [courts, setCourts] = useState<Court[]>([]);
    const [expandedCourtId, setExpandedCourtId] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;

        const fetchClubAndCourts = async () => {
            setLoading(true);
            try {
                // Fetch club document
                const clubRef = doc(db, 'clubs', id);
                const clubSnap = await getDoc(clubRef);

                if (clubSnap.exists()) {
                    setClub({ id: clubSnap.id, ...clubSnap.data() } as Club);

                    // Fetch courts subcollection
                    const courtsRef = collection(db, 'clubs', id, 'courts');
                    const courtsSnap = await getDocs(courtsRef);
                    const courtsList = courtsSnap.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    } as Court));
                    setCourts(courtsList);
                } else {
                    console.log("No such document!");
                }
            } catch (error) {
                console.error("Error fetching club details: ", error);
            } finally {
                setLoading(false);
            }
        };

        fetchClubAndCourts();
    }, [id]);

    if (loading) {
        return <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />;
    }

    if (!club) {
        return (
            <SafeAreaView style={styles.container}>
                <Text>Club niet gevonden.</Text>
            </SafeAreaView>
        );
    }

    const dates = getNext7Days();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color="#0e2432" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{club.name}</Text>
                <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="share-outline" size={24} color="#0e2432" />
                </TouchableOpacity>
            </View>
            <ScrollView>
                <ImageBackground source={{ uri: club.imageUrl }} style={styles.heroImage}>
                </ImageBackground>

                <View style={styles.infoContainer}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.clubTitle}>{club.name}</Text>
                        <TouchableOpacity>
                            <Ionicons name="heart-outline" size={28} color="#0e2432" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.clubAddress}>{`${club.address.street}, ${club.address.city}`}</Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContainer}>
                    <TouchableOpacity style={[styles.tab, styles.activeTab]}><Text style={[styles.tabText, styles.activeTabText]}>Reserveren</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.tab}><Text style={styles.tabText}>Home</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.tab}><Text style={styles.tabText}>Open Matches</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.tab}><Text style={styles.tabText}>Competitie</Text></TouchableOpacity>
                </ScrollView>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateCarousel}>
                    {dates.map((date, index) => (
                        <TouchableOpacity key={index} style={[styles.dateItem, selectedDate === index && styles.selectedDateItem]} onPress={() => setSelectedDate(index)}>
                            <Text style={[styles.dateDay, selectedDate === index && styles.selectedDateText]}>{date.day}</Text>
                            <Text style={[styles.dateDate, selectedDate === index && styles.selectedDateText]}>{date.date} {date.month}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <View style={styles.timeSlotSection}>
                    <View style={styles.filterContainer}>
                        <Text>Toon alleen beschikbare slots</Text>
                        <Switch value={showAvailable} onValueChange={setShowAvailable} trackColor={{ false: "#767577", true: "#81b0ff" }} thumbColor={showAvailable ? "#007AFF" : "#f4f3f4"} />
                    </View>
                    <View style={styles.timeSlotsGrid}>
                        {availableTimes.map((time) => (
                            <TouchableOpacity key={time} style={[styles.timeSlot, selectedTime === time && styles.selectedTimeSlot]} onPress={() => setSelectedTime(time)}>
                                <Text style={[styles.timeSlotText, selectedTime === time && styles.selectedTimeSlotText]}>{time}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.courtsSection}>
                    {courts.map((court) => (
                        <CourtAccordionItem
                            key={court.id}
                            court={court}
                            isExpanded={expandedCourtId === court.id}
                            onToggle={() => {
                                setExpandedCourtId(prevId => (prevId === court.id ? null : court.id));
                            }}
                        />
                    ))}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
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
        marginHorizontal: 50,
    },
    actionButton: {
        position: 'absolute',
        right: 15,
        padding: 5,
    },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    heroImage: { width: '100%', height: 250 },
    infoContainer: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
    titleContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    clubTitle: { fontSize: 24, fontWeight: 'bold', color: '#0e2432' },
    clubAddress: { fontSize: 16, color: 'gray' },
    tabContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
    tab: { paddingHorizontal: 15, paddingVertical: 8, marginRight: 10, borderRadius: 20, backgroundColor: '#f0f0f0' },
    activeTab: { backgroundColor: '#e8f0fe' },
    tabText: { fontSize: 14, fontWeight: '600', color: '#0e2432' },
    activeTabText: { color: '#007AFF' },
    dateCarousel: { paddingHorizontal: 20, paddingVertical: 15 },
    dateItem: { alignItems: 'center', backgroundColor: '#f0f0f0', borderRadius: 10, padding: 15, marginRight: 10, minWidth: 80 },
    selectedDateItem: { backgroundColor: '#0e2432' },
    dateDay: { fontSize: 14, fontWeight: 'bold', color: '#0e2432' },
    dateDate: { fontSize: 14, color: 'gray' },
    selectedDateText: { color: '#fff' },
    timeSlotSection: { padding: 20, backgroundColor: '#f8f8f8' },
    filterContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    timeSlotsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    timeSlot: {
        width: '31%',
        backgroundColor: '#fff',
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#eee'
    },
    selectedTimeSlot: { backgroundColor: '#0e2432', borderColor: '#0e2432' },
    timeSlotText: { fontSize: 16, fontWeight: '600', color: '#0e2432' },
    selectedTimeSlotText: { color: '#fff' },
    courtsSection: {
        padding: 20,
    },
    courtContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#eee',
        overflow: 'hidden',
    },
    courtHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
    },
    courtTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0e2432',
    },
    courtFeatures: {
        fontSize: 14,
        color: 'gray',
        marginTop: 4,
    },
    courtBody: {
        paddingHorizontal: 15,
        paddingBottom: 15,
    },
    bookingCard: {
        backgroundColor: '#007AFF',
        borderRadius: 10,
        padding: 20,
        alignItems: 'center',
    },
    bookingPrice: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
    },
    bookingDuration: {
        color: '#fff',
        fontSize: 14,
        marginTop: 4,
    },
});