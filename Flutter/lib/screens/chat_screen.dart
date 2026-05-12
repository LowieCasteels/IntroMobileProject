import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_project/models/request.dart';
import 'package:flutter_project/models/appliance.dart';
import 'package:flutter_project/services/notification_service.dart';

class ChatScreen extends StatefulWidget {
  final Request request;

  const ChatScreen({super.key, required this.request});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  static const Color _primaryGreen = Color(0xFF2DBA8D);
  static const Color _darkBg = Color(0xFF1A1A2E);

  final TextEditingController _messageController = TextEditingController();
  late Future<DocumentSnapshot> _applianceFuture;
  late Future<DocumentSnapshot> _otherUserFuture;
  late Stream<QuerySnapshot> _messagesStream;

  @override
  void initState() {
    super.initState();
    final currentUser = FirebaseAuth.instance.currentUser;

    _applianceFuture = FirebaseFirestore.instance
        .collection('appliances')
        .doc(widget.request.applianceId)
        .get();

    final otherUserId = currentUser?.uid == widget.request.ownerId
        ? widget.request.requesterId
        : widget.request.ownerId;

    _otherUserFuture = FirebaseFirestore.instance
        .collection('flutterUsers')
        .doc(otherUserId)
        .get();

    _messagesStream = FirebaseFirestore.instance
        .collection('requests')
        .doc(widget.request.id)
        .collection('messages')
        .orderBy('timestamp', descending: true)
        .snapshots();
  }

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _sendMessage() async {
    final currentUser = FirebaseAuth.instance.currentUser;
    if (_messageController.text.trim().isEmpty || currentUser == null) return;

    final text = _messageController.text.trim();
    _messageController.clear();

    try {
      await FirebaseFirestore.instance
          .collection('requests')
          .doc(widget.request.id)
          .collection('messages')
          .add({
            'senderId': currentUser.uid,
            'text': text,
            'timestamp': Timestamp.now(),
          });

      // Stuur een notificatie naar de ontvanger
      final otherUserId = currentUser.uid == widget.request.ownerId
          ? widget.request.requesterId
          : widget.request.ownerId;

      final senderDoc = await FirebaseFirestore.instance
          .collection('flutterUsers')
          .doc(currentUser.uid)
          .get();
      final senderName = senderDoc.data()?['name'] ?? 'Iemand';

      await NotificationService().createNotification(
        userId: otherUserId,
        title: 'Nieuw bericht van $senderName',
        body: text,
        requestId: widget.request.id,
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Fout bij verzenden bericht')),
      );
      _messageController.text = text;
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<DocumentSnapshot>(
      future: _applianceFuture,
      builder: (context, applianceSnapshot) {
        if (applianceSnapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        if (!applianceSnapshot.hasData || !applianceSnapshot.data!.exists) {
          return Scaffold(
            appBar: AppBar(title: const Text('Chat'), backgroundColor: _darkBg),
            body: const Center(child: Text('Item niet gevonden')),
          );
        }

        final appliance = Appliance.fromFirestore(applianceSnapshot.data!);

        return FutureBuilder<DocumentSnapshot>(
          future: _otherUserFuture,
          builder: (context, userSnapshot) {
            final otherUserName =
                userSnapshot.hasData && userSnapshot.data!.exists
                ? (userSnapshot.data!.data() as Map<String, dynamic>)['name'] ??
                      'Onbekend'
                : 'Onbekend';

            return Scaffold(
              backgroundColor: const Color(0xFFF5F5F7),
              appBar: AppBar(
                backgroundColor: _darkBg,
                leading: IconButton(
                  icon: const Icon(Icons.arrow_back, color: Colors.white),
                  onPressed: () => Navigator.of(context).pop(),
                ),
                title: Text(
                  otherUserName,
                  style: const TextStyle(color: Colors.white),
                ),
                elevation: 0,
              ),
              body: Column(
                children: [
                  // Item preview card
                  Container(
                    margin: const EdgeInsets.all(12),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.05),
                          blurRadius: 12,
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        // Image
                        Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(8),
                            color: Colors.grey[200],
                          ),
                          child: appliance.base64Image.isNotEmpty
                              ? ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: Image.memory(
                                    base64Decode(appliance.base64Image),
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) =>
                                        _buildImagePlaceholder(),
                                  ),
                                )
                              : _buildImagePlaceholder(),
                        ),
                        const SizedBox(width: 12),
                        // Details
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                appliance.title,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF1A1A2E),
                                ),
                              ),
                              const SizedBox(height: 6),
                              if (appliance.transactionType == 'huur') ...[
                                Text(
                                  '€${appliance.price.toStringAsFixed(0)}/dag',
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: _primaryGreen,
                                  ),
                                ),
                              ] else
                                const Text(
                                  'Te leen',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: _primaryGreen,
                                  ),
                                ),
                              if (widget.request.startDate != null &&
                                  widget.request.endDate != null) ...[
                                const SizedBox(height: 4),
                                Text(
                                  'Periode: ${widget.request.startDate!.toDate().day}/${widget.request.startDate!.toDate().month} - ${widget.request.endDate!.toDate().day}/${widget.request.endDate!.toDate().month}',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Messages
                  Expanded(
                    child: StreamBuilder<QuerySnapshot>(
                      stream: _messagesStream,
                      builder: (context, snapshot) {
                        if (snapshot.connectionState ==
                            ConnectionState.waiting) {
                          return const Center(
                            child: CircularProgressIndicator(),
                          );
                        }

                        if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
                          return Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.chat_bubble_outline,
                                  size: 48,
                                  color: Colors.grey[300],
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  'Nog geen berichten',
                                  style: TextStyle(
                                    color: Colors.grey[500],
                                    fontSize: 16,
                                  ),
                                ),
                              ],
                            ),
                          );
                        }

                        final messages = snapshot.data!.docs
                            .map(
                              (doc) => {
                                'id': doc.id,
                                'senderId': doc['senderId'],
                                'text': doc['text'],
                                'timestamp': (doc['timestamp'] as Timestamp)
                                    .toDate(),
                              },
                            )
                            .toList();

                        final currentUserId =
                            FirebaseAuth.instance.currentUser!.uid;

                        return ListView.builder(
                          reverse: true,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                          itemCount: messages.length,
                          itemBuilder: (context, index) {
                            final msg = messages[index];
                            final isSender = msg['senderId'] == currentUserId;
                            final timestamp = msg['timestamp'] as DateTime;
                            final timeStr =
                                '${timestamp.hour}:${timestamp.minute.toString().padLeft(2, '0')}';

                            return Align(
                              alignment: isSender
                                  ? Alignment.centerRight
                                  : Alignment.centerLeft,
                              child: Container(
                                margin: const EdgeInsets.symmetric(
                                  horizontal: 4,
                                  vertical: 4,
                                ),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 8,
                                ),
                                decoration: BoxDecoration(
                                  color: isSender
                                      ? _primaryGreen
                                      : Colors.white,
                                  borderRadius: BorderRadius.circular(12),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.05),
                                      blurRadius: 4,
                                    ),
                                  ],
                                ),
                                child: Column(
                                  crossAxisAlignment: isSender
                                      ? CrossAxisAlignment.end
                                      : CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      msg['text'],
                                      style: TextStyle(
                                        fontSize: 14,
                                        color: isSender
                                            ? Colors.white
                                            : Colors.black,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      timeStr,
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: isSender
                                            ? Colors.white70
                                            : Colors.grey,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        );
                      },
                    ),
                  ),
                  // Message input
                  Container(
                    padding: const EdgeInsets.fromLTRB(12, 12, 12, 16),
                    color: Colors.white,
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _messageController,
                            decoration: InputDecoration(
                              hintText: 'Schrijf een bericht...',
                              hintStyle: const TextStyle(color: Colors.grey),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(20),
                                borderSide: const BorderSide(
                                  color: Color(0xFFE0E0E0),
                                ),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(20),
                                borderSide: const BorderSide(
                                  color: _primaryGreen,
                                ),
                              ),
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 12,
                              ),
                            ),
                            maxLines: null,
                            onSubmitted: (_) => _sendMessage(),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          decoration: const BoxDecoration(
                            color: _primaryGreen,
                            shape: BoxShape.circle,
                          ),
                          child: IconButton(
                            icon: const Icon(Icons.send, color: Colors.white),
                            onPressed: _sendMessage,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildImagePlaceholder() {
    return Container(
      color: Colors.grey[200],
      child: const Icon(Icons.image_not_supported, color: Colors.grey),
    );
  }
}
