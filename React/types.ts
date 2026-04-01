import { GeoPoint, Timestamp } from "firebase/firestore";

export interface UserData {
    firstName: string;
    lastName: string;
    email: string;
    gender?: "Man" | "Vrouw" | "Zeg ik liever niet";
    birthDate?: string;
    description?: string;
    profilePictureUrl?: string;
    rating?: number;
    createdAt?: any;
    beste_hand?: "Rechtshandig" | "Linkshandig" | "";
    baanpositie?: "Links" | "Rechts" | "Beide" | "";
    type_partij?: "Enkel" | "Dubbel" | "Competitief" | "";
    favoriete_tijd?: "Ochtend" | "Avond" | "Weekend" | "";
    gamesPlayed?: number;
    wins?: number;
    losses?: number;
}

export interface Club {
    id: string; // Document ID from Firestore
    name: string;
    imageUrl: string;
    minPrice: number;
    address: {
        street: string;
        city: string;
        postalCode: string;
    };
    location: GeoPoint;
    facilities: string[];
}

export interface Court {
    id: string;
    name: string;
    type: "indoor" | "outdoor";
    surface: "kunstgras" | "gravel" | "hardcourt";
}

export interface Booking {
    id: string;
    clubId: string;
    courtId: string;
    userId: string;
    startTime: Timestamp;
    endTime: Timestamp;
}

export interface ClubTimeSlot {
    id: string;
    time: string;
    duration: number;
    price: number;
}

export interface Match {
    id: string;
    clubId: string;
    clubName: string;
    date: Timestamp;
    levelMin: number;
    levelMax: number;
    mixed: boolean;
    competitive: boolean;
    players: string[];
    maxPlayers: 4;
    pricePerPlayer: number;
    paid: string[];
    status: "open" | "full" | "finished";
    score?: [number, number][];
}
