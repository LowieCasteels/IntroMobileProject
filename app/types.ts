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
}
