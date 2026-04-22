import 'dart:convert'; // For base64Decode
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

// ── Data models ───────────────────────────────────────────────────────────────

class Appliance {
  final String id;
  final String ownerId;
  final String title;
  final String description;
  final String category;
  final double price;
  final String transactionType; // 'huur' or 'leen'
  final String base64Image;
  final bool isVisible;
  final Timestamp createdAt;

  Appliance({
    required this.id,
    required this.ownerId,
    required this.title,
    required this.description,
    required this.category,
    required this.price,
    required this.transactionType,
    required this.base64Image,
    required this.isVisible,
    required this.createdAt,
  });

  factory Appliance.fromFirestore(DocumentSnapshot doc) {
    Map data = doc.data() as Map<String, dynamic>;
    return Appliance(
      id: doc.id,
      ownerId: data['ownerId'] ?? '',
      title: data['title'] ?? 'Geen titel',
      description: data['description'] ?? 'Geen beschrijving',
      category: data['category'] ?? 'Overig',
      price: (data['price'] ?? 0.0).toDouble(),
      transactionType: data['transactionType'] ?? 'leen',
      base64Image: data['base64Image'] ?? '',
      isVisible: data['isVisible'] ?? false,
      createdAt: data['createdAt'] ?? Timestamp.now(),
    );
  }
}

// ── Placeholder data (replace with your real DB fetch) ───────────────────────
// Removed mock data

//HomeScreen

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  // Stream to fetch appliances from Firestore
  final Stream<List<Appliance>> _appliancesStream = FirebaseFirestore.instance
      .collection('appliances')
      .where('isVisible', isEqualTo: true) // Only show visible items
      .orderBy('createdAt', descending: true) // Show newest first
      .snapshots()
      .map(
        (snapshot) =>
            snapshot.docs.map((doc) => Appliance.fromFirestore(doc)).toList(),
      );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F7),
      body: CustomScrollView(slivers: [_buildAppBar(), _buildApplianceList()]),
    );
  }

  //App bar

  SliverAppBar _buildAppBar() {
    return SliverAppBar(
      expandedHeight: 110,
      floating: false,
      pinned: true,
      backgroundColor: const Color(0xFF1A1A2E),
      flexibleSpace: FlexibleSpaceBar(
        titlePadding: const EdgeInsets.fromLTRB(20, 0, 20, 14),
        title: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text(
                  'Peerby',
                  style: TextStyle(
                    color: Color(0xFF2DBA8D),
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 3,
                  ),
                ),
                Text(
                  'Koop · Verhuur · Leen',
                  style: TextStyle(
                    color: Colors.white54,
                    fontSize: 10,
                    letterSpacing: 1.5,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  //Listings
  Widget _buildApplianceList() {
    return StreamBuilder<List<Appliance>>(
      stream: _appliancesStream,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const SliverFillRemaining(
            child: Center(child: CircularProgressIndicator()),
          );
        }

        if (snapshot.hasError) {
          return SliverFillRemaining(
            child: Center(child: Text('Error: ${snapshot.error}')),
          );
        }

        final appliances = snapshot.data ?? [];

        if (appliances.isEmpty) {
          return SliverFillRemaining(
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.devices_other, // Changed icon to be more generic
                    size: 64,
                    color: Colors.grey[300],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Nog geen toestellen aangeboden',
                    style: TextStyle(
                      color: Colors.grey[500],
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Wees de eerste om er een toe te voegen!',
                    style: TextStyle(color: Colors.grey[400], fontSize: 14),
                  ),
                ],
              ),
            ),
          );
        }

        return SliverPadding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
          sliver: SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, index) => Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: _ApplianceCard(appliance: appliances[index]),
              ),
              childCount: appliances.length,
            ),
          ),
        );
      },
    );
  }
}

//Appliance card

class _ApplianceCard extends StatelessWidget {
  final Appliance appliance;
  const _ApplianceCard({required this.appliance});

  // Helper to fetch user details
  Future<DocumentSnapshot> _fetchOwnerDetails(String ownerId) {
    return FirebaseFirestore.instance
        .collection('flutterUsers')
        .doc(ownerId)
        .get();
  }

