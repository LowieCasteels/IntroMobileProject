import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_project/models/request.dart';
import 'package:flutter_project/models/appliance.dart';
import 'package:flutter_project/screens/request_helpers.dart';
import 'package:flutter_project/screens/chat_screen.dart';

class MessagesScreen extends StatefulWidget {
  const MessagesScreen({super.key});

  @override
  State<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends State<MessagesScreen> {
  static const Color _primaryGreen = Color(0xFF2DBA8D);
  static const Color _darkBg = Color(0xFF1A1A2E);

  late Stream<QuerySnapshot> _requestsStream;

  @override
  void initState() {
    super.initState();
    final currentUser = FirebaseAuth.instance.currentUser;
    if (currentUser != null) {
      _requestsStream = FirebaseFirestore.instance
          .collection('requests')
          .orderBy('createdAt', descending: true)
          .snapshots();
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentUser = FirebaseAuth.instance.currentUser;

    if (currentUser == null) {
      return const Scaffold(body: Center(child: Text('Je bent niet ingelogd')));
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F7),
      appBar: AppBar(
        backgroundColor: _darkBg,
        title: const Text(
          'Berichten',
          style: TextStyle(
            color: _primaryGreen,
            fontSize: 24,
            fontWeight: FontWeight.w900,
            letterSpacing: 1,
          ),
        ),
        elevation: 0,
      ),
      body: StreamBuilder<QuerySnapshot>(
        stream: _requestsStream,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }

          List<Request> requests =
              snapshot.data?.docs
                  .map((doc) => Request.fromFirestore(doc))
                  .toList() ??
              [];

          // Filter requests where user is involved and status is pending/accepted
          requests = requests
              .where(
                (r) =>
                    (r.ownerId == currentUser.uid ||
                        r.requesterId == currentUser.uid) &&
                    (r.status == 'pending' || r.status == 'accepted'),
              )
              .toList();

          // Separate by status
          final pendingRequests = requests
              .where((r) => r.status == 'pending')
              .toList();
          final acceptedRequests = requests
              .where((r) => r.status == 'accepted')
              .toList();

          if (pendingRequests.isEmpty && acceptedRequests.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.message_outlined,
                    size: 64,
                    color: Colors.grey[300],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Geen berichten',
                    style: TextStyle(
                      color: Colors.grey[500],
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Je hebt nog geen verzoeken',
                    style: TextStyle(color: Colors.grey[400], fontSize: 14),
                  ),
                ],
              ),
            );
          }

          return ListView(
            children: [
              if (pendingRequests.isNotEmpty) ...[
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: Text(
                    'In afwachting',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: Colors.grey[700],
                    ),
                  ),
                ),
                ...pendingRequests
                    .map(
                      (req) => _RequestCard(
                        key: ValueKey(req.id),
                        request: req,
                        currentUserId: currentUser.uid,
                        onAccept: currentUser.uid == req.ownerId
                            ? () => _handleAccept(req)
                            : null,
                        onDecline: currentUser.uid == req.ownerId
                            ? () => _handleDecline(req)
                            : null,
                        onCancel: currentUser.uid == req.requesterId
                            ? () => _handleCancel(req)
                            : null,
                        onTap: () => _navigateToChat(req),
                      ),
                    )
                    .toList(),
              ],
              if (acceptedRequests.isNotEmpty) ...[
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: Text(
                    'Geaccepteerd',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: Colors.grey[700],
                    ),
                  ),
                ),
                ...acceptedRequests
                    .map(
                      (req) => _RequestCard(
                        key: ValueKey(req.id),
                        request: req,
                        currentUserId: currentUser.uid,
                        onMarkAsReturned: currentUser.uid == req.ownerId
                            ? () =>
                                  showReturnConfirmationDialog(context, req.id)
                            : null,
                        onCancel: currentUser.uid == req.requesterId
                            ? () => _handleCancel(req)
                            : null,
                        onTap: () => _navigateToChat(req),
                      ),
                    )
                    .toList(),
              ],
            ],
          );
        },
      ),
    );
  }

  Future<void> _handleAccept(Request request) async {
    try {
      await FirebaseFirestore.instance
          .collection('requests')
          .doc(request.id)
          .update({'status': 'accepted', 'respondedAt': Timestamp.now()});
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Fout bij accepteren')));
    }
  }

  Future<void> _handleDecline(Request request) async {
    try {
      await FirebaseFirestore.instance
          .collection('requests')
          .doc(request.id)
          .delete();
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Fout bij weigeren')));
    }
  }

  Future<void> _handleCancel(Request request) async {
    try {
      await FirebaseFirestore.instance
          .collection('requests')
          .doc(request.id)
          .delete();
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Fout bij annuleren')));
    }
  }

  void _navigateToChat(Request request) {
    Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => ChatScreen(request: request)));
  }
}

