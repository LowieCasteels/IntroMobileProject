import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ImageBackground, ActivityIndicator, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, collection, getDocs, addDoc, query, where, Timestamp, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { Club, Court, Booking, ClubTimeSlot } from '../types';

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

const CourtAccordionItem = ({ court, isExpanded, onToggle, onBook, isBookable, isAvailable, price, duration }: { court: Court, isExpanded: boolean, onToggle: () => void, onBook: () => void, isBookable: boolean, isAvailable: boolean, price: number | null, duration: number | null }) => {
    const features = `${court.type === 'indoor' ? 'Binnen' : 'Buiten'} | Glas | Dubbelspel`;
    const displayPrice = price !== null ? `€ ${price}` : 'N/A';
    const displayDuration = duration !== null ? `${duration} min` : 'N/A';
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
                    <TouchableOpacity style={[styles.bookingCard, !isBookable && styles.disabledBookingCard]} activeOpacity={0.8} onPress={onBook} disabled={!isBookable || !isAvailable || price === null || duration === null}>
                        <Text style={styles.bookingPrice}>{displayPrice}</Text>
                        <Text style={styles.bookingDuration}>{displayDuration}</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

export default function RescheduleScreen() {
    const router = useRouter();
    const { id: bookingId } = useLocalSearchParams<{ id: string }>();
    const [originalBooking, setOriginalBooking] = useState<Booking | null>(null);
    const [club, setClub] = useState<Club | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(0);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [courts, setCourts] = useState<Court[]>([]);
    const [expandedCourtId, setExpandedCourtId] = useState<string | null>(null);
    const [isRescheduling, setIsRescheduling] = useState(false);
    const [displayableTimes, setDisplayableTimes] = useState<string[]>([]);
    const [loadingTimes, setLoadingTimes] = useState(true);
    const [clubTimeSlots, setClubTimeSlots] = useState<ClubTimeSlot[]>([]);
    const [bookingsForDay, setBookingsForDay] = useState<Booking[]>([]);
    const [availableCourts, setAvailableCourts] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!bookingId) return;

        const fetchBookingAndClubData = async () => {
            setLoading(true);
            try {
                const bookingRef = doc(db, 'bookings', bookingId);
                const bookingSnap = await getDoc(bookingRef);

                if (!bookingSnap.exists()) {
                    Alert.alert("Fout", "Boeking niet gevonden.");
                    setLoading(false);
                    router.back();
                    return;
                }
                const bookingData = { id: bookingSnap.id, ...bookingSnap.data() } as Booking;
                setOriginalBooking(bookingData);

                const clubId = bookingData.clubId;
                const clubRef = doc(db, 'clubs', clubId);
                const clubSnap = await getDoc(clubRef);

                if (clubSnap.exists()) {
                    setClub({ id: clubSnap.id, ...clubSnap.data() } as Club);

                    const courtsRef = collection(db, 'clubs', clubId, 'courts');
                    const courtsSnap = await getDocs(courtsRef);
                    const courtsList = courtsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Court));
                    setCourts(courtsList);

                    const timeSlotsRef = collection(db, 'clubs', clubId, 'timeSlots');
                    const timeSlotsSnap = await getDocs(timeSlotsRef);
                    const timeSlotsList = timeSlotsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClubTimeSlot));
                    setClubTimeSlots(timeSlotsList.sort((a, b) => a.time.localeCompare(b.time)));
                } else {
                    Alert.alert("Fout", "Club niet gevonden.");
                    router.back();
                }
            } catch (error) {
                console.error("Error fetching data for reschedule: ", error);
                Alert.alert("Fout", "Kon de benodigde gegevens niet laden.");
                router.back();
            } finally {
                setLoading(false);
            }
        };

        fetchBookingAndClubData();
    }, [bookingId]);

    const dates = useMemo(() => getNext7Days(), []);

    useEffect(() => {
        if (!club || courts.length === 0) {
            setDisplayableTimes([]);
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
                    where('clubId', '==', club.id),
                    where('startTime', '>=', Timestamp.fromDate(dayStart)),
                    where('startTime', '<=', Timestamp.fromDate(dayEnd))
                );
    
                const querySnapshot = await getDocs(q);
                const dailyBookings = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
                setBookingsForDay(dailyBookings);
    
                const bookingsByCourt = new Map<string, Booking[]>();
                courts.forEach(c => bookingsByCourt.set(c.id, []));
                dailyBookings.forEach(b => {
                    if (b.id !== bookingId && bookingsByCourt.has(b.courtId)) {
                        bookingsByCourt.get(b.courtId)!.push(b);
                    }
                });
    
                const filteredTimes = clubTimeSlots.map(ts => ts.time).filter(timeSlot => {
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
    }, [club, courts, selectedDate, dates, clubTimeSlots, bookingId]);

    useEffect(() => {
        if (!selectedTime) {
            setAvailableCourts(new Set(courts.map(c => c.id)));
            return;
        }

        const [hours, minutes] = selectedTime.split(':').map(Number);
        const slotDate = new Date(dates[selectedDate].fullDate);
        slotDate.setHours(hours, minutes, 0, 0);
        const slotStartTime = slotDate.getTime();
        const slotEndTime = slotStartTime + 90 * 60000;

        const availableCourtIds = new Set<string>();

        courts.forEach(court => {
            const courtBookings = bookingsForDay.filter(b => b.courtId === court.id && b.id !== bookingId);

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

    }, [selectedTime, bookingsForDay, courts, selectedDate, dates, bookingId]);

    const handleReschedule = async (court: Court) => {
        const selectedTimeSlotObject = clubTimeSlots.find(ts => ts.time === selectedTime);
        if (!selectedTimeSlotObject || !bookingId) return;

        if (isRescheduling) return;
        setIsRescheduling(true);

        try {
            const [hours, minutes] = selectedTime!.split(':').map(Number);
            const bookingDate = new Date(dates[selectedDate].fullDate);
            bookingDate.setHours(hours, minutes, 0, 0);

            const newStartTime = Timestamp.fromDate(bookingDate);
            const newEndTime = Timestamp.fromMillis(bookingDate.getTime() + selectedTimeSlotObject.duration * 60000);

            // Final check for overlap, excluding the booking itself
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
            const newBookingStartTime = newStartTime.toMillis();
            const newBookingEndTime = newEndTime.toMillis();

            const isOverlapping = querySnapshot.docs
                .filter(doc => doc.id !== bookingId) // Exclude the current booking
                .some(doc => {
                    const existingBooking = doc.data() as Booking;
                    const existingStartTime = existingBooking.startTime.toMillis();
                    const existingEndTime = existingBooking.endTime.toMillis();
                    return newBookingStartTime < existingEndTime && newBookingEndTime > existingStartTime;
                });

            if (isOverlapping) {
                Alert.alert("Niet beschikbaar", "Dit tijdslot is al geboekt. Kies een andere tijd.");
                setIsRescheduling(false);
                return;
            }

            const bookingRef = doc(db, 'bookings', bookingId);
            await updateDoc(bookingRef, {
                startTime: newStartTime,
                endTime: newEndTime,
                courtId: court.id,
            });

            Alert.alert("Wijziging succesvol!", `Je boeking is verplaatst naar ${bookingDate.toLocaleDateString('nl-BE')} om ${selectedTime}.`,
                [{ text: "OK", onPress: () => router.back() }]
            );

        } catch (error) {
            console.error("Error rescheduling booking: ", error);
            Alert.alert("Fout", "Er is iets misgegaan bij het wijzigen van de boeking.");
        } finally {
            setIsRescheduling(false);
        }
    };

    if (loading || !club) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}><Text style={styles.headerTitle}>Reservering Wijzigen</Text></View>
                <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
            </SafeAreaView>
        );
    }

    const handleDateChange = (index: number) => {
        setSelectedDate(index);
        setSelectedTime(null);
        setExpandedCourtId(null);
        setBookingsForDay([]);
    };

    const handleTimeChange = (time: string) => {
        setSelectedTime(time);
        setExpandedCourtId(null);
    };

    const currentSelectedTimeSlot = clubTimeSlots.find(ts => ts.time === selectedTime);
    const currentPrice = currentSelectedTimeSlot ? currentSelectedTimeSlot.price : null;
    const currentDuration = currentSelectedTimeSlot ? currentSelectedTimeSlot.duration : null;
    
    const timesForGrid: (string | null)[] = [...displayableTimes];
    if (timesForGrid.length > 0) {
        const remainder = timesForGrid.length % 3;
        if (remainder !== 0) {
            for (let i = 0; i < 3 - remainder; i++) {
                timesForGrid.push(null);
            }
        }
    }
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color="#0e2432" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>Wijzig Reservering</Text>
            </View>
            <ScrollView>
                <ImageBackground source={{ uri: club.imageUrl }} style={styles.heroImage}>
                </ImageBackground>

                <View style={styles.infoContainer}>
                    <Text style={styles.clubTitle}>{club.name}</Text>
                    <Text style={styles.clubAddress}>Kies een nieuwe tijd of baan voor je boeking.</Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateCarousel}>
                    {dates.map((date, index) => (
                        <TouchableOpacity key={index} style={[styles.dateItem, selectedDate === index && styles.selectedDateItem]} onPress={() => handleDateChange(index)}>
                            <Text style={[styles.dateDay, selectedDate === index && styles.selectedDateText]}>{date.day}</Text>
                            <Text style={[styles.dateDate, selectedDate === index && styles.selectedDateText]}>{date.date} {date.month}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <View style={styles.timeSlotSection}>
                    {loadingTimes ? (
                        <ActivityIndicator size="small" color="#007AFF" style={{ height: 50 }} />
                    ) : (
                        <View style={styles.timeSlotsGrid}>
                            {timesForGrid.length > 0 ? timesForGrid.map((time, index) => (
                                time !== null ? (
                                    <TouchableOpacity
                                        key={time}
                                        style={[styles.timeSlot, selectedTime === time && styles.selectedTimeSlot, (index + 1) % 3 !== 0 && styles.timeSlotMarginRight]}
                                        onPress={() => handleTimeChange(time)}
                                    >
                                        <Text style={[styles.timeSlotText, selectedTime === time && styles.selectedTimeSlotText]}>{time}</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <View key={`placeholder-${index}`} style={[styles.timeSlot, (index + 1) % 3 !== 0 && styles.timeSlotMarginRight, { backgroundColor: 'transparent', borderWidth: 0 }]} />
                                )
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
                                onBook={() => handleReschedule(court)}
                                isBookable={!!selectedTime}
                                price={currentPrice}
                                duration={currentDuration}
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
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    heroImage: { width: '100%', height: 180 },
    infoContainer: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
    clubTitle: { fontSize: 24, fontWeight: 'bold', color: '#0e2432', marginBottom: 5 },
    clubAddress: { fontSize: 16, color: 'gray' },
    dateCarousel: { paddingHorizontal: 20, paddingVertical: 15 },
    dateItem: { alignItems: 'center', backgroundColor: '#f0f0f0', borderRadius: 10, padding: 15, marginRight: 10, minWidth: 80 },
    selectedDateItem: { backgroundColor: '#0e2432' },
    dateDay: { fontSize: 14, fontWeight: 'bold', color: '#0e2432' },
    dateDate: { fontSize: 14, color: 'gray' },
    selectedDateText: { color: '#fff' },
    timeSlotSection: { padding: 20, backgroundColor: '#f8f8f8' },
    timeSlotsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
    timeSlot: {
        width: '32%',
        backgroundColor: '#fff',
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#eee'
    },
    timeSlotMarginRight: {
        marginRight: '2%',
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