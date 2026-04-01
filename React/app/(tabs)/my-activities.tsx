import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { collection, query, where, getDocs, doc, getDoc, orderBy, Timestamp, deleteDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { Booking, Club, Court, Match } from '../../types';

const SimplifiedMatchCard = ({ match, onLeave }: { match: Match, onLeave: () => void }) => {
    const router = useRouter();
    const spotsLeft = match.maxPlayers - match.players.length;
    const matchDate = match.date.toDate();

    const handlePress = () => {
        Alert.alert(
            match.clubName,
            `Wedstrijd op ${matchDate.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long' })} om ${matchDate.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}`,
            [
                {
                    text: "Chat openen",
                    onPress: () => router.push(`/match-chat/${match.id}`),
                },
                {
                    text: "Clubinformatie bekijken",
                    onPress: () => router.push(`/club/${match.clubId}`),
                },
                {
                    text: "Wedstrijd verlaten",
                    onPress: onLeave,
                    style: "destructive",
                },
                { text: "Annuleren", style: "cancel" },
            ]
        );
    };

    return (
        <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.8}>
            <Text style={styles.cardTitle}>{match.clubName}</Text>
            <Text style={styles.cardSubtitle}>
                {matchDate.toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' })} om {matchDate.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <View style={styles.cardRow}>
                <Ionicons name="people-outline" size={16} color="gray" />
                <Text style={styles.cardInfo}>{spotsLeft === 0 ? "Vol" : `${spotsLeft} plek${spotsLeft > 1 ? "ken" : ""} vrij`}</Text>
            </View>
        </TouchableOpacity>
    );
}

interface PopulatedBooking extends Booking {
    clubName: string;
    court: Court | null;
}

const SimplifiedBookingCard = ({ booking, onCancel }: { booking: PopulatedBooking, onCancel: () => void }) => {
    const router = useRouter();

    const handlePress = () => {
        Alert.alert(
            booking.clubName,
            `Reservering voor ${booking.court?.name || 'baan'}`,
            [
                {
                    text: "Clubinformatie bekijken",
                    onPress: () => router.push(`/club/${booking.clubId}`),
                },
                {
                    text: "Reservering annuleren",
                    onPress: onCancel,
                    style: "destructive",
                },
                { text: "Annuleren", style: "cancel" },
            ]
        );
    };

    return (
        <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.8}>
            <Text style={styles.cardTitle}>{booking.clubName}</Text>
            <Text style={styles.cardSubtitle}>{booking.court?.name || 'Onbekende baan'}</Text>
            <Text style={styles.cardInfo}>{booking.startTime.toDate().toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
            <Text style={styles.cardInfo}>
                {booking.startTime.toDate().toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })} - {booking.endTime.toDate().toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}
            </Text>
        </TouchableOpacity>
    );
}

