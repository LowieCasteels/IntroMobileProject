import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_project/models/request.dart';

import '../services/notification_service.dart';

const Color _primaryGreen = Color(0xFF2DBA8D);

Future<void> markAsReturned(BuildContext context, String requestId) async {
  try {
    await FirebaseFirestore.instance
        .collection('requests')
        .doc(requestId)
        .update({'status': 'returned'});

    await NotificationService().cancelNotificationsForRequest(requestId);

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

void showReviewDialog({
  required BuildContext context,
  required Request request,
  required String currentUserId,
}) {
  final isOwner = currentUserId == request.ownerId;
  final userIdToReview = isOwner ? request.requesterId : request.ownerId;

  showDialog(
    context: context,
    builder: (ctx) => _ReviewDialog(
      requestId: request.id,
      userIdToReview: userIdToReview,
      reviewedByUserId: currentUserId,
      onReviewSubmitted: () {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Bedankt voor je beoordeling!'),
            backgroundColor: _primaryGreen,
          ),
        );
      },
    ),
  );
}

class _ReviewDialog extends StatefulWidget {
  final String requestId;
  final String userIdToReview;
  final String reviewedByUserId;
  final Function onReviewSubmitted;

  const _ReviewDialog({
    required this.requestId,
    required this.userIdToReview,
    required this.reviewedByUserId,
    required this.onReviewSubmitted,
  });

  @override
  State<_ReviewDialog> createState() => _ReviewDialogState();
}

class _ReviewDialogState extends State<_ReviewDialog> {
  double _rating = 1.0;
  final _reviewController = TextEditingController();
  bool _isSubmitting = false;

  Future<void> _submitReview() async {
    if (_isSubmitting) return;
    setState(() => _isSubmitting = true);

    final userToReviewRef = FirebaseFirestore.instance
        .collection('flutterUsers')
        .doc(widget.userIdToReview);
    final requestRef = FirebaseFirestore.instance
        .collection('requests')
        .doc(widget.requestId);

    try {
      final requestSnapshot = await requestRef.get();
      final requestData = requestSnapshot.data();
      if (requestData == null) throw Exception('Aanvraag niet gevonden');

      final isOwnerReviewing =
          requestData['ownerId'] == widget.reviewedByUserId;

      await FirebaseFirestore.instance.runTransaction((transaction) async {
        final userSnapshot = await transaction.get(userToReviewRef);

        if (!userSnapshot.exists) throw Exception("Gebruiker niet gevonden!");

        final oldTotalRating =
            (userSnapshot.data()?['totalRating'] as num? ?? 0).toDouble();
        final oldRatingCount =
            (userSnapshot.data()?['ratingCount'] as num? ?? 0).toInt();

        transaction.update(userToReviewRef, {
          'totalRating': oldTotalRating + _rating,
          'ratingCount': oldRatingCount + 1,
        });

        if (isOwnerReviewing) {
          transaction.update(requestRef, {
            'requesterRating': _rating,
            'requesterReview': _reviewController.text.trim(),
          });
        } else {
          transaction.update(requestRef, {
            'ownerRating': _rating,
            'ownerReview': _reviewController.text.trim(),
          });
        }
      });

      if (mounted) {
        Navigator.of(context).pop();
        widget.onReviewSubmitted();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSubmitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Fout bij indienen: ${e.toString()}')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Beoordeling geven'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(5, (index) {
              return IconButton(
                onPressed: () => setState(() => _rating = index + 1.0),
                icon: Icon(
                  index < _rating ? Icons.star : Icons.star_border,
                  color: Colors.amber,
                  size: 32,
                ),
              );
            }),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _reviewController,
            decoration: const InputDecoration(
              labelText: 'Review (optioneel)',
              border: OutlineInputBorder(),
            ),
            maxLines: 3,
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Annuleren'),
        ),
        ElevatedButton(
          onPressed: _isSubmitting ? null : _submitReview,
          child: _isSubmitting
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Indienen'),
        ),
      ],
    );
  }
}

void showPaymentDialog({
  required BuildContext context,
  required String requestId,
}) {
  showDialog(
    context: context,
    builder: (ctx) => _PaymentDialog(requestId: requestId),
  );
}

class _PaymentDialog extends StatefulWidget {
  final String requestId;

  const _PaymentDialog({required this.requestId});

  @override
  State<_PaymentDialog> createState() => _PaymentDialogState();
}

class _PaymentDialogState extends State<_PaymentDialog> {
  bool _isProcessing = false;
  bool _paymentInitiated = false;

  Future<void> _processPayment() async {
    setState(() => _isProcessing = true);

    // Simulate payment processing
    await Future.delayed(const Duration(milliseconds: 500));

    try {
      await FirebaseFirestore.instance
          .collection('requests')
          .doc(widget.requestId)
          .update({'paymentStatus': 'paid'});

      if (mounted) {
        setState(() {
          _isProcessing = false;
          _paymentInitiated = true;
        });

        // Auto close dialog after 1 second
        await Future.delayed(const Duration(seconds: 1));
        if (mounted) {
          Navigator.of(context).pop();
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isProcessing = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Fout bij betaling: ${e.toString()}')),
        );
      }
    }
  }

  Future<void> _cancelPayment() async {
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    if (_paymentInitiated) {
      return AlertDialog(
        title: const Text('Betaling voltooid'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.check_circle, color: Color(0xFF2DBA8D), size: 64),
            SizedBox(height: 16),
            Text(
              'Betaald',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Color(0xFF2DBA8D),
              ),
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF2DBA8D),
            ),
            child: const Text('OK', style: TextStyle(color: Colors.white)),
          ),
        ],
      );
    }

    return AlertDialog(
      title: const Text('Betaaling'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('Doorgaan met betaling?'),
          const SizedBox(height: 16),
          if (_isProcessing)
            const SizedBox(
              width: 40,
              height: 40,
              child: CircularProgressIndicator(),
            ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: _isProcessing ? null : _cancelPayment,
          child: const Text('Annuleren', style: TextStyle(color: Colors.red)),
        ),
        ElevatedButton(
          onPressed: _isProcessing ? null : _processPayment,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF2DBA8D),
          ),
          child: Text(
            _isProcessing ? 'Verwerken...' : 'Doorgaan',
            style: const TextStyle(color: Colors.white),
          ),
        ),
      ],
    );
  }
}
