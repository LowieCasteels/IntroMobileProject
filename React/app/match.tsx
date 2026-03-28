import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  addDoc,
  arrayUnion,
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

// ─── Types ───────────────────────────────────────────────────────────────────

type Match = {
  id: string;
  clubId: string;
  clubName: string;
  date: Date;
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
};

type ClubOption = {
  id: string;
  name: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const LEVEL_OPTIONS = [1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7];

// ─── Firestore helpers ────────────────────────────────────────────────────────

function matchFromFirestore(id: string, data: any): Match {
  return {
    id,
    clubId: data.clubId ?? "",
    clubName: data.clubName ?? "",
    date: (data.date as Timestamp).toDate(),
    levelMin: data.levelMin,
    levelMax: data.levelMax,
    mixed: data.mixed,
    competitive: data.competitive,
    players: data.players ?? [],
    maxPlayers: 4,
    pricePerPlayer: data.pricePerPlayer,
    paid: data.paid ?? [],
    status: data.status,
    score: data.score ?? undefined,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: Date) {
  const now = new Date();
  const diffH = (d.getTime() - now.getTime()) / 3600000;
  const timeStr = d.toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" });
  if (diffH > 0 && diffH < 20) return `Vandaag, ${timeStr}`;
  if (diffH >= 20 && diffH < 44) return `Morgen, ${timeStr}`;
  return `${d.toLocaleDateString("nl-BE", { weekday: "short", day: "numeric", month: "short" })}, ${timeStr}`;
}

function levelColor(min: number) {
  if (min <= 2) return { bg: "#E8FCD6", text: "#2E5D00" };
  if (min <= 4) return { bg: "#FFF3CD", text: "#7A4F00" };
  return { bg: "#FFE0E0", text: "#8B0000" };
}

function setWinner(s1: number, s2: number): 0 | 1 | 2 {
  if (s1 >= 6 && s1 - s2 >= 2) return 1;
  if (s2 >= 6 && s2 - s1 >= 2) return 2;
  if (s1 === 7 && s2 === 5) return 1;
  if (s2 === 7 && s1 === 5) return 2;
  return 0;
}

function matchWinner(sets: [number, number][]): 0 | 1 | 2 {
  let w1 = 0, w2 = 0;
  for (const [s1, s2] of sets) {
    const w = setWinner(s1, s2);
    if (w === 1) w1++;
    if (w === 2) w2++;
  }
  if (w1 >= 2) return 1;
  if (w2 >= 2) return 2;
  return 0;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LevelPicker({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {LEVEL_OPTIONS.map((l) => (
            <TouchableOpacity
              key={l}
              style={[styles.levelChip, value === l && styles.levelChipActive]}
              onPress={() => onChange(l)}
            >
              <Text style={[styles.levelChipText, value === l && styles.levelChipTextActive]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function ClubPicker({ clubs, value, onChange }: { clubs: ClubOption[]; value: string; onChange: (v: string) => void }) {
  if (clubs.length === 0) {
    return (
      <View>
        <Text style={styles.fieldLabel}>Club</Text>
        <Text style={{ color: "#999", fontSize: 14, paddingVertical: 8 }}>Geen clubs gevonden in de database.</Text>
      </View>
    );
  }
  return (
    <View>
      <Text style={styles.fieldLabel}>Club</Text>
      {clubs.map((c) => (
        <TouchableOpacity
          key={c.id}
          style={[styles.clubRow, value === c.id && styles.clubRowActive]}
          onPress={() => onChange(c.id)}
        >
          <Ionicons
            name={value === c.id ? "radio-button-on" : "radio-button-off"}
            size={18}
            color={value === c.id ? "#2F63FF" : "#999"}
          />
          <Text style={[styles.clubLabel, value === c.id && { color: "#2F63FF", fontWeight: "700" }]}>
            {c.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function Tag({ label, icon, accent }: { label: string; icon: any; accent?: boolean }) {
  return (
    <View style={[styles.tag, accent && styles.tagAccent]}>
      <Ionicons name={icon} size={11} color={accent ? "#2F63FF" : "#6B7A8D"} />
      <Text style={[styles.tagText, accent && { color: "#2F63FF" }]}>{label}</Text>
    </View>
  );
}

function ScoreDisplay({ sets }: { sets: [number, number][] }) {
  const winner = matchWinner(sets);
  return (
    <View style={styles.scoreBox}>
      <Text style={styles.scoreTitle}>Eindstand</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {sets.map(([s1, s2], i) => (
          <View key={i} style={styles.setChip}>
            <Text style={styles.setScore}>{s1}–{s2}</Text>
          </View>
        ))}
      </View>
      {winner !== 0 && <Text style={styles.winnerText}>Team {winner} wint 🏆</Text>}
    </View>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBadge}>
        <Text style={styles.sectionBadgeText}>{count}</Text>
      </View>
    </View>
  );
}

function ConfirmRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.confirmRow}>
      <Ionicons name={icon} size={16} color="#2F63FF" style={{ width: 22 }} />
      <Text style={styles.confirmLabel}>{label}:</Text>
      <Text style={styles.confirmValue}>{value}</Text>
    </View>
  );
}

// ─── Match Card ───────────────────────────────────────────────────────────────

function MatchCard({
  match,
  currentUserId,
  onJoin,
  onPay,
  onEnterScore,
}: {
  match: Match;
  currentUserId: string;
  onJoin: () => void;
  onPay: () => void;
  onEnterScore: () => void;
}) {
  const colors = levelColor(match.levelMin);
  const spotsLeft = match.maxPlayers - match.players.length;
  const isMember = match.players.includes(currentUserId);
  const hasPaid = match.paid.includes(currentUserId);
  const isPast = match.date < new Date();
  const isFinished = match.status === "finished";

  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <Text style={styles.cardTitle} numberOfLines={1}>{match.clubName}</Text>
        <View style={[styles.levelPill, { backgroundColor: colors.bg }]}>
          <Text style={[styles.levelText, { color: colors.text }]}>{match.levelMin} – {match.levelMax}</Text>
        </View>
      </View>

      <Text style={styles.cardSubtitle}>{formatDate(match.date)}</Text>

      <View style={styles.tagRow}>
        {match.mixed && <Tag label="Gemengd" icon="people" />}
        {match.competitive && <Tag label="Competitief" icon="trophy" />}
        <Tag label={`€${match.pricePerPlayer}/p`} icon="card" />
        {!isFinished && (
          <Tag
            label={spotsLeft === 0 ? "Vol" : `${spotsLeft} plek${spotsLeft > 1 ? "ken" : ""}`}
            icon="person-add"
            accent={spotsLeft > 0 && !isFinished}
          />
        )}
      </View>

      <View style={styles.playerDots}>
        {Array.from({ length: match.maxPlayers }).map((_, i) => (
          <View key={i} style={[styles.dot, i < match.players.length ? styles.dotFilled : styles.dotEmpty]} />
        ))}
      </View>

      {isFinished && match.score ? (
        <ScoreDisplay sets={match.score} />
      ) : (
        <View style={styles.actionRow}>
          {!isMember && spotsLeft > 0 && !isPast && (
            <TouchableOpacity style={styles.joinButton} onPress={onJoin}>
              <Text style={styles.joinButtonText}>Meedoen</Text>
            </TouchableOpacity>
          )}
          {isMember && !hasPaid && (
            <TouchableOpacity style={styles.payButton} onPress={onPay}>
              <Ionicons name="card-outline" size={14} color="#fff" />
              <Text style={styles.joinButtonText}>Betaal €{match.pricePerPlayer}</Text>
            </TouchableOpacity>
          )}
          {isMember && hasPaid && !isPast && (
            <View style={styles.paidBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#2E5D00" />
              <Text style={styles.paidText}>Betaald</Text>
            </View>
          )}
          {isMember && isPast && match.status !== "finished" && (
            <TouchableOpacity style={styles.scoreButton} onPress={onEnterScore}>
              <Ionicons name="stats-chart" size={14} color="#fff" />
              <Text style={styles.joinButtonText}>Score invoeren</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Create Match Modal ───────────────────────────────────────────────────────

function CreateMatchModal({
  visible,
  clubs,
  onClose,
  onCreate,
}: {
  visible: boolean;
  clubs: ClubOption[];
  onClose: () => void;
  onCreate: (data: Omit<Match, "id" | "players" | "paid" | "status">) => Promise<void>;
}) {
  const [clubId, setClubId] = useState("");
  const [date, setDate] = useState(() => { const d = new Date(); d.setHours(d.getHours() + 2, 0, 0, 0); return d; });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [levelMin, setLevelMin] = useState(1.5);
  const [levelMax, setLevelMax] = useState(4);
  const [mixed, setMixed] = useState(false);
  const [competitive, setCompetitive] = useState(false);
  const [price, setPrice] = useState("10");
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (clubs.length > 0 && !clubId) setClubId(clubs[0].id);
  }, [clubs]);

  function reset() {
    setStep("form");
    setClubId(clubs[0]?.id ?? "");
    const d = new Date(); d.setHours(d.getHours() + 2, 0, 0, 0);
    setDate(d);
    setLevelMin(1.5); setLevelMax(4);
    setMixed(false); setCompetitive(false);
    setPrice("10");
  }

  function handleConfirm() {
    if (!clubId) { Alert.alert("Fout", "Selecteer een club."); return; }
    if (levelMin > levelMax) { Alert.alert("Fout", "Min. niveau mag niet hoger zijn dan max."); return; }
    if (!price || isNaN(parseFloat(price))) { Alert.alert("Fout", "Vul een geldige prijs in."); return; }
    setStep("confirm");
  }

  async function handleCreate() {
    const selectedClub = clubs.find((c) => c.id === clubId);
    if (!selectedClub) return;
    setSaving(true);
    await onCreate({
      clubId,
      clubName: selectedClub.name,
      date,
      levelMin,
      levelMax,
      mixed,
      competitive,
      maxPlayers: 4,
      pricePerPlayer: parseFloat(price),
    });
    setSaving(false);
    reset();
    onClose();
  }

  const selectedClubName = clubs.find((c) => c.id === clubId)?.name ?? "";

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalRoot} edges={["top", "bottom"]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => { reset(); onClose(); }}>
            <Ionicons name="close" size={26} color="#0e2432" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{step === "form" ? "Wedstrijd aanmaken" : "Bevestig wedstrijd"}</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalContent}>
          {step === "form" ? (
            <>
              <ClubPicker clubs={clubs} value={clubId} onChange={setClubId} />
              <View style={styles.divider} />

              <Text style={styles.fieldLabel}>Datum</Text>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={18} color="#2F63FF" />
                <Text style={styles.dateButtonText}>
                  {date.toLocaleDateString("nl-BE", { weekday: "long", day: "numeric", month: "long" })}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  minimumDate={new Date()}
                  onChange={(_, d) => {
                    setShowDatePicker(false);
                    if (d) setDate((prev) => { const n = new Date(d); n.setHours(prev.getHours(), prev.getMinutes()); return n; });
                  }}
                />
              )}

              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Tijdstip</Text>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowTimePicker(true)}>
                <Ionicons name="time-outline" size={18} color="#2F63FF" />
                <Text style={styles.dateButtonText}>
                  {date.toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </TouchableOpacity>
              {showTimePicker && (
                <DateTimePicker
                  value={date}
                  mode="time"
                  onChange={(_, d) => {
                    setShowTimePicker(false);
                    if (d) setDate((prev) => { const n = new Date(prev); n.setHours(d.getHours(), d.getMinutes()); return n; });
                  }}
                />
              )}

              <View style={styles.divider} />
              <LevelPicker label="Min. niveau" value={levelMin} onChange={setLevelMin} />
              <LevelPicker label="Max. niveau" value={levelMax} onChange={setLevelMax} />
              <View style={styles.divider} />

              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Gemengd</Text>
                <Switch value={mixed} onValueChange={setMixed} trackColor={{ true: "#2F63FF" }} thumbColor="#fff" />
              </View>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Competitief</Text>
                <Switch value={competitive} onValueChange={setCompetitive} trackColor={{ true: "#2F63FF" }} thumbColor="#fff" />
              </View>
              <View style={styles.divider} />

              <Text style={styles.fieldLabel}>Prijs per speler (€)</Text>
              <TextInput
                style={styles.priceInput}
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                placeholder="10"
                placeholderTextColor="#aaa"
              />
            </>
          ) : (
            <View style={styles.confirmBox}>
              <Ionicons name="tennisball" size={48} color="#2F63FF" style={{ alignSelf: "center", marginBottom: 16 }} />
              <ConfirmRow icon="location" label="Club" value={selectedClubName} />
              <ConfirmRow
                icon="calendar"
                label="Datum & tijd"
                value={`${date.toLocaleDateString("nl-BE", { weekday: "long", day: "numeric", month: "long" })} om ${date.toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })}`}
              />
              <ConfirmRow icon="stats-chart" label="Niveau" value={`${levelMin} – ${levelMax}`} />
              <ConfirmRow icon="people" label="Gemengd" value={mixed ? "Ja" : "Nee"} />
              <ConfirmRow icon="trophy" label="Competitief" value={competitive ? "Ja" : "Nee"} />
              <ConfirmRow icon="card" label="Prijs per speler" value={`€${price}`} />
              <Text style={styles.confirmNote}>
                Na bevestiging wordt de wedstrijd zichtbaar voor andere spelers. Er zijn 3 open plekken naast jou.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.modalFooter}>
          {step === "form" ? (
            <TouchableOpacity style={styles.ctaButton} onPress={handleConfirm} activeOpacity={0.85}>
              <Text style={styles.ctaText}>Doorgaan</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity style={styles.backCta} onPress={() => setStep("form")}>
                <Ionicons name="arrow-back" size={18} color="#2F63FF" />
                <Text style={[styles.ctaText, { color: "#2F63FF" }]}>Aanpassen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.ctaButton, { flex: 1 }]} onPress={handleCreate} disabled={saving} activeOpacity={0.85}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Aanmaken 🎾</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Score Modal ──────────────────────────────────────────────────────────────

function ScoreModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (sets: [number, number][]) => void;
}) {
  const [sets, setSets] = useState<[string, string][]>([["", ""]]);

  function updateSet(i: number, team: 0 | 1, val: string) {
    const next = [...sets] as [string, string][];
    next[i][team] = val.replace(/[^0-9]/g, "");
    setSets(next);
  }

  function handleSave() {
    const parsed: [number, number][] = sets.map(([a, b]) => [parseInt(a) || 0, parseInt(b) || 0]);
    if (matchWinner(parsed) === 0) {
      Alert.alert("Ongeldig", "Er is nog geen winnaar. Controleer de regels: een set is gewonnen met 6 punten en 2 verschil (bijv. 6-4 of 7-5).");
      return;
    }
    onSave(parsed);
    setSets([["", ""]]);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalRoot} edges={["top", "bottom"]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={26} color="#0e2432" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Score invoeren</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={styles.scoreRule}>
            Een set is gewonnen met min. 6 punten en 2 verschil (bijv. 6-4 of 7-5). Een wedstrijd is gewonnen als een team 2 sets wint.
          </Text>

          {sets.map(([a, b], i) => (
            <View key={i} style={styles.setRow}>
              <Text style={styles.setLabel}>Set {i + 1}</Text>
              <TextInput
                style={styles.setInput}
                value={a}
                onChangeText={(v) => updateSet(i, 0, v)}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="0"
                placeholderTextColor="#bbb"
                textAlign="center"
              />
              <Text style={{ fontSize: 18, color: "#666", fontWeight: "700" }}>–</Text>
              <TextInput
                style={styles.setInput}
                value={b}
                onChangeText={(v) => updateSet(i, 1, v)}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="0"
                placeholderTextColor="#bbb"
                textAlign="center"
              />
            </View>
          ))}

          {sets.length < 3 && (
            <TouchableOpacity style={styles.addSetBtn} onPress={() => setSets([...sets, ["", ""]])}>
              <Ionicons name="add-circle-outline" size={18} color="#2F63FF" />
              <Text style={{ color: "#2F63FF", fontWeight: "600" }}>Set toevoegen</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.ctaButton} onPress={handleSave}>
            <Text style={styles.ctaText}>Opslaan</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MatchScreen() {
  const router = useRouter();
  const currentUserId = auth.currentUser?.uid ?? "";

  const [matches, setMatches] = useState<Match[]>([]);
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingClubs, setLoadingClubs] = useState(true);
  const [createVisible, setCreateVisible] = useState(false);
  const [scoreTargetId, setScoreTargetId] = useState<string | null>(null);

  // Clubs: one-time fetch
  useEffect(() => {
    getDocs(collection(db, "clubs"))
      .then((snap) => {
        setClubs(snap.docs.map((d) => ({ id: d.id, name: (d.data() as any).name })));
      })
      .catch((e) => console.error("Clubs fetch error:", e))
      .finally(() => setLoadingClubs(false));
  }, []);

  // Matches: realtime listener
  useEffect(() => {
    const q = query(collection(db, "matches"), orderBy("date", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMatches(snap.docs.map((d) => matchFromFirestore(d.id, d.data())));
        setLoadingMatches(false);
      },
      (err) => {
        console.error("Matches listener error:", err);
        setLoadingMatches(false);
      }
    );
    return unsub;
  }, []);

  // ─── Actions ────────────────────────────────────────────────────────────────

  async function handleCreate(data: Omit<Match, "id" | "players" | "paid" | "status">) {
    try {
      await addDoc(collection(db, "matches"), {
        ...data,
        date: Timestamp.fromDate(data.date),
        players: [currentUserId],
        paid: [],
        status: "open",
      });
    } catch (e) {
      Alert.alert("Fout", "Wedstrijd kon niet worden aangemaakt.");
      console.error(e);
    }
  }

  async function handleJoin(match: Match) {
    try {
      const newCount = match.players.length + 1;
      await updateDoc(doc(db, "matches", match.id), {
        players: arrayUnion(currentUserId),
        status: newCount >= 4 ? "full" : "open",
      });
    } catch (e) {
      Alert.alert("Fout", "Inschrijven mislukt.");
    }
  }

  function handlePay(match: Match) {
    Alert.alert(
      "Betaling simulatie",
      `Je betaalt €${match.pricePerPlayer} voor deze wedstrijd. 💳`,
      [
        { text: "Annuleren", style: "cancel" },
        {
          text: "Bevestig betaling",
          onPress: async () => {
            try {
              await updateDoc(doc(db, "matches", match.id), { paid: arrayUnion(currentUserId) });
            } catch {
              Alert.alert("Fout", "Betaling mislukt.");
            }
          },
        },
      ]
    );
  }

  async function handleSaveScore(matchId: string, sets: [number, number][]) {
    try {
      await updateDoc(doc(db, "matches", matchId), { score: sets, status: "finished" });
      const winner = matchWinner(sets);
      Alert.alert("Wedstrijd afgelopen!", `Team ${winner} heeft gewonnen 🏆\nNiveaus worden aangepast.`);
    } catch {
      Alert.alert("Fout", "Score kon niet worden opgeslagen.");
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  const open = matches.filter((m) => m.status === "open");
  const full = matches.filter((m) => m.status === "full");
  const finished = matches.filter((m) => m.status === "finished");
  const isLoading = loadingMatches || loadingClubs;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#0e2432" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wedstrijden</Text>
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#2F63FF" />
          <Text style={styles.loaderText}>Wedstrijden laden...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {matches.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="tennisball-outline" size={52} color="#C0CCDA" />
              <Text style={styles.emptyTitle}>Nog geen wedstrijden</Text>
              <Text style={styles.emptySubtitle}>
                Druk op de + knop om de eerste wedstrijd aan te maken.
              </Text>
            </View>
          )}

          {open.length > 0 && (
            <>
              <SectionHeader title="Beschikbaar" count={open.length} />
              {open.map((m) => (
                <MatchCard key={m.id} match={m} currentUserId={currentUserId}
                  onJoin={() => handleJoin(m)} onPay={() => handlePay(m)}
                  onEnterScore={() => setScoreTargetId(m.id)} />
              ))}
            </>
          )}

          {full.length > 0 && (
            <>
              <SectionHeader title="Vol" count={full.length} />
              {full.map((m) => (
                <MatchCard key={m.id} match={m} currentUserId={currentUserId}
                  onJoin={() => {}} onPay={() => handlePay(m)}
                  onEnterScore={() => setScoreTargetId(m.id)} />
              ))}
            </>
          )}

          {finished.length > 0 && (
            <>
              <SectionHeader title="Afgelopen" count={finished.length} />
              {finished.map((m) => (
                <MatchCard key={m.id} match={m} currentUserId={currentUserId}
                  onJoin={() => {}} onPay={() => {}} onEnterScore={() => {}} />
              ))}
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setCreateVisible(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      <CreateMatchModal
        visible={createVisible}
        clubs={clubs}
        onClose={() => setCreateVisible(false)}
        onCreate={handleCreate}
      />

      <ScoreModal
        visible={scoreTargetId !== null}
        onClose={() => setScoreTargetId(null)}
        onSave={(sets) => {
          if (scoreTargetId) handleSaveScore(scoreTargetId, sets);
          setScoreTargetId(null);
        }}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F8FF" },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 20,
    paddingVertical: 15, justifyContent: "center", position: "relative",
  },
  backButton: { position: "absolute", left: 15, padding: 5, zIndex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#0e2432" },

  loader: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loaderText: { fontSize: 14, color: "#4C5B6B" },

  emptyState: { alignItems: "center", marginTop: 80, gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#13202B" },
  emptySubtitle: { fontSize: 14, color: "#4C5B6B", textAlign: "center", lineHeight: 20 },

  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 24 },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#13202B" },
  sectionBadge: { backgroundColor: "#E0E8FF", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  sectionBadgeText: { fontSize: 12, fontWeight: "700", color: "#2F63FF" },

  card: {
    backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2,
  },
  cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#13202B", flex: 1 },
  levelPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  levelText: { fontSize: 12, fontWeight: "700" },
  cardSubtitle: { fontSize: 13, color: "#4C5B6B", marginBottom: 8 },

  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F0F2F5", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  tagAccent: { backgroundColor: "#E8EEFF" },
  tagText: { fontSize: 11, fontWeight: "600", color: "#6B7A8D" },

  playerDots: { flexDirection: "row", gap: 6, marginBottom: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotFilled: { backgroundColor: "#2F63FF" },
  dotEmpty: { backgroundColor: "#E0E4EC" },

  actionRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  joinButton: {
    alignSelf: "flex-start", backgroundColor: "#2F63FF", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, flexDirection: "row", gap: 6, alignItems: "center",
  },
  payButton: {
    alignSelf: "flex-start", backgroundColor: "#2E7D32", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, flexDirection: "row", gap: 6, alignItems: "center",
  },
  scoreButton: {
    alignSelf: "flex-start", backgroundColor: "#E67E22", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, flexDirection: "row", gap: 6, alignItems: "center",
  },
  joinButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  paidBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  paidText: { color: "#2E5D00", fontWeight: "600", fontSize: 13 },

  scoreBox: { backgroundColor: "#F0F4FF", borderRadius: 10, padding: 10, gap: 6 },
  scoreTitle: { fontSize: 12, fontWeight: "700", color: "#4C5B6B", marginBottom: 2 },
  setChip: { backgroundColor: "#2F63FF", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  setScore: { color: "#fff", fontWeight: "700", fontSize: 14 },
  winnerText: { fontSize: 13, fontWeight: "700", color: "#2F63FF", marginTop: 4 },

  fab: {
    position: "absolute", bottom: 28, right: 24, width: 58, height: 58, borderRadius: 29,
    backgroundColor: "#2F63FF", justifyContent: "center", alignItems: "center",
    shadowColor: "#2F63FF", shadowOpacity: 0.45, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 8,
  },

  modalRoot: { flex: 1, backgroundColor: "#F5F8FF" },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#E8EDF5", backgroundColor: "#fff",
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#0e2432" },
  modalContent: { paddingHorizontal: 20, paddingVertical: 20, gap: 4 },
  modalFooter: { padding: 20, borderTopWidth: 1, borderTopColor: "#E8EDF5", backgroundColor: "#fff" },

  fieldLabel: { fontSize: 13, fontWeight: "700", color: "#4C5B6B", marginBottom: 8, marginTop: 4 },
  divider: { height: 1, backgroundColor: "#E8EDF5", marginVertical: 16 },

  levelChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: "#EEF1F8" },
  levelChipActive: { backgroundColor: "#2F63FF" },
  levelChipText: { fontSize: 13, fontWeight: "600", color: "#4C5B6B" },
  levelChipTextActive: { color: "#fff" },

  clubRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F0F2F5" },
  clubRowActive: { backgroundColor: "#F0F4FF", borderRadius: 8, paddingHorizontal: 6 },
  clubLabel: { fontSize: 15, color: "#13202B" },

  dateButton: {
    flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff",
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1.5, borderColor: "#E0E8FF",
  },
  dateButtonText: { fontSize: 15, color: "#0e2432", fontWeight: "600" },

  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  toggleLabel: { fontSize: 15, color: "#13202B", fontWeight: "600" },

  priceInput: {
    backgroundColor: "#fff", borderRadius: 10, borderWidth: 1.5, borderColor: "#E0E8FF",
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: "#0e2432", fontWeight: "600",
  },

  ctaButton: {
    backgroundColor: "#2F63FF", borderRadius: 12, paddingVertical: 14,
    flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8,
  },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  backCta: {
    borderWidth: 1.5, borderColor: "#2F63FF", borderRadius: 12, paddingVertical: 14,
    paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 6,
  },

  confirmBox: { gap: 4 },
  confirmRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F0F2F5" },
  confirmLabel: { fontSize: 14, color: "#4C5B6B", width: 110 },
  confirmValue: { fontSize: 14, fontWeight: "700", color: "#13202B", flex: 1 },
  confirmNote: {
    marginTop: 16, backgroundColor: "#E8EEFF", borderRadius: 10, padding: 12,
    fontSize: 13, color: "#2F63FF", fontWeight: "600", lineHeight: 19,
  },

  scoreRule: {
    backgroundColor: "#FFF8E1", borderRadius: 10, padding: 12,
    fontSize: 13, color: "#7A4F00", lineHeight: 19, marginBottom: 16,
  },
  setRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  setLabel: { fontSize: 14, fontWeight: "600", color: "#4C5B6B", width: 48 },
  setInput: {
    flex: 1, backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#E0E8FF",
    borderRadius: 10, paddingVertical: 12, fontSize: 20, fontWeight: "700", color: "#0e2432",
  },
  addSetBtn: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, paddingVertical: 10 },
});