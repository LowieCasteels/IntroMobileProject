import 'package:image_picker/image_picker.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'dart:convert';

Future<String?> uploadPickedFile(
  XFile picked,
  String uid,
  FirebaseStorage storage,
) async {
  final bytes = await picked.readAsBytes();
  final base64Image = base64Encode(bytes);

  await FirebaseFirestore.instance.collection('users').doc(uid).set({
    'photoBase64': base64Image,
  }, SetOptions(merge: true));

  return 'base64:$base64Image';
}
