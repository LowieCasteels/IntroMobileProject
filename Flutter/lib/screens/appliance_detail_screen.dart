import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_project/models/appliance.dart';
import 'package:intl/intl.dart';
import 'package:flutter_project/services/notification_service.dart';

class ApplianceDetailScreen extends StatefulWidget {
  final Appliance appliance;

  const ApplianceDetailScreen({super.key, required this.appliance});

  @override
  State<ApplianceDetailScreen> createState() => _ApplianceDetailScreenState();
}

class _ApplianceDetailScreenState extends State<ApplianceDetailScreen> {
  late Future<DocumentSnapshot> _ownerFuture;
  late Future<List<Map<String, dynamic>>> _reviewsFuture;
  bool _isCurrentUserOwner = false;
  DateTimeRange? _selectedDateRange;
  bool _isLoading = false;

  static const Color _primaryGreen = Color(0xFF2DBA8D);
  static const Color _darkBg = Color(0xFF1A1A2E);

  @override
  void initState() {
    super.initState();
    _ownerFuture = FirebaseFirestore.instance
        .collection('flutterUsers')
        .doc(widget.appliance.ownerId)
        .get();
    _reviewsFuture = _fetchReviews();

    final currentUser = FirebaseAuth.instance.currentUser;
    _isCurrentUserOwner =
        currentUser != null && currentUser.uid == widget.appliance.ownerId;
  }

  Future<List<Map<String, dynamic>>> _fetchReviews() async {
    final List<Map<String, dynamic>> reviews = [];
    try {
      final requestsSnapshot = await FirebaseFirestore.instance
          .collection('requests')
          .where('applianceId', isEqualTo: widget.appliance.id)
          .where('status', isEqualTo: 'returned')
          .orderBy('respondedAt', descending: true)
          .get();

      final requestsWithReviews = requestsSnapshot.docs.where((doc) {
        final data = doc.data();
        // A review is valid if it has a rating. The text is optional.
        return data.containsKey('ownerRating') && data['ownerRating'] != null;
      }).toList();

      if (requestsWithReviews.isEmpty) return [];

      final userFutures = requestsWithReviews.map((requestDoc) {
        final requesterId = requestDoc.data()['requesterId'];
        return FirebaseFirestore.instance
            .collection('flutterUsers')
            .doc(requesterId)
            .get();
      }).toList();

      final userSnapshots = await Future.wait(userFutures);

      for (var i = 0; i < requestsWithReviews.length; i++) {
        final requestDoc = requestsWithReviews[i];
        final userDoc = userSnapshots[i];

        if (userDoc.exists) {
          final requestData = requestDoc.data();
          final userData = userDoc.data()!;
          reviews.add({
            'rating': (requestData['ownerRating'] as num?)?.toDouble() ?? 0.0,
            'review': requestData['ownerReview'], // Can be null
            'reviewerName': userData['name'] ?? 'Anoniem',
            'reviewerPhotoUrl': userData['photoUrl'],
            'reviewerPhotoBase64': userData['photoBase64'],
          });
        }
      }
    } catch (e) {
      print('Error fetching reviews: $e');
    }
    return reviews;
  }

  String _formatPrice(double price) {
    if (price == price.roundToDouble()) {
      return price.toInt().toString();
    }
    return price.toStringAsFixed(2);
  }

