import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:intl/intl.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:flutter_project/models/request.dart';
import 'package:flutter_project/screens/chat_screen.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final _userId = FirebaseAuth.instance.currentUser?.uid;
  String? _navigatingNotificationId;

  @override
  void initState() {
    super.initState();
    initializeDateFormatting('nl_NL');
    if (_userId != null) {
      _markNotificationsAsRead();
    }
  }

  Future<void> _markNotificationsAsRead() async {
    final notificationsRef = FirebaseFirestore.instance
        .collection('flutterUsers')
        .doc(_userId)
        .collection('notifications');

    final unreadSnapshot = await notificationsRef
        .where('isRead', isEqualTo: false)
        .get();

    if (unreadSnapshot.docs.isEmpty) return;

    final batch = FirebaseFirestore.instance.batch();
    for (final doc in unreadSnapshot.docs) {
      batch.update(doc.reference, {'isRead': true});
    }
    await batch.commit();
  }

  Future<void> _clearAllNotifications() async {
    if (_userId == null) return;

    final notificationsRef = FirebaseFirestore.instance
        .collection('flutterUsers')
        .doc(_userId)
        .collection('notifications');

    // Firestore batches are limited, so we delete in chunks if necessary.
    final snapshot = await notificationsRef.limit(500).get();

    if (snapshot.docs.isEmpty) return;

    final batch = FirebaseFirestore.instance.batch();
    for (final doc in snapshot.docs) {
      batch.delete(doc.reference);
    }
    await batch.commit();
  }

  void _showClearConfirmationDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Alles verwijderen?'),
        content: const Text(
          'Weet je zeker dat je alle notificaties wilt verwijderen?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Annuleren'),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              _clearAllNotifications();
            },
            child: const Text(
              'Verwijderen',
              style: TextStyle(color: Colors.red),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _handleNotificationTap(
    String notificationId,
    Map<String, dynamic> notification,
  ) async {
    if (_navigatingNotificationId != null) return;

    final String? requestId = notification['requestId'];
    if (requestId == null) return;

    setState(() {
      _navigatingNotificationId = notificationId;
    });

    try {
      final requestDoc = await FirebaseFirestore.instance
          .collection('requests')
          .doc(requestId)
          .get();

      if (requestDoc.exists && mounted) {
        final request = Request.fromFirestore(requestDoc);
        Navigator.of(
          context,
        ).push(MaterialPageRoute(builder: (_) => ChatScreen(request: request)));
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('De bijbehorende aanvraag is niet meer beschikbaar.'),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Kon de details niet laden.')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _navigatingNotificationId = null);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notificaties'),
        backgroundColor: const Color(0xFF1A1A2E),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_sweep_outlined),
            tooltip: 'Verwijder alle notificaties',
            onPressed: _showClearConfirmationDialog,
          ),
        ],
      ),
      body: _userId == null
          ? const Center(child: Text('Je moet ingelogd zijn.'))
          : StreamBuilder<QuerySnapshot>(
              stream: FirebaseFirestore.instance
                  .collection('flutterUsers')
                  .doc(_userId)
                  .collection('notifications')
                  .orderBy('createdAt', descending: true)
                  .limit(20)
                  .snapshots(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
                  return const Center(
                    child: Text('Geen notificaties gevonden.'),
                  );
                }

                final docs = snapshot.data!.docs;

                return ListView.separated(
                  itemCount: docs.length,
                  separatorBuilder: (context, index) =>
                      const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final doc = docs[index];
                    final notification = doc.data() as Map<String, dynamic>;
                    final notificationId = doc.id;
                    final title = notification['title'] ?? '';
                    final body = notification['body'] ?? '';
                    final timestamp = (notification['createdAt'] as Timestamp?)
                        ?.toDate(); // Ensure timestamp is handled correctly

                    final isRead = notification['isRead'] ?? true;
                    final requestId = notification['requestId'] as String?;

                    final isNavigating =
                        _navigatingNotificationId == notificationId;

                    return ListTile(
                      leading: isNavigating
                          ? const SizedBox(
                              width: 24,
                              height: 24,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.0,
                              ),
                            )
                          : Icon(
                              isRead
                                  ? Icons.notifications_none
                                  : Icons.notifications,
                              color: isRead
                                  ? Colors.grey
                                  : const Color(0xFF2DBA8D),
                            ),
                      title: Text(
                        title,
                        style: TextStyle(
                          fontWeight: isRead
                              ? FontWeight.normal
                              : FontWeight.bold,
                        ),
                      ),
                      subtitle: Text(body),
                      trailing: timestamp != null
                          ? Text(
                              DateFormat(
                                'dd MMM HH:mm',
                                'nl_NL',
                              ).format(timestamp),
                              style: const TextStyle(
                                fontSize: 12,
                                color: Colors.grey,
                              ),
                            )
                          : null,
                      onTap: requestId != null
                          ? () => _handleNotificationTap(
                              notificationId,
                              notification,
                            )
                          : null,
                      enabled: _navigatingNotificationId == null,
                    );
                  },
                );
              },
            ),
    );
  }
}
