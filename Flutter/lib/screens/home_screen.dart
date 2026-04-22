import 'dart:ui_web';

import 'package:flutter/material.dart';

// ── Data models ───────────────────────────────────────────────────────────────

enum ListingType { sale, rent }

class UserProfile {
  final String name;
  final String avatarUrl;
  const UserProfile({required this.name, required this.avatarUrl});
}

class ItemListing {
  final String id;
  final String title;
  final String imageUrl;
  final double price;
  final ListingType type;
  final UserProfile seller;
  final String location;

  const ItemListing({
    required this.id,
    required this.title,
    required this.imageUrl,
    required this.price,
    required this.type,
    required this.seller,
    required this.location,
  });
}

// ── Placeholder data (replace with your real DB fetch) ───────────────────────

final List<ItemListing> _mockListings = [
  ItemListing(
    id: '1',
    title: 'Tesla',
    imageUrl: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800',
    price: 2000,
    type: ListingType.sale,
    seller: const UserProfile(
      name: 'Alex Martens',
      avatarUrl: 'https://i.pravatar.cc/150?img=11',
    ),
    location: 'Antwerp, BE',
  ),
  ItemListing(
    id: '2',
    title: "Blender voor lekkere smoothies",
    imageUrl:
        'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=800',
    price: 20,
    type: ListingType.rent,
    seller: const UserProfile(
      name: "Behlul",
      avatarUrl: 'https://i.pravatar.cc/150?img=11',
    ),
    location: 'Antwerp, BE',
  ),
];

//HomeScreen

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  // TODO: replace _mockListings with your database stream/future
  final List<ItemListing> _listings = _mockListings;
  ListingType? _activeFilter;

  List<ItemListing> get _filtered => _activeFilter == null
      ? _listings
      : _listings.where((l) => l.type == _activeFilter).toList();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F7),
      body: CustomScrollView(slivers: [_buildAppBar(), _buildListings()]),
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
                  'Appelby',
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

  Widget _buildListings() {
    final items = _filtered;

    if (items.isEmpty) {
      return SliverFillRemaining(
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.directions_car_outlined,
                size: 64,
                color: Colors.grey[300],
              ),
              const SizedBox(height: 16),
              Text(
                'No listings yet',
                style: TextStyle(
                  color: Colors.grey[500],
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Be the first to add one!',
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
            child: _CarCard(listing: items[index]),
          ),
          childCount: items.length,
        ),
      ),
    );
  }
}

//Car card

class _CarCard extends StatelessWidget {
  final ItemListing listing;
  const _CarCard({required this.listing});

  @override
  Widget build(BuildContext context) {
    final isRent = listing.type == ListingType.rent;

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
              color: Colors.black.withOpacity(0.07),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image + badges
            ClipRRect(
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(20),
              ),
              child: Stack(
                children: [
                  Image.network(
                    listing.imageUrl,
                    height: 200,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      height: 200,
                      color: const Color(0xFFEEEEEE),
                      child: const Icon(
                        Icons.directions_car,
                        size: 60,
                        color: Color(0xFFCCCCCC),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 12,
                    left: 12,
                    child: _Badge(
                      label: isRent ? 'Te Koop' : 'Te Huur',
                      icon: isRent ? Icons.sell : Icons.real_estate_agent,
                      color: const Color(0xFF2ECC71),
                    ),
                  ),
                ],
              ),
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
                          listing.title,
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
                            '€${_fmt(listing.price)}',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF1A1A2E),
                            ),
                          ),
                          if (isRent)
                            const Text(
                              '/ day',
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

                  const SizedBox(height: 14),
                  const Divider(height: 1, color: Color(0xFFF0F0F0)),
                  const SizedBox(height: 12),

                  // Seller row
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 18,
                        backgroundImage: NetworkImage(listing.seller.avatarUrl),
                        backgroundColor: const Color(0xFFEEEEEE),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              listing.seller.name,
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
                                  listing.location,
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
                  ),
                ],
              ),
            ),
          ],
        ),
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
