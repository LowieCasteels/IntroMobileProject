import 'package:image_picker/image_picker.dart';

Future<String?> uploadPickedFile(
  XFile picked,
  String uid,
  dynamic storage,
) async {
  final bytes = await picked.readAsBytes();
  final ref = storage.ref().child('profile_photos/$uid.jpg');
  await ref.putData(bytes);
  return await ref.getDownloadURL();
}
