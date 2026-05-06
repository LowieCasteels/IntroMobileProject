import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_project/models/appliance.dart';

class ApplianceDetailScreen extends StatefulWidget {
  final Appliance appliance;

  const ApplianceDetailScreen({super.key, required this.appliance});

  @override
  State<ApplianceDetailScreen> createState() => _ApplianceDetailScreenState();
}

class _ApplianceDetailScreenState extends State<ApplianceDetailScreen> {
  late Future<DocumentSnapshot> _ownerFuture;
  bool _isCurrentUserOwner = false;

  static const Color _primaryGreen = Color(0xFF2DBA8D);
  static const Color _darkBg = Color(0xFF1A1A2E);

  @override
  void initState() {
    super.initState();
    _ownerFuture = FirebaseFirestore.instance
        .collection('flutterUsers')
        .doc(widget.appliance.ownerId)
        .get();

    final currentUser = FirebaseAuth.instance.currentUser;
    _isCurrentUserOwner =
        currentUser != null && currentUser.uid == widget.appliance.ownerId;
  }

  String _formatPrice(double price) {
    if (price == price.roundToDouble()) {
      return price.toInt().toString();
    }
    return price.toStringAsFixed(2);
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
                  onPressed: () {
                    // TODO: send rental/loan request to owner
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          isForRent
                              ? 'Huurverzoek verzonden!'
                              : 'Leenverzoek verzonden!',
                        ),
                        backgroundColor: _primaryGreen,
                      ),
                    );
                  },
                  icon: Icon(
                    isForRent
                        ? Icons.payments_outlined
                        : Icons.handshake_outlined,
                    color: Colors.white,
                  ),
                  label: Text(
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
