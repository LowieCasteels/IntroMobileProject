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
  final String address; // Added address field
  final double? lat;
  final double? lng;
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
    required this.address, // Added address to constructor
    this.lat,
    this.lng,
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
      address:
          data['address'] ??
          data['city'] ??
          'Onbekend', // Retrieve address from Firestore
      lat: data['lat'],
      lng: data['lng'],
      createdAt: data['createdAt'] ?? Timestamp.now(),
    );
  }
}

//HomeScreen

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String? _selectedCategory;
  final TextEditingController _locationController = TextEditingController();
  String? _locationFilter;

  final List<String> _categories = [
    'Beeld & Geluid',
    'Gaming & Speelgoed',
    'Dieren & Toebehoren',
    'Verzorging, Welzijn & Baby',
    'Kleding & Kostuums',
    'Klussen & Gereedschap',
    'Koken & Tafelen',
    'Huishouden & Schoonmaak',
    'Vakantie, Sport & Vrije tijd',
    'Vervoer & Transport',
    'Computers, Telefoons & Toebehoren',
    'Overige spullen',
    'Party, Event & Tuinfeest',
  ];

  late Stream<QuerySnapshot> _firestoreStream;

  @override
  void initState() {
    super.initState();
    // Initialiseer de stream slechts één keer
    _firestoreStream = FirebaseFirestore.instance
        .collection('appliances')
        .orderBy('createdAt', descending: true)
        .snapshots();
    _locationController.addListener(_onLocationChanged);
  }

  @override
  void dispose() {
    _locationController.removeListener(_onLocationChanged);
    _locationController.dispose();
    super.dispose();
  }

  void _onLocationChanged() {
    // Update the location filter when the text changes
    // Debouncing could be added here for performance if needed
    setState(() {
      _locationFilter = _locationController.text.trim().toLowerCase();
      if (_locationFilter!.isEmpty) {
        _locationFilter = null;
      }
    });
  }

  void _showCategoryFilter(BuildContext context) {
    // Add 'Alles' to the list for the modal
    final categoriesWithAll = ['Alles', ..._categories];
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (BuildContext context) {
        return Padding(
          padding: const EdgeInsets.only(top: 8.0),
          child: ListView.builder(
            itemCount: categoriesWithAll.length,
            itemBuilder: (context, index) {
              final category = categoriesWithAll[index];
              final isSelected =
                  (_selectedCategory == null && category == 'Alles') ||
                  _selectedCategory == category;
              return ListTile(
                title: Text(
                  category,
                  style: TextStyle(
                    fontWeight: isSelected
                        ? FontWeight.bold
                        : FontWeight.normal,
                    color: isSelected
                        ? const Color(0xFF2DBA8D)
                        : Colors.black87,
                  ),
                ),
                trailing: isSelected
                    ? const Icon(Icons.check, color: Color(0xFF2DBA8D))
                    : null,
                onTap: () {
                  setState(() {
                    _selectedCategory = category == 'Alles' ? null : category;
                  });
                  Navigator.pop(context); // Close the bottom sheet
                },
              );
            },
          ),
        );
      },
    );
  }

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
      expandedHeight: 220, // Adjusted height
      floating: true, // Make it float for better UX
      pinned: true,
      backgroundColor: const Color(0xFF1A1A2E),
      flexibleSpace: FlexibleSpaceBar(
        centerTitle: false,
        titlePadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        background: Column(
          mainAxisAlignment: MainAxisAlignment.end,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 20),
              child: Text(
                'Appelby',
                style: TextStyle(
                  color: Color(0xFF2DBA8D),
                  fontSize: 28,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 3,
                ),
              ),
            ),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 20),
              child: Text(
                'Koop · Verhuur · Leen',
                style: TextStyle(
                  color: Colors.white54,
                  fontSize: 12,
                  letterSpacing: 1.5,
                ),
              ),
            ),
            const SizedBox(height: 16),
            // Location Search Input
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Container(
                height: 40,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: TextField(
                  controller: _locationController,
                  decoration: InputDecoration(
                    hintText: 'Zoek op toestel of locatie...',
                    hintStyle: const TextStyle(color: Colors.grey),
                    prefixIcon: const Icon(Icons.search, color: Colors.grey),
                    suffixIcon: _locationController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, color: Colors.grey),
                            onPressed: () {
                              _locationController.clear();
                            },
                          )
                        : null,
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 8,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 10),
            // Category Filter Chips
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: InkWell(
                onTap: () => _showCategoryFilter(context),
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  height: 45,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    color: Colors.grey[200],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        _selectedCategory ?? 'Alle categorieën',
                        style: const TextStyle(
                          color: Colors.black87,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const Icon(Icons.arrow_drop_down, color: Colors.black54),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(
              height: 56,
            ), // Add padding at the bottom to not overlap with collapsed title
          ],
        ),
      ),
    );
  }

  //Listings
  Widget _buildApplianceList() {
    return StreamBuilder<QuerySnapshot>(
      stream: _firestoreStream,
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

        // Haal alle documenten op en zet ze om naar Appliance objecten
        List<Appliance> appliances =
            snapshot.data?.docs
                .map((doc) => Appliance.fromFirestore(doc))
                .toList() ??
            [];

        // 1. Zichtbaarheid filter
        appliances = appliances.where((a) => a.isVisible).toList();

        // 2. Categorie filter
        if (_selectedCategory != null && _selectedCategory != 'Alles') {
          appliances = appliances
              .where((a) => a.category == _selectedCategory)
              .toList();
        }

        // 3. Zoek filter (Zoekt nu op zowel locatie als titel)
        if (_locationFilter != null && _locationFilter!.isNotEmpty) {
          appliances = appliances.where((a) {
            final query = _locationFilter!;
            return a.address.toLowerCase().contains(query) ||
                a.title.toLowerCase().contains(query);
          }).toList();
        }

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
                          errorBuilder: (_, _, _) => _buildImagePlaceholder(),
                        )
                      : _buildImagePlaceholder(),
                ),
                Positioned(
                  top: 12,
                  left: 12,
                  child: _Badge(
                    label: isForRent ? 'Te huur' : 'Te leen',
                    icon: isForRent
                        ? Icons.payments
                        : Icons.handshake, // Changed icon for 'Te leen'
                    color: const Color(0xFF2ECC71),
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
                      ImageProvider? ownerPhoto;
                      if (userData['photoBase64'] != null) {
                        ownerPhoto = MemoryImage(
                          base64Decode(userData['photoBase64']),
                        );
                      } else if (userData['photoUrl'] != null) {
                        ownerPhoto = NetworkImage(userData['photoUrl']);
                      }
                      return Row(
                        children: [
                          CircleAvatar(
                            radius: 18,
                            backgroundColor: const Color(0xFFEEEEEE),
                            backgroundImage: ownerPhoto,
                            child: ownerPhoto == null
                                ? Text(
                                    ownerName.isNotEmpty
                                        ? ownerName[0].toUpperCase()
                                        : '?',
                                    style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: Color(0xFF1A1A2E),
                                    ),
                                  )
                                : null,
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
                                      // Use appliance.address for location display
                                      appliance.address,
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
