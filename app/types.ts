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
}