  @override
  Widget build(BuildContext context) {
    final isForRent = appliance.transactionType == 'huur';

    return GestureDetector(
      onTap: () {
        // TODO: navigate to detail page
      },
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image + badges
            Stack(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(20),
                  ),
                  child: appliance.base64Image.isNotEmpty
                      ? Image.memory(
                          base64Decode(appliance.base64Image),
                          height: 200,
                          width: double.infinity,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) =>
                              _buildImagePlaceholder(),
                        )
                      : _buildImagePlaceholder(),
                ),
                Positioned(
                  top: 12,
                  left: 12,
                  child: _Badge(
                    label: isForRent ? 'Te huur' : 'Te leen',
                    icon: isForRent ? Icons.payments : Icons.handshake,
                    color: isForRent
                        ? const Color(0xFF2ECC71)
                        : const Color(
                            0xFF3498DB,
                          ), // Different colors for rent/loan
                  ),
                ),
              ],
            ),
            // Details
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title + price
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          appliance.title,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF1A1A2E),
                            height: 1.3,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            isForRent ? '€${_fmt(appliance.price)}' : 'Gratis',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF1A1A2E),
                            ),
                          ),
                          if (isForRent)
                            const Text(
                              '/ dag',
                              style: TextStyle(
                                fontSize: 11,
                                color: Color(0xFF8A8A8A),
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),

                  const SizedBox(height: 12),
                  Text(
                    appliance.description,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 13,
                      color: Color(0xFF666666),
                    ),
                  ),
                  const SizedBox(height: 14),
                  const Divider(height: 1, color: Color(0xFFF0F0F0)),
                  const SizedBox(height: 12),

                  // Seller row
                  FutureBuilder<DocumentSnapshot>(
                    future: _fetchOwnerDetails(appliance.ownerId),
                    builder: (context, snapshot) {
                      if (snapshot.connectionState == ConnectionState.waiting) {
                        return const Row(
                          children: [
                            CircleAvatar(
                              radius: 18,
                              backgroundColor: Color(0xFFEEEEEE),
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                            SizedBox(width: 10),
                            Text('Laden gebruiker...'),
                          ],
                        );
                      }
                      if (snapshot.hasError ||
                          !snapshot.hasData ||
                          !snapshot.data!.exists) {
                        return const Row(
                          children: [
                            CircleAvatar(
                              radius: 18,
                              backgroundColor: Color(0xFFEEEEEE),
                              child: Icon(Icons.person, color: Colors.grey),
                            ),
                            SizedBox(width: 10),
                            Text('Onbekende gebruiker'),
                          ],
                        );
                      }
                      final userData =
                          snapshot.data!.data() as Map<String, dynamic>;
                      final ownerName = userData['name'] ?? 'Onbekend';
                      final ownerCity = userData['city'] ?? 'Onbekend';
                      // Assuming a default avatar or fetching from user data if available
                      final ownerAvatarUrl =
                          userData['avatarUrl'] ??
                          'https://i.pravatar.cc/150?img=60'; // Placeholder

                      return Row(
                        children: [
                          CircleAvatar(
                            radius: 18,
                            backgroundImage: NetworkImage(ownerAvatarUrl),
                            backgroundColor: const Color(0xFFEEEEEE),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  ownerName,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF1A1A2E),
                                  ),
                                ),
                                Row(
                                  children: [
                                    const Icon(
                                      Icons.location_on_outlined,
                                      size: 11,
                                      color: Color(0xFF8A8A8A),
                                    ),
                                    const SizedBox(width: 2),
                                    Text(
                                      ownerCity,
                                      style: const TextStyle(
                                        fontSize: 11,
                                        color: Color(0xFF8A8A8A),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildImagePlaceholder() {
    return Container(
      height: 200,
      color: const Color(0xFFEEEEEE),
      child: const Icon(
        Icons.camera_alt, // Generic icon for appliance
        size: 60,
        color: Color(0xFFCCCCCC),
      ),
    );
  }

  String _fmt(double price) {
    if (price >= 1000) {
      return '${(price / 1000).toStringAsFixed(price % 1000 == 0 ? 0 : 1)}k';
    }
    return price.toStringAsFixed(0);
  }
}

// ── Small reusable widgets ─────────────────────────────────────────────────────

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
          Icon(icon, size: 12, color: Colors.white),
          const SizedBox(width: 4),
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.8,
            ),
          ),
        ],
      ),
    );
  }
}

class _Spec extends StatelessWidget {
  final IconData icon;
  final String label;
  const _Spec(this.icon, this.label);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        color: const Color(0xFFF5F5F7),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: const Color(0xFF5A5A7A)),
          const SizedBox(width: 4),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              color: Color(0xFF5A5A7A),
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
