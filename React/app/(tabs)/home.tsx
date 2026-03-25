import React from 'react';
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons} from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Image,
  ScrollView,
  StatusBar,
  TouchableOpacity,View, Text, StyleSheet
} from "react-native";

export default function LocationsScreen() {
  const router = useRouter();
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <SafeAreaView style={styles.blueHeader} edges={["top"]}>
        <View style={styles.headerRow}>
          <Text style={styles.brand}>PLAYTOMIC</Text>

          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8}>
              <Feather name="bell" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8}>
              <Feather name="menu" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* White greeting card */}
        <View style={styles.greetingCard}>
          <Text style={styles.greetingTitle}>
            Welkom gebruiker.
          </Text>

          <View style={styles.quickRow}>
            <QuickAction icon="soccer-field" label="Een baan boeken" onPress={() => router.push('/search')} />
            <QuickAction icon="school" label="Leren" />
            <QuickAction icon="trophy" label="Wedstrijden" />
            <QuickAction icon="tennis-ball-outline" label="Zoek een match" onPress={() => router.push('/match')}/>
          </View>
        </View>

        {/* Recommended clubs */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Aanbevolen clubs voor jou</Text>
            <Text style={styles.sectionLink} onPress={() => router.push('/search')}>Bekijk alles</Text>
          </View>

          <View style={styles.recoRow}>
            {/* Location card */}
            <View style={styles.locationCard}>
              <View style={styles.locationIconWrap}>
                <Feather name="map-pin" size={26} color="#111827" />
              </View>

              <Text style={styles.locationText}>
                Zet locatie aan{"\n"}voor betere{"\n"}aanbevelingen
              </Text>

              <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>Inschakelen</Text>
              </TouchableOpacity>
            </View>

            {/* Club card */}
            <View style={styles.clubCard}>
              <View style={styles.clubImageWrap}>
                <Image
                  source={{
                    uri: "https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=900&q=60",
                  }}
                  style={styles.clubImage}
                />
              </View>

              <View style={styles.clubBody}>
                <Text style={styles.clubTitle} numberOfLines={2}>
                  Indie Pádel Club
                </Text>
                <Text style={styles.clubSubtitle} numberOfLines={1}>
                  1.315km - Madrid
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Activities */}
        <View style={styles.section}>
          <Text style={styles.activitiesTitle}>Activiteiten</Text>
          <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.activitiesRow}>
          <View style={styles.activitiesRow}>

            <View style={styles.placeholderCard}>
              <View style={styles.iconContainer}>
                  <Image
                    source={require("../../assets/images/tennisbasket.png")}
                    style={styles.icon}
                  />
              </View>
              <Text style={styles.placeholderText}>Privélessen</Text>
            </View>

            <View style={styles.placeholderCard}>
              <View style={styles.iconContainer}>
                  <Image
                    source={require("../../assets/images/twotennis.png")}
                    style={styles.icon}
                  />
              </View>
              <Text style={[styles.placeholderText, {marginLeft: 15}]}>Openbare lessen</Text>
            </View>

            <View style={styles.placeholderCard}>
              <View style={styles.iconContainer}>
                  <Image
                    source={require("../../assets/images/bookopen.png")}
                    style={styles.icon}
                  />
              </View>
              <Text style={styles.placeholderText}>Cursussen</Text>
            </View>

          </View>
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickItem} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={styles.quickCircle}>
        <MaterialCommunityIcons name={icon} size={38} color="#0B1B2B" />
      </View>
      <Text style={styles.quickLabel}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  blueHeader: {
    backgroundColor: "#2F63FF",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    color: "#FFFFFF",
    fontSize: 28,
    letterSpacing: 5,
    fontWeight: "500",
  },
  headerIcons: {
    flexDirection: "row",
    gap: 10,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  scroll: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    paddingBottom: 28,
  },

  greetingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
  },
  greetingTitle: {
    fontSize: 24,
    lineHeight: 34,
    fontWeight: "700",
    color: "#13202B",
    marginBottom: 18,
  },

  quickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quickItem: {
    width: "23%",
    alignItems: "center",
  },
  quickCircle: {
    width: 76,
    height: 76,
    borderRadius: 43,
    backgroundColor: "#C8FF00",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  quickLabel: {
    fontSize: 14,
    display: "flex",
    color: "#1A2A3A",
    textAlign: "center"
  },

  section: {
    marginTop: 22,
    paddingHorizontal: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#13202B",
  },
  sectionLink: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2F63FF",
  },

  recoRow: {
    flexDirection: "row",
    gap: 12,
  },

  locationCard: {
    flex: 1,
    backgroundColor: "#F1F3F7",
    borderRadius: 16,
    padding: 16,
    justifyContent: "space-between",
    minHeight: 220,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  locationIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  locationText: {
    marginTop: 10,
    fontSize: 20,
    lineHeight: 26,
    color: "#475569",
    fontWeight: "500",
  },
  primaryBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: "#2F63FF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },

  clubCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    minHeight: 220,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  clubImageWrap: {
    height: 140,
    backgroundColor: "#E5E7EB",
  },
  clubImage: {
    width: "100%",
    height: "100%",
  },
  clubBody: {
    padding: 14,
  },
  clubTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
  clubSubtitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#6B7280",
  },

  activitiesTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#13202B",
    marginBottom: 14,
  },
  activitiesRow: {
    flexDirection: "row",
    gap: 12,
  },
  placeholderCard: {
    flex: 1,
    height: 70,
    width: 150,
    backgroundColor: "#F1F3F7",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingRight: 10,
  },
  placeholderText:{
    flexShrink: 1,
  },
  iconContainer:{
  marginRight: 10,
  },
  icon:{
    width:50,
    height: 50,
  }
});