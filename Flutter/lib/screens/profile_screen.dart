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

  bool _isUploading = false;
  String? _photoUrl;
  String? _city;

  @override
  void initState() {
    super.initState();
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
      setState(() => _city = data['city']);
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
    final user = _auth.currentUser;

    return Container(
      color: const Color(0xFF1A1A2E),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 52, 20, 16),
            child: Column(
              children: [
                const SizedBox(height: 15),

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
                                  user?.displayName
                                          ?.substring(0, 1)
                                          .toUpperCase() ??
                                      '?',
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
                            user?.displayName ?? 'Naam onbekend',
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
            color: const Color(0xFF2DBA8D),
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
}