  Future<void> _selectDateRange() async {
    final newDateRange = await showDateRangePicker(
      context: context,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      initialDateRange: _selectedDateRange,
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: _primaryGreen, // header background color
              onPrimary: Colors.white, // header text color
              onSurface: Colors.black, // body text color
            ),
            textButtonTheme: TextButtonThemeData(
              style: TextButton.styleFrom(
                foregroundColor: _primaryGreen, // button text color
              ),
            ),
          ),
          child: child!,
        );
      },
    );

    if (newDateRange != null) {
      setState(() {
        _selectedDateRange = newDateRange;
      });
    }
  }

  Future<void> _handleRequestButton() async {
    final currentUser = FirebaseAuth.instance.currentUser;
    if (currentUser == null) return;

    if (_selectedDateRange == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Selecteer een huurperiode.'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    final existingRequest = await FirebaseFirestore.instance
        .collection('requests')
        .where('applianceId', isEqualTo: widget.appliance.id)
        .where('requesterId', isEqualTo: currentUser.uid)
        .where('status', whereIn: ['pending', 'accepted'])
        .limit(1)
        .get();

    if (existingRequest.docs.isNotEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Je hebt al een verzoek voor dit item!'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final newRequestRef = await FirebaseFirestore.instance
          .collection('requests')
          .add({
            'applianceId': widget.appliance.id,
            'ownerId': widget.appliance.ownerId,
            'requesterId': currentUser.uid,
            'status': 'pending',
            'startDate': Timestamp.fromDate(_selectedDateRange!.start),
            'endDate': Timestamp.fromDate(_selectedDateRange!.end),
            'createdAt': Timestamp.now(),
            'respondedAt': null,
          });

      // Stuur een notificatie naar de eigenaar
      final requesterDoc = await FirebaseFirestore.instance
          .collection('flutterUsers')
          .doc(currentUser.uid)
          .get();
      final requesterName = requesterDoc.data()?['name'] ?? 'Iemand';

      await NotificationService().createNotification(
        userId: widget.appliance.ownerId,
        title: 'Nieuw verzoek voor "${widget.appliance.title}"',
        body: '$requesterName wil je item huren of lenen.',
        requestId: newRequestRef.id,
      );

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            widget.appliance.transactionType == 'huur'
                ? 'Huurverzoek verzonden!'
                : 'Leenverzoek verzonden!',
          ),
          backgroundColor: _primaryGreen,
        ),
      );

      Navigator.of(context).pop();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Fout bij verzenden verzoek'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final appliance = widget.appliance;
    final isForRent = appliance.transactionType == 'huur';

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F7),
      body: Stack(
        children: [
          // Scrollable content
          CustomScrollView(
            slivers: [
              // ── Hero Image AppBar ──────────────────────────────────────────
              SliverAppBar(
                expandedHeight: 320,
                pinned: true,
                backgroundColor: _darkBg,
                leading: Padding(
                  padding: const EdgeInsets.all(8.0),
                  child: CircleAvatar(
                    backgroundColor: Colors.black45,
                    child: IconButton(
                      icon: const Icon(Icons.arrow_back, color: Colors.white),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ),
                ),
                flexibleSpace: FlexibleSpaceBar(
                  background: Stack(
                    fit: StackFit.expand,
                    children: [
                      // Image
                      appliance.base64Image.isNotEmpty
                          ? Image.memory(
                              base64Decode(appliance.base64Image),
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) =>
                                  _buildImagePlaceholder(),
                            )
                          : _buildImagePlaceholder(),
                      // Gradient overlay at bottom
                      const DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.transparent,
                              Colors.transparent,
                              Color(0x88000000),
                            ],
                            stops: [0.0, 0.5, 1.0],
                          ),
                        ),
                      ),
                      // Badge
                      Positioned(
                        bottom: 16,
                        left: 16,
                        child: _Badge(
                          label: isForRent ? 'Te huur' : 'Te leen',
                          icon: isForRent ? Icons.payments : Icons.handshake,
                          color: _primaryGreen,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // ── Content ────────────────────────────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 120),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Title + Price row
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Text(
                              appliance.title,
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF1A1A2E),
                                height: 1.2,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                isForRent
                                    ? '€${_formatPrice(appliance.price)}'
                                    : 'Gratis',
                                style: const TextStyle(
                                  fontSize: 26,
                                  fontWeight: FontWeight.w900,
                                  color: _primaryGreen,
                                ),
                              ),
                              if (isForRent)
                                const Text(
                                  'per dag',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Color(0xFF8A8A8A),
                                  ),
                                ),
                            ],
                          ),
                        ],
                      ),

                      const SizedBox(height: 12),

                      // Category chip
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: _primaryGreen.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          appliance.category,
                          style: const TextStyle(
                            color: _primaryGreen,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),

                      const SizedBox(height: 24),
                      const Divider(color: Color(0xFFEEEEEE)),
                      const SizedBox(height: 20),

                      // Description
                      const Text(
                        'Huurperiode',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF1A1A2E),
                        ),
                      ),
                      const SizedBox(height: 12),
                      InkWell(
                        onTap: _selectDateRange,
                        borderRadius: BorderRadius.circular(14),
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: const Color(0xFFEEEEEE)),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                _selectedDateRange == null
                                    ? 'Kies start- en einddatum'
                                    : '${DateFormat('dd/MM/yyyy').format(_selectedDateRange!.start)} - ${DateFormat('dd/MM/yyyy').format(_selectedDateRange!.end)}',
                                style: const TextStyle(
                                  fontSize: 14,
                                  color: Color(0xFF333333),
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const Icon(
                                Icons.calendar_today,
                                color: _primaryGreen,
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      const Divider(color: Color(0xFFEEEEEE)),
                      const SizedBox(height: 20),

                      // Description
                      const Text(
                        'Beschrijving',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF1A1A2E),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        appliance.description,
                        style: const TextStyle(
                          fontSize: 15,
                          color: Color(0xFF555555),
                          height: 1.6,
                        ),
                      ),

                      const SizedBox(height: 24),
                      const Divider(color: Color(0xFFEEEEEE)),
                      const SizedBox(height: 20),

                      // Location
                      const Text(
                        'Locatie',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF1A1A2E),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFFEEEEEE)),
                        ),
                        child: Row(
                          children: [
                            const CircleAvatar(
                              radius: 18,
                              backgroundColor: Color(0xFFE8F8F4),
                              child: Icon(
                                Icons.location_on,
                                color: _primaryGreen,
                                size: 18,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                appliance.address,
                                style: const TextStyle(
                                  fontSize: 14,
                                  color: Color(0xFF333333),
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 24),
                      const Divider(color: Color(0xFFEEEEEE)),
                      const SizedBox(height: 20),

                      // Owner info
                      const Text(
                        'Aangeboden door',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF1A1A2E),
                        ),
                      ),
                      const SizedBox(height: 12),
                      FutureBuilder<DocumentSnapshot>(
                        future: _ownerFuture,
                        builder: (context, snapshot) {
                          if (snapshot.connectionState ==
                              ConnectionState.waiting) {
                            return const Center(
                              child: CircularProgressIndicator(),
                            );
                          }
                          if (snapshot.hasError ||
                              !snapshot.hasData ||
                              !snapshot.data!.exists) {
                            return const Text('Gebruiker niet gevonden');
                          }

                          final userData =
                              snapshot.data!.data() as Map<String, dynamic>;
                          final ownerName = userData['name'] ?? 'Onbekend';

                          ImageProvider? ownerPhoto;
                          if (userData['photoBase64'] != null) {
                            ownerPhoto = MemoryImage(
                              base64Decode(userData['photoBase64']),
                            );
                          } else if (userData['photoUrl'] != null) {
                            final String photoUrl = userData['photoUrl'];
                            if (photoUrl.startsWith('base64:')) {
                              ownerPhoto = MemoryImage(
                                base64Decode(photoUrl.substring(7)),
                              );
                            } else if (photoUrl.isNotEmpty) {
                              ownerPhoto = NetworkImage(photoUrl);
                            }
                          }

                          return Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: const Color(0xFFEEEEEE),
                              ),
                            ),
                            child: Row(
                              children: [
                                // Avatar
                                SizedBox(
                                  width: 52,
                                  height: 52,
                                  child: ClipOval(
                                    child: ownerPhoto == null
                                        ? Container(
                                            color: const Color(0xFFE8F8F4),
                                            alignment: Alignment.center,
                                            child: Text(
                                              ownerName.isNotEmpty
                                                  ? ownerName[0].toUpperCase()
                                                  : '?',
                                              style: const TextStyle(
                                                fontSize: 20,
                                                fontWeight: FontWeight.w700,
                                                color: _primaryGreen,
                                              ),
                                            ),
                                          )
                                        : ownerPhoto is MemoryImage
                                        ? Image(
                                            image: ownerPhoto,
                                            fit: BoxFit.cover,
                                          )
                                        : Image.network(
                                            (ownerPhoto as NetworkImage).url,
                                            fit: BoxFit.cover,
                                            errorBuilder: (_, __, ___) =>
                                                Container(
                                                  color: const Color(
                                                    0xFFE8F8F4,
                                                  ),
                                                  alignment: Alignment.center,
                                                  child: Text(
                                                    ownerName.isNotEmpty
                                                        ? ownerName[0]
                                                              .toUpperCase()
                                                        : '?',
                                                    style: const TextStyle(
                                                      fontSize: 20,
                                                      fontWeight:
                                                          FontWeight.w700,
                                                      color: _primaryGreen,
                                                    ),
                                                  ),
                                                ),
                                          ),
                                  ),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        ownerName,
                                        style: const TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w700,
                                          color: Color(0xFF1A1A2E),
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      const Text(
                                        'Eigenaar',
                                        style: TextStyle(
                                          fontSize: 13,
                                          color: Color(0xFF8A8A8A),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),

                      const SizedBox(height: 24),
                      const Divider(color: Color(0xFFEEEEEE)),
                      const SizedBox(height: 20),

                      // Reviews Section
                      _buildReviewsSection(),
                    ],
                  ),
                ),
              ),
            ],
          ),

          // ── Bottom Action Bar ──────────────────────────────────────────────
          if (!_isCurrentUserOwner)
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Container(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
                decoration: BoxDecoration(
                  color: Colors.white,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.08),
                      blurRadius: 20,
                      offset: const Offset(0, -4),
                    ),
                  ],
                ),
                child: ElevatedButton.icon(
                  onPressed: _isLoading ? null : _handleRequestButton,
                  icon: Icon(
                    isForRent
                        ? Icons.payments_outlined
                        : Icons.handshake_outlined,
                    color: Colors.white,
                  ),
                  label: _isLoading
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 3,
                          ),
                        )
                      : Text(
                          isForRent ? 'Huur aanvragen' : 'Leen aanvragen',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 17,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _primaryGreen,
                    minimumSize: const Size(double.infinity, 56),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    elevation: 0,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildImagePlaceholder() {
    return Container(
      color: const Color(0xFFEEEEEE),
      child: const Center(
        child: Icon(Icons.camera_alt, size: 60, color: Color(0xFFCCCCCC)),
      ),
    );
  }

  Widget _buildReviewsSection() {
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: _reviewsFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Beoordelingen',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF1A1A2E),
                ),
              ),
              const SizedBox(height: 12),
              const Center(child: CircularProgressIndicator()),
            ],
          );
        }

        final reviews = snapshot.data ?? [];
        final reviewCount = reviews.length;
        final double averageRating = reviewCount > 0
            ? reviews
                      .map((r) => r['rating'] as double)
                      .reduce((a, b) => a + b) /
                  reviewCount
            : 0.0;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                const Text(
                  'Beoordelingen',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1A1A2E),
                  ),
                ),
                if (reviewCount > 0) ...[
                  const SizedBox(width: 10),
                  const Icon(Icons.star, color: Colors.amber, size: 20),
                  const SizedBox(width: 4),
                  Text(
                    '${averageRating.toStringAsFixed(1)} (${reviewCount} beoordeling${reviewCount == 1 ? '' : 'en'})',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF555555),
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 12),
            if (snapshot.hasError || reviews.isEmpty)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFEEEEEE)),
                ),
                child: Center(
                  child: Text(
                    snapshot.hasError
                        ? 'Fout bij laden van beoordelingen.'
                        : 'Nog geen beoordelingen voor dit item.',
                    style: const TextStyle(color: Colors.grey),
                  ),
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: reviews.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  return _ReviewCard(review: reviews[index]);
                },
              ),
          ],
        );
      },
    );
  }
}

