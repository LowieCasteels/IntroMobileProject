import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { collection, query, where, getDocs, doc, getDoc, orderBy, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { Booking, Club, Court } from '../types';

interface PopulatedBooking extends Booking {
    clubName: string;
    court: Court | null;
}

export default function MyBookingsScreen() {
    const router = useRouter();
    const [bookings, setBookings] = useState<PopulatedBooking[]>([]);
    const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            const fetchBookings = async () => {
                setLoading(true);
                setError(null);
                const user = auth.currentUser;

                if (!user) {
                    setError("Je moet ingelogd zijn om je boekingen te zien.");
                    setLoading(false);
                    return;
                }

                try {
                    const bookingsRef = collection(db, 'bookings');
                    const q = query(
                        bookingsRef,
                        where('userId', '==', user.uid),
                        orderBy('startTime', 'desc')
                    );
                    const querySnapshot = await getDocs(q);
                    const fetchedBookings: Booking[] = querySnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    } as Booking));

                    const populatedBookings: PopulatedBooking[] = await Promise.all(
                        fetchedBookings.map(async (booking) => {
                            const clubDoc = await getDoc(doc(db, 'clubs', booking.clubId));
                            const clubName = clubDoc.exists() ? (clubDoc.data() as Club).name : 'Onbekende Club';

                            const courtDoc = await getDoc(doc(db, 'clubs', booking.clubId, 'courts', booking.courtId));
                            const courtData = courtDoc.exists() ? { id: courtDoc.id, ...courtDoc.data() } as Court : null;

                            return {
                                ...booking,
                                clubName,
                                court: courtData,
                            };
                        })
                    );
                    setBookings(populatedBookings);

                } catch (err: any) {
                    console.error("Error fetching bookings: ", err);
                    setError(`Fout bij het ophalen van boekingen: ${err.message}`);
                } finally {
                    setLoading(false);
                }
            };

            fetchBookings();
        }, [])
    );

    const handleCancelBooking = (bookingId: string) => {
        Alert.alert(
            "Reservering Annuleren",
            "Weet je zeker dat je deze reservering wilt annuleren? Dit kan niet ongedaan worden gemaakt.",
            [
                {
                    text: "Nee, behouden",
                    style: "cancel"
                },
                {
                    text: "Ja, annuleer",
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, "bookings", bookingId));
                            setBookings(prevBookings => prevBookings.filter(b => b.id !== bookingId));
                            Alert.alert("Succes", "De reservering is geannuleerd.");
                        } catch (error) {
                            console.error("Error cancelling booking: ", error);
                            Alert.alert("Fout", "Het annuleren van de reservering is mislukt.");
                        }
                    },
                    style: "destructive"
                }
            ]
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={28} color="#0e2432" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Mijn Boekingen</Text>
                </View>
                <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={28} color="#0e2432" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Mijn Boekingen</Text>
                </View>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color="#0e2432" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Mijn boekingen</Text>
            </View>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {bookings.length === 0 ? (
                    <View style={styles.noBookingsContainer}>
                        <Text style={styles.noBookingsText}>Je hebt nog geen boekingen.</Text>
                        <TouchableOpacity style={styles.findClubButton} onPress={() => router.push('/search')}>
                            <Text style={styles.findClubButtonText}>Vind een club</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    bookings.map((booking) => (
                        <TouchableOpacity
                            key={booking.id}
                            style={styles.bookingCard}
                            onPress={() => setExpandedBookingId(prevId => (prevId === booking.id ? null : booking.id))}
                            activeOpacity={0.7}>
                            <Text style={styles.bookingClubName}>{booking.clubName}</Text>
                            <Text style={styles.bookingCourtName}>{booking.court?.name || 'Onbekende Baan'}</Text>
                            <Text style={styles.bookingDateTime}>
                                {booking.startTime.toDate().toLocaleDateString('nl-BE', {
                                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                                })}
                            </Text>
                            <Text style={styles.bookingTime}>
                                {booking.startTime.toDate().toLocaleTimeString('nl-BE', {
                                    hour: '2-digit', minute: '2-digit'
                                })} - {booking.endTime.toDate().toLocaleTimeString('nl-BE', {
                                    hour: '2-digit', minute: '2-digit'
                                })}
                            </Text>
                            {expandedBookingId === booking.id && (
                                <View style={styles.expandedView}>
                                    <View style={styles.courtDetails}>
                                        <Text style={styles.detailTitle}>Baandetails</Text>
                                        <Text style={styles.detailText}>
                                            Type: <Text style={styles.detailValue}>{booking.court?.type === 'indoor' ? 'Binnen' : 'Buiten'}</Text>
                                        </Text>
                                        <Text style={styles.detailText}>
                                            Ondergrond: <Text style={styles.detailValue}>{booking.court?.surface}</Text>
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.changeButton]}
                                        activeOpacity={0.8}
                                        onPress={() => handleCancelBooking(booking.id)}>
                                        <Text style={styles.changeButtonText}>Annuleer reservering</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
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
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: 'red',
        textAlign: 'center',
    },
    scrollContent: {
        padding: 20,
    },
    noBookingsContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
    },
    noBookingsText: {
        fontSize: 18,
        color: 'gray',
        marginBottom: 20,
    },
    findClubButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 10,
    },
    findClubButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    bookingCard: {
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
    bookingClubName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0e2432',
        marginBottom: 5,
    },
    bookingCourtName: {
        fontSize: 16,
        color: '#333',
        marginBottom: 5,
    },
    bookingDateTime: {
        fontSize: 14,
        color: 'gray',
    },
    bookingTime: {
        fontSize: 14,
        color: 'gray',
        marginTop: 2,
    },
    expandedView: {
        borderTopWidth: 1,
        borderTopColor: '#eee',
        marginTop: 15,
        paddingTop: 15,
    },
    courtDetails: {
        marginBottom: 15,
    },
    detailTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0e2432',
        marginBottom: 8,
    },
    detailText: {
        fontSize: 14,
        color: 'gray',
        marginBottom: 4,
    },
    detailValue: {
        color: '#333',
        fontWeight: '500',
        textTransform: 'capitalize',
    },
    changeButton: {
        backgroundColor: '#FF3B30',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    changeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});