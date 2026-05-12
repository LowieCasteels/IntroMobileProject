import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

const Color _primaryGreen = Color(0xFF2DBA8D);

Future<void> markAsReturned(BuildContext context, String requestId) async {
  try {
    await FirebaseFirestore.instance
        .collection('requests')
        .doc(requestId)
        .update({'status': 'returned'});
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Item als geretourneerd gemarkeerd'),
        backgroundColor: _primaryGreen,
      ),
    );
  } catch (e) {
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Fout bij het markeren als geretourneerd')),
    );
  }
}

void showReturnConfirmationDialog(BuildContext context, String requestId) {
  showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      title: const Text('Retour bevestigen'),
      content: const Text(
        'Weet je zeker dat je dit item als geretourneerd wilt markeren?',
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(ctx).pop(),
          child: const Text('Annuleren'),
        ),
        TextButton(
          onPressed: () {
            Navigator.of(ctx).pop();
            markAsReturned(context, requestId);
          },
          child: const Text('Bevestigen'),
        ),
      ],
    ),
  );
}