// ── Badge widget (reused from home_screen style) ───────────────────────────────

class _Badge extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  const _Badge({required this.label, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.4),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: Colors.white),
          const SizedBox(width: 5),
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.8,
            ),
          ),
        ],
      ),
    );
  }
}

class _ReviewCard extends StatelessWidget {
  final Map<String, dynamic> review;

  const _ReviewCard({required this.review});

  @override
  Widget build(BuildContext context) {
    final reviewerName = review['reviewerName'] as String;
    final rating = review['rating'] as double;
    final reviewText = review['review'] as String?;

    ImageProvider? reviewerPhoto;
    if (review['reviewerPhotoBase64'] != null) {
      reviewerPhoto = MemoryImage(base64Decode(review['reviewerPhotoBase64']));
    } else if (review['reviewerPhotoUrl'] != null) {
      final String photoUrl = review['reviewerPhotoUrl'];
      if (photoUrl.startsWith('base64:')) {
        reviewerPhoto = MemoryImage(base64Decode(photoUrl.substring(7)));
      } else if (photoUrl.isNotEmpty) {
        reviewerPhoto = NetworkImage(photoUrl);
      }
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFEEEEEE)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              // Avatar
              CircleAvatar(
                radius: 20,
                backgroundColor: const Color(0xFFE8F8F4),
                backgroundImage: reviewerPhoto,
                child: reviewerPhoto == null
                    ? Text(
                        reviewerName.isNotEmpty
                            ? reviewerName[0].toUpperCase()
                            : '?',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF2DBA8D),
                        ),
                      )
                    : null,
              ),
              const SizedBox(width: 12),
              // Name and Stars
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      reviewerName,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF1A1A2E),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: List.generate(5, (index) {
                        return Icon(
                          index < rating ? Icons.star : Icons.star_border,
                          color: Colors.amber,
                          size: 16,
                        );
                      }),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (reviewText != null && reviewText.trim().isNotEmpty) ...[
            const SizedBox(height: 12),
            // Review text
            Text(
              reviewText,
              style: const TextStyle(color: Color(0xFF555555), height: 1.5),
            ),
          ],
        ],
      ),
    );
  }
}