export default function MyActivitiesScreen() {
    const [matches, setMatches] = useState<Match[]>([]);
    const [bookings, setBookings] = useState<PopulatedBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        const user = auth.currentUser;
        if (!user) {
            setLoading(false);
            return;
        }

        try {
            // Fetch active matches
            const matchesQuery = query(
                collection(db, 'matches'),
                where('players', 'array-contains', user.uid),
                where('status', 'in', ['open', 'full']),
                orderBy('date', 'asc')
            );
            const matchesSnapshot = await getDocs(matchesQuery);
            const fetchedMatches = matchesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Match));
            setMatches(fetchedMatches);

            // Fetch upcoming bookings
            const bookingsQuery = query(
                collection(db, 'bookings'),
                where('userId', '==', user.uid),
                where('startTime', '>=', Timestamp.now()),
                orderBy('startTime', 'asc')
            );
            const bookingsSnapshot = await getDocs(bookingsQuery);
            const fetchedBookings: Booking[] = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));

            const populatedBookings: PopulatedBooking[] = await Promise.all(
                fetchedBookings.map(async (booking) => {
                    const clubDoc = await getDoc(doc(db, 'clubs', booking.clubId));
                    const clubName = clubDoc.exists() ? (clubDoc.data() as Club).name : 'Onbekende Club';
                    const courtDoc = await getDoc(doc(db, 'clubs', booking.clubId, 'courts', booking.courtId));
                    const courtData = courtDoc.exists() ? { id: courtDoc.id, ...courtDoc.data() } as Court : null;
                    return { ...booking, clubName, court: courtData };
                })
            );
            setBookings(populatedBookings);

        } catch (err) {
            console.error("Error fetching activities: ", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            fetchData();
        }, [])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, []);

    const handleCancelBooking = (bookingId: string) => {
        Alert.alert(
            "Reservering Annuleren",
            "Weet je zeker dat je deze reservering wilt annuleren?",
            [
                { text: "Nee", style: "cancel" },
                {
                    text: "Ja, annuleer",
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, "bookings", bookingId));
                            setBookings(prev => prev.filter(b => b.id !== bookingId));
                            Alert.alert("Succes", "De reservering is geannuleerd.");
                        } catch (error) {
                            console.error("Error cancelling booking: ", error);
                            Alert.alert("Fout", "Annuleren mislukt.");
                        }
                    },
                    style: "destructive"
                }
            ]
        );
    };

    const handleLeaveMatch = (matchToLeave: Match) => {
        const user = auth.currentUser;
        if (!user) return;

        Alert.alert(
            "Wedstrijd Verlaten",
            "Weet je zeker dat je deze wedstrijd wilt verlaten?",
            [
                { text: "Nee", style: "cancel" },
                {
                    text: "Ja, verlaat",
                    onPress: async () => {
                        try {
                            if (matchToLeave.players.length === 1 && matchToLeave.players[0] === user.uid) {
                                await deleteDoc(doc(db, "matches", matchToLeave.id));
                            } else {
                                await updateDoc(doc(db, "matches", matchToLeave.id), {
                                    players: arrayRemove(user.uid),
                                    paid: arrayRemove(user.uid),
                                    status: 'open'
                                });
                            }
                            setMatches(prev => prev.filter(m => m.id !== matchToLeave.id));
                            Alert.alert("Succes", "Je hebt de wedstrijd verlaten.");
                        } catch (error) {
                            console.error("Error leaving match: ", error);
                            Alert.alert("Fout", "Verlaten van wedstrijd mislukt.");
                        }
                    },
                    style: "destructive"
                }
            ]);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Mijn Activiteiten</Text>
            </View>
            {loading ? (
                <ActivityIndicator style={{ flex: 1 }} size="large" color="#007AFF" />
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#007AFF"]} />}
                >
                    {matches.length === 0 && bookings.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="calendar-outline" size={64} color="#ccc" />
                            <Text style={styles.emptyTitle}>Geen activiteiten gepland</Text>
                            <Text style={styles.emptySubtitle}>Je actieve wedstrijden en reserveringen verschijnen hier.</Text>
                        </View>
                    ) : (
                        <>
                            {matches.length > 0 && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Actieve Wedstrijden</Text>
                                    {matches.map(match => <SimplifiedMatchCard key={match.id} match={match} onLeave={() => handleLeaveMatch(match)} />)}
                                </View>
                            )}
                            {bookings.length > 0 && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Aankomende Reserveringen</Text>
                                    {bookings.map(booking => <SimplifiedBookingCard key={booking.id} booking={booking} onCancel={() => handleCancelBooking(booking.id)} />)}
                                </View>
                            )}
                        </>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f8f8',
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        backgroundColor: '#fff',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0e2432',
    },
    scrollContent: {
        padding: 20,
        flexGrow: 1,
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0e2432',
        marginBottom: 15,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0e2432',
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 14,
        color: '#555',
        marginBottom: 8,
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    cardInfo: {
        fontSize: 14,
        color: 'gray',
        marginLeft: 6,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 50,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: 'gray',
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 40,
    },
});