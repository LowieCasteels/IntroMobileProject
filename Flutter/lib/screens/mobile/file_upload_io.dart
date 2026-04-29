import 'dart:io';
import 'package:image_picker/image_picker.dart';

Future<String?> uploadPickedFile(
  XFile picked,
  String uid,
  dynamic storage,
) async {
  final ref = storage.ref().child('profile_photos/$uid.jpg');
  await ref.putFile(File(picked.path));
  return await ref.getDownloadURL();
}
