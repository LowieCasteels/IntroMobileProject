import React from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
	ScrollView,
	StatusBar,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";

type MatchCardProps = {
	title: string;
	subtitle: string;
	level: string;
};

function MatchCard({ title, subtitle, level }: MatchCardProps) {
	return (
		<View style={styles.card}>
			<View style={styles.cardTopRow}>
				<Text style={styles.cardTitle}>{title}</Text>
				<View style={styles.levelPill}>
					<Text style={styles.levelText}>{level}</Text>
				</View>
			</View>
			<Text style={styles.cardSubtitle}>{subtitle}</Text>
			<TouchableOpacity style={styles.joinButton} activeOpacity={0.85}>
				<Text style={styles.joinButtonText}>Meedoen</Text>
			</TouchableOpacity>
		</View>
	);
}

export default function MatchScreen() {
	const router = useRouter();

	return (
		<SafeAreaView style={styles.root} edges={["top"]}>
			<StatusBar barStyle="dark-content" />

			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
					<Ionicons name="arrow-back" size={28} color="#0e2432" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Zoek een match</Text>
			</View>

			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
			>
				<Text style={styles.introTitle}>Beschikbare wedstrijden</Text>
				<Text style={styles.introSubtitle}>
					Kies een wedstrijd of gebruik dit scherm als startpunt voor je eigen flow.
				</Text>

				<MatchCard
					title="Vriendschappelijke Padelsessie"
					subtitle="Vandaag, 19:00 - Sporthal Centrum"
					level="Beginner"
				/>
				<MatchCard
					title="Duo Match"
					subtitle="Morgen, 20:30 - Blue Court"
					level="Gemiddeld"
				/>
				<MatchCard
					title="Weekend Challenge"
					subtitle="Zaterdag, 11:00 - Club Noord"
					level="Gevorderd"
				/>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: "#F5F8FF",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 20,
		paddingVertical: 15,
		justifyContent: "center",
		position: "relative",
	},
	backButton: {
		position: "absolute",
		left: 15,
		padding: 5,
		zIndex: 1,
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#0e2432",
	},
	scroll: {
		flex: 1,
	},
	content: {
		paddingHorizontal: 16,
		paddingBottom: 24,
	},
	introTitle: {
		fontSize: 20,
		fontWeight: "700",
		color: "#13202B",
		marginBottom: 6,
	},
	introSubtitle: {
		fontSize: 14,
		color: "#4C5B6B",
		marginBottom: 14,
	},
	card: {
		backgroundColor: "#FFFFFF",
		borderRadius: 14,
		padding: 14,
		marginBottom: 12,
	},
	cardTopRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 6,
		gap: 8,
	},
	cardTitle: {
		fontSize: 16,
		fontWeight: "700",
		color: "#13202B",
		flex: 1,
	},
	levelPill: {
		backgroundColor: "#E8FCD6",
		borderRadius: 999,
		paddingHorizontal: 10,
		paddingVertical: 4,
	},
	levelText: {
		fontSize: 12,
		fontWeight: "700",
		color: "#2E5D00",
	},
	cardSubtitle: {
		fontSize: 14,
		color: "#4C5B6B",
		marginBottom: 10,
	},
	joinButton: {
		alignSelf: "flex-start",
		backgroundColor: "#2F63FF",
		borderRadius: 10,
		paddingHorizontal: 14,
		paddingVertical: 8,
	},
	joinButtonText: {
		color: "#FFFFFF",
		fontWeight: "700",
		fontSize: 14,
	},
});
