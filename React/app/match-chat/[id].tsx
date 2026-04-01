 import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  getDocs,
  where,
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { UserData } from '../../types';

type Message = {
  id: string;
  text: string;
  createdAt: Date;
  userId: string;
};

type UserInfo = {
  name: string;
  avatar?: string;
};

const MessageBubble = ({ message, isMe, userInfo }: { message: Message; isMe: boolean; userInfo?: UserInfo }) => {
  return (
    <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.theirMessageRow]}>
      {!isMe && (
        <View style={styles.avatar}>
          {userInfo?.avatar ? (
            <Image source={{ uri: userInfo.avatar }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarInitials}>{userInfo?.name?.[0]?.toUpperCase() ?? '?'}</Text>
          )} 
        </View>
      )}
      <View style={[styles.messageBubble, isMe ? styles.myMessageBubble : styles.theirMessageBubble]}>
        {!isMe && <Text style={styles.userName}>{userInfo?.name || 'Onbekend'}</Text>}
        <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>{message.text}</Text>
        <Text style={[styles.messageTime, isMe ? styles.myMessageTime : styles.theirMessageTime]}>
          {message.createdAt.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
};

export default function MatchChatScreen() {
  const router = useRouter();
  const { id: matchId } = useLocalSearchParams<{ id: string }>();
  const currentUserId = auth.currentUser?.uid;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [matchName, setMatchName] = useState('');
  const [usersInfo, setUsersInfo] = useState<Record<string, UserInfo>>({});

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!matchId) return;

    // Listener for messages
    const unsubscribeMessages = onSnapshot(
      query(collection(db, 'matches', matchId, 'messages'), orderBy('createdAt', 'asc')),
      async (querySnapshot) => {
      const fetchedMessages: Message[] = [];
      const userIdsFromMessages = new Set<string>();
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.createdAt) { // Ensure message has a timestamp
          fetchedMessages.push({
            id: doc.id,
            text: data.text,
            createdAt: data.createdAt.toDate(),
            userId: data.userId,
          }); 
          userIdsFromMessages.add(data.userId);
        }
      });
      setMessages(fetchedMessages);
      setLoading(false);

      // Fetch user info for new users found in messages
      const userIdsToFetch = Array.from(userIdsFromMessages).filter(
        (uid) => !usersInfo[uid] // Check if user info is already in state
      );

      if (userIdsToFetch.length > 0) {
        try {
          const userDocs = await getDocs(query(collection(db, 'users'), where('__name__', 'in', userIdsToFetch)));
          const newUsers: Record<string, UserInfo> = {};
          userDocs.forEach(userDoc => {
            const userData = userDoc.data() as UserData;
            newUsers[userDoc.id] = {
              name: userData.firstName || '', // Fallback to empty string if firstName is undefined
              avatar: userData.profilePictureUrl,
            };
          });
          setUsersInfo(prev => ({ ...prev, ...newUsers }));
        } catch (error) {
          console.error("Error fetching new user info from messages:", error);
        }
      }
    }, (error) => {
      console.error("Error fetching messages:", error);
      Alert.alert("Fout", "Kon de chatberichten niet laden.");
      setLoading(false);
    });

    // Listener for match document changes (for players and match name)
    const unsubscribeMatch = onSnapshot(
      doc(db, 'matches', matchId),
      async (matchDoc) => {
        if (matchDoc.exists()) {
          const matchData = matchDoc.data();
          setMatchName(matchData.clubName);
          const playerIds = matchData.players as string[];

          // Fetch user info for any new players
          const playerIdsToFetch = playerIds.filter(
            (uid) => !usersInfo[uid]
          );

          if (playerIdsToFetch.length > 0) {
            try {
              const userDocs = await getDocs(query(collection(db, 'users'), where('__name__', 'in', playerIdsToFetch)));
              const newUsers: Record<string, UserInfo> = {};
              userDocs.forEach(userDoc => {
                const userData = userDoc.data() as UserData;
                newUsers[userDoc.id] = {
                  name: userData.firstName || '',
                  avatar: userData.profilePictureUrl,
                };
              });
              setUsersInfo(prev => ({ ...prev, ...newUsers }));
            } catch (error) {
              console.error("Error fetching new user info from match players:", error);
            }
          }
        }
      },
      (error) => {
        console.error("Error fetching match data:", error);
      }
    );

    return () => {
      unsubscribeMessages();
      unsubscribeMatch();
    };
  }, [matchId]); // usersInfo is no longer in dependency array, avoiding re-subscriptions

  const handleSend = async () => {
    if (newMessage.trim() === '' || !currentUserId || !matchId || sending) {
      return;
    }
    setSending(true);
    const text = newMessage.trim();
    setNewMessage('');

    try {
      const messagesRef = collection(db, 'matches', matchId, 'messages');
      await addDoc(messagesRef, {
        text: text,
        createdAt: serverTimestamp(),
        userId: currentUserId,
      });
    } catch (error) {
      console.error('Error sending message: ', error);
      Alert.alert('Fout', 'Bericht kon niet worden verzonden.');
      setNewMessage(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#0e2432" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{matchName || 'Match Chat'}</Text>
        </View>

        {loading ? (
          <ActivityIndicator style={{ flex: 1 }} size="large" color="#007AFF" />
        ) : (
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.messagesContainer}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isMe={msg.userId === currentUserId}
                userInfo={usersInfo[msg.userId]}
              />
            ))}
          </ScrollView>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Typ een bericht..."
            multiline
          />
          <TouchableOpacity style={[styles.sendButton, (sending || newMessage.trim() === '') && styles.sendButtonDisabled]} onPress={handleSend} disabled={sending || newMessage.trim() === ''}>
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={20} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    justifyContent: 'center',
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF5',
    backgroundColor: '#fff',
  },
  backButton: {
    position: 'absolute',
    left: 15,
    padding: 5,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0e2432',
    marginHorizontal: 40,
  },
  messagesContainer: {
    padding: 10,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'flex-end',
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  theirMessageRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
  },
  myMessageBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  theirMessageBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#fff',
  },
  theirMessageText: {
    color: '#0e2432',
  },
  messageTime: {
    fontSize: 11,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  theirMessageTime: {
    color: '#999',
  },
  userName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  avatarInitials: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
    backgroundColor: '#fff',
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: '#F5F8FF',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#a9a9a9',
  },
});