class _RequestCard extends StatefulWidget {
  final Request request;
  final String currentUserId;
  final VoidCallback? onAccept;
  final VoidCallback? onDecline;
  final VoidCallback? onMarkAsReturned;
  final VoidCallback? onCancel;
  final VoidCallback onTap;

  const _RequestCard({
    super.key,
    required this.request,
    required this.currentUserId,
    this.onAccept,
    this.onDecline,
    this.onMarkAsReturned,
    required this.onCancel,
    required this.onTap,
  });

  @override
  State<_RequestCard> createState() => _RequestCardState();
}

class _RequestCardState extends State<_RequestCard> {
  late Future<DocumentSnapshot> _applianceFuture;
  late Future<DocumentSnapshot> _otherUserFuture;

  @override
  void initState() {
    super.initState();
    _applianceFuture = FirebaseFirestore.instance
        .collection('appliances')
        .doc(widget.request.applianceId)
        .get();

    final otherUserId = widget.currentUserId == widget.request.ownerId
        ? widget.request.requesterId
        : widget.request.ownerId;

    _otherUserFuture = FirebaseFirestore.instance
        .collection('flutterUsers')
        .doc(otherUserId)
        .get();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<DocumentSnapshot>(
      future: _applianceFuture,
      builder: (context, applianceSnapshot) {
        if (applianceSnapshot.connectionState == ConnectionState.waiting) {
          return const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Center(child: CircularProgressIndicator()),
          );
        }

        if (!applianceSnapshot.hasData || !applianceSnapshot.data!.exists) {
          return const SizedBox.shrink();
        }

        final appliance = Appliance.fromFirestore(applianceSnapshot.data!);

        return FutureBuilder<DocumentSnapshot>(
          future: _otherUserFuture,
          builder: (context, userSnapshot) {
            if (userSnapshot.connectionState == ConnectionState.waiting) {
              return const SizedBox.shrink();
            }

            final userData = userSnapshot.hasData && userSnapshot.data!.exists
                ? userSnapshot.data!.data() as Map<String, dynamic>
                : null;
            final otherUserName = userData?['name'] ?? 'Onbekend';

            final isOwner = widget.currentUserId == widget.request.ownerId;

            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 12,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    // Item preview + info
                    InkWell(
                      onTap: widget.onTap,
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Row(
                          children: [
                            // Item image
                            Container(
                              width: 60,
                              height: 60,
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
                            // Item details
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    appliance.title,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w700,
                                      color: Color(0xFF1A1A2E),
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    isOwner
                                        ? 'Verzoek van $otherUserName'
                                        : 'Voor eigenaar $otherUserName',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: Color(0xFF8A8A8A),
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  if (appliance.transactionType == 'huur')
                                    Text(
                                      '€${appliance.price.toStringAsFixed(0)}/dag',
                                      style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                        color: Color(0xFF2DBA8D),
                                      ),
                                    ),
                                  if (widget.request.startDate != null &&
                                      widget.request.endDate != null) ...[
                                    const SizedBox(height: 4),
                                    Text(
                                      'Periode: ${widget.request.startDate!.toDate().day}/${widget.request.startDate!.toDate().month} - ${widget.request.endDate!.toDate().day}/${widget.request.endDate!.toDate().month}',
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: Color(0xFF8A8A8A),
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    // Action buttons
                    if (widget.onAccept != null ||
                        widget.onDecline != null ||
                        widget.onCancel != null ||
                        widget.onMarkAsReturned != null)
                      Padding(
                        padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            if (widget.onDecline != null)
                              TextButton(
                                onPressed: widget.onDecline,
                                child: const Text(
                                  'Weigeren',
                                  style: TextStyle(
                                    color: Colors.red,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            const SizedBox(width: 8),
                            if (widget.onAccept != null)
                              ElevatedButton(
                                onPressed: widget.onAccept,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF2DBA8D),
                                ),
                                child: const Text(
                                  'Accepteren',
                                  style: TextStyle(color: Colors.white),
                                ),
                              ),
                            if (widget.onMarkAsReturned != null)
                              ElevatedButton(
                                onPressed: widget.onMarkAsReturned,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF2DBA8D),
                                ),
                                child: const Text(
                                  'Markeer als geretourneerd',
                                  style: TextStyle(color: Colors.white),
                                ),
                              ),
                            if (widget.onCancel != null &&
                                widget.onAccept == null)
                              TextButton(
                                onPressed: widget.onCancel,
                                child: const Text(
                                  'Annuleren',
                                  style: TextStyle(
                                    color: Colors.red,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            // Show status message for requester when pending
                            if (widget.onAccept == null &&
                                widget.onCancel == null &&
                                widget.onDecline == null &&
                                widget.onMarkAsReturned == null)
                              Padding(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 8,
                                ),
                                child: Text(
                                  'Verzoek gestuurd',
                                  style: TextStyle(
                                    color: Colors.grey[600],
                                    fontWeight: FontWeight.w600,
                                    fontSize: 14,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                  ],
                ),
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
