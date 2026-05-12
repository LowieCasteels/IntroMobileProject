import 'dart:convert';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_project/screens/request_helpers.dart';

import 'web/file_upload_stub.dart'
    if (dart.library.io) 'mobile/file_upload_io.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _auth = FirebaseAuth.instance;
  final _storage = FirebaseStorage.instance;
  final _firestore = FirebaseFirestore.instance;
  final _picker = ImagePicker();

  late final TextEditingController _nameController;
  late final TextEditingController _addressController;

  bool _isUploading = false;
  String? _photoUrl;
  String? _address;
  String? _name;
  double _averageRating = 0.0;
  int _ratingCount = 0;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController();
    _addressController = TextEditingController();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) return;

    final doc = await _firestore.collection('flutterUsers').doc(uid).get();
    if (doc.exists) {
      final data = doc.data()!;
      if (data['photoBase64'] != null) {
        setState(() => _photoUrl = 'base64:${data['photoBase64']}');
      } else if (data['photoUrl'] != null) {
        setState(() => _photoUrl = data['photoUrl']);
      }
      setState(() {
        _address = data['address'] ?? data['city'];
        _name =
            data['name'] ??
            data['displayName'] ??
            _auth.currentUser?.displayName;
        final totalRating = (data['totalRating'] as num?)?.toDouble() ?? 0.0;
        final ratingCount = (data['ratingCount'] as num?)?.toInt() ?? 0;
        _ratingCount = ratingCount;
        if (ratingCount > 0) {
          _averageRating = totalRating / ratingCount;
        }
      });
      _nameController.text = _name ?? '';
      _addressController.text = _address ?? '';
    }
  }

  Future<void> _pickAndUploadPhoto() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined),
              title: const Text('Foto nemen'),
              onTap: () => Navigator.pop(context, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Kies uit galerij'),
              onTap: () => Navigator.pop(context, ImageSource.gallery),
            ),
            if (_photoUrl != null)
              ListTile(
                leading: const Icon(Icons.delete_outline, color: Colors.red),
                title: const Text(
                  'Foto verwijderen',
                  style: TextStyle(color: Colors.red),
                ),
                onTap: () => Navigator.pop(context, null),
              ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );

    if (source == null && _photoUrl != null) {
      await _removePhoto();
      return;
    }
    if (source == null) return;

    final picked = await _picker.pickImage(
      source: source,
      maxWidth: 512,
      maxHeight: 512,
      imageQuality: 85,
    );
    if (picked == null) return;

    await _uploadPhoto(picked);
  }

  Future<void> _uploadPhoto(XFile picked) async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) return;

    setState(() => _isUploading = true);
    try {
      final url = await uploadPickedFile(picked, uid, _storage);
      await _firestore.collection('flutterUsers').doc(uid).set({
        'photoUrl': url,
      }, SetOptions(merge: true));
      setState(() => _photoUrl = url);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Upload mislukt: ${e.toString()}')),
        );
      }
    } finally {
      if (mounted) setState(() => _isUploading = false);
    }
  }

  Future<void> _removePhoto() async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) return;

    setState(() => _isUploading = true);
    try {
      await _firestore.collection('flutterUsers').doc(uid).update({
        'photoBase64': FieldValue.delete(),
        'photoUrl': FieldValue.delete(),
      });
      setState(() => _photoUrl = null);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _isUploading = false);
    }
  }

  Future<void> _signOut(BuildContext context) async {
    try {
      await _auth.signOut();
      if (context.mounted) context.go('/login');
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Fout bij het uitloggen: ${e.toString()}')),
        );
      }
    }
  }

  ImageProvider? get _profileImage {
    if (_photoUrl == null) return null;
    if (_photoUrl!.startsWith('base64:')) {
      return MemoryImage(base64Decode(_photoUrl!.substring(7)));
    }
    return NetworkImage(_photoUrl!);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: DefaultTabController(
        length: 2,
        child: Column(
          children: [
            _buildHeader(),
            Container(
              color: Colors.white,
              child: const TabBar(
                labelColor: Color(0xFF1F8A6A),
                unselectedLabelColor: Color(0xFF8A8A8A),
                indicatorColor: Color(0xFF1F8A6A),
                indicatorWeight: 3,
                tabs: [
                  Tab(text: 'Mijn items in gebruik'),
                  Tab(text: 'Mijn reservaties'),
                ],
              ),
            ),
            Expanded(
              child: const TabBarView(
                children: [_MyItemsInUseTab(), _MyReservationsTab()],
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(bottom: 20),
              child: ElevatedButton(
                onPressed: () => _signOut(context),
                child: const Text('Uitloggen'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      color: const Color(0xFF1A1A2E),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 52, 20, 16),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    IconButton(
                      icon: const Icon(
                        Icons.edit_outlined,
                        color: Color(0xFFB5D4F4),
                        size: 20,
                      ),
                      onPressed: _editProfile,
                    ),
                  ],
                ),
                // Avatar + name + location row
                Row(
                  children: [
                    Stack(
                      children: [
                        CircleAvatar(
                          radius: 32,
                          backgroundColor: const Color(0xFFB5D4F4),
                          backgroundImage: _profileImage,
                          child: _isUploading
                              ? const CircularProgressIndicator(
                                  color: Colors.white,
                                )
                              : _photoUrl == null
                              ? Text(
                                  _name != null && _name!.isNotEmpty
                                      ? _name![0].toUpperCase()
                                      : '?',
                                  style: const TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.w500,
                                    color: Color(0xFF042C53),
                                  ),
                                )
                              : null,
                        ),
                        Positioned(
                          bottom: 0,
                          right: 0,
                          child: GestureDetector(
                            onTap: _isUploading ? null : _pickAndUploadPhoto,
                            child: Container(
                              padding: const EdgeInsets.all(4),
                              decoration: BoxDecoration(
                                color: const Color(0xFF27500A),
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: Colors.white,
                                  width: 1.5,
                                ),
                              ),
                              child: const Icon(
                                Icons.camera_alt,
                                size: 10,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(width: 14),

                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _name ?? 'Naam onbekend',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 17,
                              fontWeight: FontWeight.w500,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 3),
                          Row(
                            children: [
                              const Icon(
                                Icons.location_on_outlined,
                                size: 13,
                                color: Color(0xFF85B7EB),
                              ),
                              const SizedBox(width: 3),
                              Text(
                                _address ?? 'Locatie onbekend',
                                style: const TextStyle(
                                  color: Color(0xFF85B7EB),
                                  fontSize: 12,
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

          Container(
            padding: const EdgeInsets.symmetric(vertical: 10),
            color: const Color(0xFF1F8A6A),
            child: Row(
              children: [
                _buildStat(
                  _ratingCount > 0 ? _averageRating.toStringAsFixed(1) : '-',
                  'Beoordeling (${_ratingCount.toString()})',
                ),
                _buildStat('0', 'Verhuren'), // Placeholder
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStat(String value, String label, {bool isLast = false}) {
    return Expanded(
      child: Container(
        decoration: BoxDecoration(
          border: isLast
              ? null
              : const Border(
                  right: BorderSide(color: Color(0xFF185FA5), width: 0.5),
                ),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: const TextStyle(
                color: Color.fromARGB(255, 255, 255, 255),
                fontSize: 11,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _editProfile() async {
    // Sync current values before opening
    _nameController.text = _name ?? '';
    _addressController.text = _address ?? '';

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => Padding(
        padding: EdgeInsets.fromLTRB(
          20,
          20,
          20,
          MediaQuery.of(context).viewInsets.bottom + 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Profiel bewerken',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Naam',
                prefixIcon: Icon(Icons.person_outline),
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _addressController,
              decoration: const InputDecoration(
                labelText: 'Adres',
                prefixIcon: Icon(Icons.location_on_outlined),
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1F8A6A),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                onPressed: () async {
                  final uid = _auth.currentUser?.uid;
                  if (uid == null) return;

                  final newName = _nameController.text.trim();
                  final newAddress = _addressController.text.trim();

                  double? lat;
                  double? lng;

                  if (newAddress.isNotEmpty) {
                    String addressQuery = newAddress;
                    if (!addressQuery.toLowerCase().contains('belgi') &&
                        !addressQuery.toLowerCase().contains('nederland')) {
                      addressQuery += ', België';
                    }

                    try {
                      const apiKey = String.fromEnvironment(
                        'GOOGLE_MAPS_API_KEY',
                      );
                      if (apiKey.isNotEmpty) {
                        final url = Uri.parse(
                          'https://maps.googleapis.com/maps/api/geocode/json?address=${Uri.encodeComponent(addressQuery)}&key=$apiKey',
                        );
                        final response = await http.get(url);
                        final data = json.decode(response.body);

                        if (data['status'] == 'OK' &&
                            data['results'].isNotEmpty) {
                          final location =
                              data['results'][0]['geometry']['location'];
                          lat = location['lat'];
                          lng = location['lng'];
                        }
                      }
                    } catch (e) {
                      debugPrint("Geocoding fout: $e");
                    }
                  }

                  Map<String, dynamic> updateData = {
                    'name': newName,
                    'address': newAddress,
                    'city': newAddress, // Voor achterwaartse compatibiliteit
                    if (lat != null) 'lat': lat,
                    if (lng != null) 'lng': lng,
                  };

                  await _firestore
                      .collection('flutterUsers')
                      .doc(uid)
                      .set(updateData, SetOptions(merge: true));

                  setState(() {
                    _name = newName;
                    _address = newAddress;
                  });

                  if (context.mounted) Navigator.pop(context);
                },
                child: const Text('Opslaan'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _nameController.dispose();
    _addressController.dispose();
    super.dispose();
  }
}
// ── Tab 1: Mijn items die door anderen gebruikt worden ─────────────────────────

class _MyItemsInUseTab extends StatelessWidget {
  const _MyItemsInUseTab();

  @override
  Widget build(BuildContext context) {
    final uid = FirebaseAuth.instance.currentUser!.uid;

    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance
          .collection('requests')
          .where('ownerId', isEqualTo: uid)
          .where('status', isEqualTo: 'accepted')
          .snapshots(),
      builder: (context, snap) {
        if (snap.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        final docs = snap.data?.docs ?? [];

        if (docs.isEmpty) {
          return const _EmptyTab(
            icon: Icons.outbound_outlined,
            title: 'Nog geen items in gebruik',
            subtitle: 'Geaccepteerde reservaties van anderen verschijnen hier.',
          );
        }

        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: docs.length,
          separatorBuilder: (_, _) => const SizedBox(height: 10),
          itemBuilder: (context, i) {
            final requestDoc = docs[i];
            final requestId = requestDoc.id;
            return Column(
              children: [
                _RequestApplianceRow(
                  requestDoc: requestDoc,
                  badge: 'In gebruik',
                  badgeColor: const Color(0xFF2DBA8D),
                  subtitlePrefix: 'Gereserveerd door',
                ),
                Padding(
                  padding: const EdgeInsets.only(top: 8.0),
                  child: SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () =>
                          showReturnConfirmationDialog(context, requestId),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF2DBA8D),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: const Text('Markeer als geretourneerd'),
                    ),
                  ),
                ),
              ],
            );
          },
        );
      },
    );
  }
}

// ── Tab 2: Mijn reservaties bij anderen ─────────────────────────────────────────

class _MyReservationsTab extends StatelessWidget {
  const _MyReservationsTab();

  @override
  Widget build(BuildContext context) {
    final uid = FirebaseAuth.instance.currentUser!.uid;

    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance
          .collection('requests')
          .where('requesterId', isEqualTo: uid)
          .where('status', isEqualTo: 'accepted')
          .snapshots(),
      builder: (context, snap) {
        if (snap.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        final docs = snap.data?.docs ?? [];

        if (docs.isEmpty) {
          return const _EmptyTab(
            icon: Icons.handshake_outlined,
            title: 'Nog geen reservaties',
            subtitle:
                'Als een eigenaar je verzoek accepteert, verschijnt het item hier.',
          );
        }

        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: docs.length,
          separatorBuilder: (_, _) => const SizedBox(height: 10),
          itemBuilder: (context, i) {
            final requestDoc = docs[i];
            return _RequestApplianceRow(
              requestDoc: requestDoc,
              badge: 'Geaccepteerd',
              badgeColor: const Color(0xFF2DBA8D),
              subtitlePrefix: 'Eigenaar',
            );
          },
        );
      },
    );
  }
}

class _RequestApplianceRow extends StatelessWidget {
  final DocumentSnapshot requestDoc;
  final String badge;
  final Color badgeColor;
  final String subtitlePrefix;

  const _RequestApplianceRow({
    required this.requestDoc,
    required this.badge,
    required this.badgeColor,
    required this.subtitlePrefix,
  });

  @override
  Widget build(BuildContext context) {
    final requestData = requestDoc.data() as Map<String, dynamic>? ?? {};
    final applianceId = requestData['applianceId'] as String? ?? '';
    final currentUserId = FirebaseAuth.instance.currentUser?.uid;
    final ownerId = requestData['ownerId'] as String? ?? '';
    final requesterId = requestData['requesterId'] as String? ?? '';
    final otherUserId = ownerId == currentUserId ? requesterId : ownerId;

    return FutureBuilder<List<Map<String, dynamic>>>(
      future: _loadRowData(applianceId: applianceId, otherUserId: otherUserId),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const SizedBox(
            height: 90,
            child: Center(child: CircularProgressIndicator(strokeWidth: 2.0)),
          );
        }

        final rows = snapshot.data;
        final rowData = rows != null && rows.isNotEmpty
            ? rows[0]
            : <String, dynamic>{};
        final nameData = rows != null && rows.length > 1
            ? rows[1]
            : <String, dynamic>{};
        final startDate = requestData['startDate'] as Timestamp?;
        final endDate = requestData['endDate'] as Timestamp?;
        final name = nameData['name'] as String? ?? 'Onbekend';
        return _ApplianceRow(
          data: rowData,
          badge: badge,
          badgeColor: badgeColor,
          subtitle: '$subtitlePrefix: $name',
          startDate: startDate,
          endDate: endDate,
        );
      },
    );
  }

  Future<List<Map<String, dynamic>>> _loadRowData({
    required String applianceId,
    required String otherUserId,
  }) async {
    final applianceDoc = await FirebaseFirestore.instance
        .collection('appliances')
        .doc(applianceId)
        .get();
    final userDoc = await FirebaseFirestore.instance
        .collection('flutterUsers')
        .doc(otherUserId)
        .get();

    final applianceData = applianceDoc.data() ?? <String, dynamic>{};
    return [
      {
        'title': applianceData['title'] ?? 'Item',
        'base64Image': applianceData['base64Image'] ?? '',
        'address': applianceData['address'] ?? '',
        'transactionType': applianceData['transactionType'] ?? 'leen',
        'price': (applianceData['price'] ?? 0.0).toDouble(),
      },
      {'name': userDoc.data()?['name'] ?? userDoc.data()?['displayName'] ?? ''},
    ];
  }
}

// ── Gedeelde rij-widget ────────────────────────────────────────────────────────

class _ApplianceRow extends StatelessWidget {
  final Map<String, dynamic> data;
  final String badge;
  final Color badgeColor;
  final String subtitle;
  final Timestamp? startDate;
  final Timestamp? endDate;

  const _ApplianceRow({
    required this.data,
    required this.badge,
    required this.badgeColor,
    required this.subtitle,
    this.startDate,
    this.endDate,
  });

  @override
  Widget build(BuildContext context) {
    final title = data['title'] as String? ?? 'Item';
    final image = data['base64Image'] as String? ?? '';
    final transactionType = data['transactionType'] as String? ?? 'leen';
    final price = data['price'] as double? ?? 0.0;
    final address = data['address'] as String? ?? '';

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(13),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Row(
        children: [
          // Afbeelding
          ClipRRect(
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(16),
              bottomLeft: Radius.circular(16),
            ),
            child: image.isNotEmpty
                ? Image.memory(
                    base64Decode(image),
                    width: 90,
                    height: 90,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => _placeholder(),
                  )
                : _placeholder(),
          ),
          const SizedBox(width: 12),
          // Info
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF1A1A2E),
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF8A8A8A),
                    ),
                  ),
                  if (address.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        const Icon(
                          Icons.location_on_outlined,
                          size: 11,
                          color: Color(0xFF8A8A8A),
                        ),
                        const SizedBox(width: 2),
                        Expanded(
                          child: Text(
                            address,
                            style: const TextStyle(
                              fontSize: 11,
                              color: Color(0xFF8A8A8A),
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                  if (startDate != null && endDate != null) ...[
                    const SizedBox(height: 4),
                    if (transactionType == 'huur')
                      Text(
                        '€${price.toStringAsFixed(0)}/dag | ${startDate!.toDate().day}/${startDate!.toDate().month} - ${endDate!.toDate().day}/${endDate!.toDate().month}',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF2DBA8D),
                        ),
                      )
                    else
                      Text(
                        'Periode: ${startDate!.toDate().day}/${startDate!.toDate().month} - ${endDate!.toDate().day}/${endDate!.toDate().month}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF8A8A8A),
                        ),
                      ),
                  ],
                ],
              ),
            ),
          ),
          // Badge
          Container(
            margin: const EdgeInsets.only(right: 12),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: badgeColor.withAlpha(31),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              badge,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: badgeColor,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _placeholder() {
    return Container(
      width: 90,
      height: 90,
      color: const Color(0xFFEEEEEE),
      child: const Icon(Icons.devices_other, color: Color(0xFFCCCCCC)),
    );
  }
}

// ── Lege staat per tab ─────────────────────────────────────────────────────────

class _EmptyTab extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;

  const _EmptyTab({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 56, color: Colors.grey[300]),
            const SizedBox(height: 14),
            Text(
              title,
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w600,
                color: Colors.grey[500],
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 6),
            Text(
              subtitle,
              style: TextStyle(fontSize: 13, color: Colors.grey[400]),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
