import 'dart:convert';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

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
  late final TextEditingController _cityController;

  bool _isUploading = false;
  String? _photoUrl;
  String? _city;
  String? _name;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController();
    _cityController = TextEditingController();
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
        _city = data['city'];
        _name =
            data['name'] ??
            data['displayName'] ??
            _auth.currentUser?.displayName;
      });
      _nameController.text = _name ?? '';
      _cityController.text = _city ?? '';
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
      body: Column(
        children: [
          _buildHeader(),
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                children: [
                  const SizedBox(height: 20),
                  ElevatedButton(
                    onPressed: () => _signOut(context),
                    child: const Text('Uitloggen'),
                  ),
                ],
              ),
            ),
          ),
        ],
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
                                  _name?.substring(0, 1).toUpperCase() ?? '?',
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
                                _city ?? 'Locatie onbekend',
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
                _buildStat('5', 'Beoordeling'),
                _buildStat('23', 'Verhuren'),
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
    _cityController.text = _city ?? '';

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
              controller: _cityController,
              decoration: const InputDecoration(
                labelText: 'Stad',
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
                  final newCity = _cityController.text.trim();

                  await _firestore.collection('flutterUsers').doc(uid).set({
                    'name': newName,
                    'city': newCity,
                  }, SetOptions(merge: true));

                  setState(() {
                    _name = newName;
                    _city = newCity;
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
    _cityController.dispose();
    super.dispose();
  }
}
