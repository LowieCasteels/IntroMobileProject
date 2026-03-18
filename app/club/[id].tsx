import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ImageBackground, ActivityIndicator, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, collection, getDocs, addDoc, query, where, Timestamp } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { Club, Court, Booking } from '../types';

const getNext7Days = () => {
    const days = ['MA', 'DI', 'WO', 'DO', 'VR', 'ZA', 'ZO'];
    const months = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
    let result = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        result.push({
            fullDate: d,
            day: days[d.getDay()],
            date: d.getDate(),
            month: months[d.getMonth()],
        });
    }
    return result;
};

const availableTimes = ['16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '22:30', '23:00'];

const CourtAccordionItem = ({ court, isExpanded, onToggle, onBook, isBookable, isAvailable }: { court: Court, isExpanded: boolean, onToggle: () => void, onBook: () => void, isBookable: boolean, isAvailable: boolean }) => {
    const features = `${court.type === 'indoor' ? 'Binnen' : 'Buiten'} | Glas | Dubbelspel`;
    return (
        <View style={[styles.courtContainer, !isAvailable && styles.disabledCourtContainer]}>
            <TouchableOpacity style={styles.courtHeader} onPress={onToggle} activeOpacity={0.7} disabled={!isAvailable}>
                <View>
                    <Text style={[styles.courtTitle, !isAvailable && styles.disabledText]}>{court.name}</Text>
                    <Text style={[styles.courtFeatures, !isAvailable && styles.disabledText]}>{features}</Text>
                </View>
                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={24} color={isAvailable ? "gray" : "#ccc"} />
            </TouchableOpacity>
            {isExpanded && isAvailable && (
                <View style={styles.courtBody}>
                    <TouchableOpacity style={[styles.bookingCard, !isBookable && styles.disabledBookingCard]} activeOpacity={0.8} onPress={onBook} disabled={!isBookable || !isAvailable}>
                        <Text style={styles.bookingPrice}>€ 42</Text><Text style={styles.bookingDuration}>90 min</Text>
                    </TouchableOpacity>
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
    const [isBooking, setIsBooking] = useState(false);
    const [displayableTimes, setDisplayableTimes] = useState<string[]>([]);
    const [loadingTimes, setLoadingTimes] = useState(true);
    const [bookingsForDay, setBookingsForDay] = useState<Booking[]>([]);
    const [availableCourts, setAvailableCourts] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!id) return;

        const fetchClubAndCourts = async () => {
            setLoading(true);
            try {
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

    const dates = useMemo(() => getNext7Days(), []);

    useEffect(() => {
        if (!id || courts.length === 0) {
            setDisplayableTimes(availableTimes);
            return;
        }
    
        const fetchAndFilterTimes = async () => {
            setLoadingTimes(true);
            try {
                const selectedDay = dates[selectedDate].fullDate;
                const dayStart = new Date(selectedDay);
                dayStart.setHours(0, 0, 0, 0);
                const dayEnd = new Date(selectedDay);
                dayEnd.setHours(23, 59, 59, 999);
    
                const bookingsRef = collection(db, 'bookings');
                const q = query(bookingsRef,
                    where('clubId', '==', id),
                    where('startTime', '>=', Timestamp.fromDate(dayStart)),
                    where('startTime', '<=', Timestamp.fromDate(dayEnd))
                );
    
                const querySnapshot = await getDocs(q);
                const dailyBookings = querySnapshot.docs.map(doc => doc.data() as Booking);
                setBookingsForDay(dailyBookings);
    
                const bookingsByCourt = new Map<string, Booking[]>();
                courts.forEach(c => bookingsByCourt.set(c.id, []));
                dailyBookings.forEach(b => {
                    if (bookingsByCourt.has(b.courtId)) {
                        bookingsByCourt.get(b.courtId)!.push(b);
                    }
                });
    
                const filteredTimes = availableTimes.filter(timeSlot => {
                    const [hours, minutes] = timeSlot.split(':').map(Number);
                    const slotDate = new Date(selectedDay);
                    slotDate.setHours(hours, minutes, 0, 0);
                    const slotStartTime = slotDate.getTime();
                    const slotEndTime = slotStartTime + 90 * 60000;
    
                    return courts.some(court => {
                        const courtBookings = bookingsByCourt.get(court.id) || [];
                        const isOverlapping = courtBookings.some(existingBooking => {
                            const existingStartTime = existingBooking.startTime.toMillis();
                            const existingEndTime = existingBooking.endTime.toMillis();
                            return slotStartTime < existingEndTime && slotEndTime > existingStartTime;
                        });
                        return !isOverlapping;
                    });
                });
    
                setDisplayableTimes(filteredTimes);
            } catch (error) {
                console.error("Error filtering time slots: ", error);
                setDisplayableTimes([]);
            } finally {
                setLoadingTimes(false);
            }
        };
    
        fetchAndFilterTimes();
    }, [id, courts, selectedDate, dates]);

    useEffect(() => {
        if (!selectedTime) {
            setAvailableCourts(new Set(courts.map(c => c.id)));
            return;
        }

        const [hours, minutes] = selectedTime.split(':').map(Number);
        const slotDate = new Date(dates[selectedDate].fullDate);
        slotDate.setHours(hours, minutes, 0, 0);
        const slotStartTime = slotDate.getTime();
        const slotEndTime = slotStartTime + 90 * 60000; // 90 min booking

        const availableCourtIds = new Set<string>();

        courts.forEach(court => {
            const courtBookings = bookingsForDay.filter(b => b.courtId === court.id);

            const isOverlapping = courtBookings.some(existingBooking => {
                const existingStartTime = existingBooking.startTime.toMillis();
                const existingEndTime = existingBooking.endTime.toMillis();
                return slotStartTime < existingEndTime && slotEndTime > existingStartTime;
            });

            if (!isOverlapping) {
                availableCourtIds.add(court.id);
            }
        });

        setAvailableCourts(availableCourtIds);

    }, [selectedTime, bookingsForDay, courts, selectedDate, dates]);

    const handleBookCourt = async (court: Court) => {
        const user = auth.currentUser;
        if (!user) {
            Alert.alert("Niet ingelogd", "Je moet ingelogd zijn om een baan te kunnen boeken.");
            return;
        }

        if (selectedTime === null) {
            Alert.alert("Geen tijd geselecteerd", "Selecteer alstublieft een tijdslot.");
            return;
        }

        if (isBooking) return;
        setIsBooking(true);

        try {
            const [hours, minutes] = selectedTime.split(':').map(Number);
            const bookingDate = new Date(dates[selectedDate].fullDate);
            bookingDate.setHours(hours, minutes, 0, 0);

            const startTime = Timestamp.fromDate(bookingDate);
            const endTime = Timestamp.fromMillis(bookingDate.getTime() + 90 * 60000);

            const dayStart = new Date(bookingDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(bookingDate);
            dayEnd.setHours(23, 59, 59, 999);

            const bookingsRef = collection(db, 'bookings');
            const q = query(bookingsRef,
                where('courtId', '==', court.id),
                where('startTime', '>=', Timestamp.fromDate(dayStart)),
                where('startTime', '<=', Timestamp.fromDate(dayEnd))
            );

            const querySnapshot = await getDocs(q);
            const newBookingStartTime = startTime.toMillis();
            const newBookingEndTime = endTime.toMillis();

            const isOverlapping = querySnapshot.docs.some(doc => {
                const existingBooking = doc.data() as Booking;
                const existingStartTime = existingBooking.startTime.toMillis();
                const existingEndTime = existingBooking.endTime.toMillis();
                return newBookingStartTime < existingEndTime && newBookingEndTime > existingStartTime;
            });

            if (isOverlapping) {
                Alert.alert("Niet beschikbaar", "Dit tijdslot is al geboekt. Kies een andere tijd.");
                return;
            }

            const newBooking: Omit<Booking, 'id'> = {
                clubId: id!, courtId: court.id, userId: user.uid, startTime, endTime,
            };
            await addDoc(collection(db, 'bookings'), newBooking);

            Alert.alert("Boeking succesvol!", `Je hebt ${court.name} geboekt op ${bookingDate.toLocaleDateString('nl-BE')} om ${selectedTime}.`,
                [{ text: "OK", onPress: () => router.back() }]
            );

        } catch (error) {
            console.error("Error booking court: ", error);
            Alert.alert("Fout", "Er is iets misgegaan bij het boeken van de baan.");
        } finally {
            setIsBooking(false);
        }
    };

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

    const handleDateChange = (index: number) => {
        setSelectedDate(index);
        setSelectedTime(null);
        setExpandedCourtId(null);
    };

    const handleTimeChange = (time: string) => {
        setSelectedTime(time);
        setExpandedCourtId(null);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color="#0e2432" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{club.name}</Text>
                <TouchableOpacity style={styles.actionButton} disabled={isBooking}>
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
                        <TouchableOpacity key={index} style={[styles.dateItem, selectedDate === index && styles.selectedDateItem]} onPress={() => handleDateChange(index)}>
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
                    {loadingTimes ? (
                        <ActivityIndicator size="small" color="#007AFF" style={{ height: 50 }} />
                    ) : (
                        <View style={styles.timeSlotsGrid}>
                            {displayableTimes.length > 0 ? displayableTimes.map((time) => (
                                <TouchableOpacity key={time} style={[styles.timeSlot, selectedTime === time && styles.selectedTimeSlot]} onPress={() => handleTimeChange(time)}>
                                    <Text style={[styles.timeSlotText, selectedTime === time && styles.selectedTimeSlotText]}>{time}</Text>
                                </TouchableOpacity>
                            )) : (
                                <Text style={styles.noSlotsText}>Geen beschikbare tijden voor deze dag.</Text>
                            )}
                        </View>
                    )}
                </View>

                <View style={styles.courtsSection}>
                    {courts.map((court) => {
                        const isAvailable = availableCourts.has(court.id);
                        return (
                            <CourtAccordionItem
                                key={court.id}
                                court={court}
                                isExpanded={expandedCourtId === court.id}
                                onToggle={() => {
                                    if (isAvailable) {
                                        setExpandedCourtId(prevId => (prevId === court.id ? null : court.id));
                                    }
                                }}
                                onBook={() => handleBookCourt(court)}
                                isBookable={!!selectedTime}
                                isAvailable={isAvailable}
                            />
                        );
                    })}
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
    disabledBookingCard: {
        backgroundColor: '#a9a9a9',
    },
    noSlotsText: {
        width: '100%',
        textAlign: 'center',
        color: 'gray',
    },
    disabledCourtContainer: {
        backgroundColor: '#f9f9f9',
        opacity: 0.7,
    },
    disabledText: {
        color: '#b0b0b0',
    },
});